/**
 * Pagos de primera clase — núcleo del rediseño post-RSV-160.
 *
 * Dos reglas y nada más:
 *   1. TODO intento de pago que reporte Mercado Pago se registra en `payments`
 *      ANTES de decidir cualquier cosa. El dinero siempre tiene casa.
 *   2. El estado de la reserva se DERIVA de los pagos: pago aprobado ⇒ reserva
 *      confirmada (rescatando desde pending_payment o cancelled). Nunca se
 *      degrada una reserva confirmada.
 *
 * El webhook y el cron ya no "deciden": registran hechos y llaman a
 * deriveReservationState(). La vista `payments_unlinked` (pagos aprobados sin
 * reserva confirmada) debe estar SIEMPRE vacía — es el invariante del sistema.
 */

import { supabaseGet, supabasePatch, logWebhookEvent, logAuditEvent } from '@/app/lib/supabase';
import { createCalendarEvent, findAndDeleteCalendarEventsByFolio, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendPaymentConfirmedEmails, sendManualPaymentInternalEmail, type FullReservation } from '@/app/lib/emails';
import { ensureCheckinCode } from '@/app/lib/wallet/checkin-code';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Forma del pago tal como lo entrega la API de MP (campos que usamos). */
export interface MpPayment {
  id: string | number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  payment_method_id?: string;
  external_reference?: string;
  payer?: { email?: string };
  card?: { cardholder?: { name?: string } };
}

export function reservationIdFromReference(p: MpPayment): { reservationId?: string; folio?: string } {
  const [reservationId, folio] = (p.external_reference ?? '').split('|');
  return { reservationId: reservationId || undefined, folio: folio || undefined };
}

/**
 * Registra (upsert por provider+payment_id) el intento de pago. Los reintentos
 * de MP y los cambios de estado (pending → approved) actualizan la misma fila.
 * Nunca lanza: si el registro falla se loguea, pero el flujo continúa.
 */
export async function recordPayment(p: MpPayment): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const { reservationId, folio } = reservationIdFromReference(p);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/payments?on_conflict=provider,payment_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          provider: 'mercadopago',
          payment_id: String(p.id),
          reservation_id: reservationId ?? null,
          folio: folio ?? null,
          status: p.status,
          status_detail: p.status_detail ?? null,
          amount_mxn: p.transaction_amount ?? null,
          payer_email: p.payer?.email ?? null,
          payer_name: p.card?.cardholder?.name ?? null,
          method: p.payment_method_id ?? null,
          raw: p,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!res.ok) {
      console.error('[PAYMENTS] recordPayment error', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[PAYMENTS] recordPayment failed', err);
    return false;
  }
}

export type DeriveResult =
  | 'confirmed'          // había pago aprobado y la reserva se confirmó ahora
  | 'already_confirmed'  // la reserva ya estaba confirmada (o con check-in)
  | 'no_approved_payment'// no hay pago aprobado: no se toca nada
  | 'error';

/**
 * Aplica la regla única: si la reserva tiene un pago aprobado y está en
 * pending_payment o cancelled, se confirma (con calendario + correo + pase).
 * Idempotente: el PATCH condicional garantiza un solo ganador aunque webhook
 * y cron deriven a la vez (los side effects solo corren para quien ganó).
 */
export async function deriveReservationState(reservationId: string): Promise<DeriveResult> {
  try {
    const approved = await supabaseGet<{ payment_id: string }>('payments', {
      reservation_id: `eq.${reservationId}`,
      status: 'eq.approved',
      select: 'payment_id',
      order: 'updated_at.desc',
      limit: '1',
    });
    if (!approved.length) return 'no_approved_payment';
    const paymentId = approved[0].payment_id;

    const patched = await supabasePatch('reservations', reservationId, {
      status: 'confirmed',
      payment_id: paymentId,
      paid_at: new Date().toISOString(),
    }, { status: 'in.(pending_payment,cancelled)' });

    if (!patched) return 'already_confirmed';

    await runConfirmationSideEffects(reservationId, paymentId);
    return 'confirmed';
  } catch (err) {
    console.error('[PAYMENTS] derive failed', reservationId, err);
    return 'error';
  }
}

/** Calendario + correo de confirmación (con pase Wallet/QR). Best-effort. */
async function runConfirmationSideEffects(reservationId: string, paymentId: string): Promise<void> {
  const rows = await supabaseGet<FullReservation>('reservations', {
    id: `eq.${reservationId}`,
    select: 'id,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,folio,status,payment_method,payment_id,paid_at',
  });
  if (!rows.length) return;
  const r = rows[0];

  const calPayload: CalendarPayload = {
    guest_name:  r.guest_name,
    guest_phone: r.guest_phone,
    guest_email: r.guest_email,
    room_type:   r.room_type,
    check_in:    r.check_in,
    check_out:   r.check_out,
    total_mxn:   r.total_mxn,
    adults:      r.adults,
    children:    r.children,
    rooms:       r.rooms,
    notes:       r.notes,
  };

  try {
    const checkinCode = await ensureCheckinCode(reservationId);
    // Quita eventos previos (pendiente/lista de espera) antes de crear el confirmado
    await findAndDeleteCalendarEventsByFolio(r.folio);
    await Promise.all([
      createCalendarEvent(calPayload, r.folio, '2'),
      sendPaymentConfirmedEmails({ ...r, payment_id: paymentId, checkin_code: checkinCode ?? undefined }),
    ]);
  } catch (err) {
    console.error('[PAYMENTS] side effects error (non-fatal):', err);
    logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: 'approved', reservation_id: reservationId, folio: r.folio, sig_valid: true, action: 'confirmed_email_failed', error_msg: String(err) });
    return;
  }

  logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: 'approved', reservation_id: reservationId, folio: r.folio, sig_valid: true, action: 'confirmed' });
  logAuditEvent({ event: 'payment.derived_confirmed', status: 'ok', reservation_id: reservationId, folio: r.folio, details: { payment_id: paymentId } });
}

/**
 * Pago manual (transferencia/efectivo) marcado desde el admin: lo registra en
 * `payments` (la regla "todo pago tiene casa" aplica también al dinero que no
 * pasa por MP) y avisa por correo interno. Best-effort: nunca lanza, para no
 * bloquear el botón del admin. Upsert por reserva → re-clicks no duplican.
 */
export async function registerManualPayment(reservationId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    const rows = await supabaseGet<FullReservation>('reservations', {
      id: `eq.${reservationId}`,
      select: 'id,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,folio,status,payment_method,payment_id,paid_at',
    });
    if (!rows.length) return;
    const r = rows[0];

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/payments?on_conflict=provider,payment_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          provider: 'manual',
          payment_id: `manual-${reservationId}`,
          reservation_id: reservationId,
          folio: r.folio,
          status: 'approved',
          amount_mxn: r.total_mxn,
          payer_email: r.guest_email,
          payer_name: r.guest_name,
          method: r.payment_method ?? 'cash',
          raw: { marked_via: 'admin_mark_paid' },
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!res.ok) {
      console.error('[PAYMENTS] registerManualPayment error', res.status, await res.text());
    }

    await sendManualPaymentInternalEmail(r);
    logAuditEvent({ event: 'payment.manual_marked_paid', status: 'ok', reservation_id: reservationId, folio: r.folio, details: { amount: r.total_mxn, method: r.payment_method ?? 'cash' } });
  } catch (err) {
    console.error('[PAYMENTS] registerManualPayment failed', reservationId, err);
  }
}

/** Último intento de pago registrado de una reserva (para la página del huésped). */
export async function lastPaymentFor(reservationId: string): Promise<{ status: string; status_detail: string | null } | null> {
  const rows = await supabaseGet<{ status: string; status_detail: string | null }>('payments', {
    reservation_id: `eq.${reservationId}`,
    select: 'status,status_detail',
    order: 'updated_at.desc',
    limit: '1',
  });
  return rows[0] ?? null;
}
