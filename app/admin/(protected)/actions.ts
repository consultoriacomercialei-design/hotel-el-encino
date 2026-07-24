'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet, supabasePatch, supabaseDelete, getNextFolio, supabasePost } from '@/app/lib/supabase';
import { createCalendarEvent, findAndDeleteCalendarEventsByFolio, type CalendarPayload } from '@/app/lib/google-calendar';
import {
  sendConfirmedEmails,
  sendPaymentConfirmedEmails,
  sendCancelledTimeoutEmail,
  sendCancelledByRequestEmail,
  sendCancelledRefundPendingEmail,
  sendCancelledMpIncompleteEmail,
  sendCheckoutEmail,
  sendWaitlistEmails,
  sendPendingPaymentEmails,
  type ReservationPayload, type FullReservation, type LineItem,
} from '@/app/lib/emails';
import { propagateDirectorioCancel } from '@/app/lib/directorio-cancel';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) {
    throw new Error('No autorizado');
  }
}

export async function registerCheckinAction(
  id: string,
  data: {
    id_type: string;
    id_number: string;
    nationality: string;
    date_of_birth?: string;
    checkin_at?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const patch: Record<string, unknown> = {
    id_type:        data.id_type,
    id_number:      data.id_number.trim().toUpperCase(),
    nationality:    data.nationality.trim(),
    id_verified:    true,
    id_verified_at: new Date().toISOString(),
    checkin_at:     data.checkin_at || new Date().toISOString(),
  };
  if (data.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(data.date_of_birth)) {
    patch.date_of_birth = data.date_of_birth;
  }
  try {
    await supabasePatch('reservations', id, patch);
    // Unificación: alimenta el mismo registro de clientes que el escáner, con el
    // correo/teléfono del titular (best-effort — no rompe el check-in si falla).
    try {
      const rows = await supabaseGet<{ folio: string; guest_name: string; guest_email: string | null; guest_phone: string | null }>(
        'reservations',
        { id: `eq.${id}`, select: 'folio,guest_name,guest_email,guest_phone', limit: '1' }
      );
      const res = rows[0];
      if (res) {
        await supabasePost('guest_checkins', {
          reservation_id: id,
          folio: res.folio,
          full_name: res.guest_name,
          email: res.guest_email || null,
          phone: res.guest_phone || null,
          nationality: data.nationality.trim() || null,
          date_of_birth: data.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(data.date_of_birth) ? data.date_of_birth : null,
          id_doc_type: data.id_type.toLowerCase(),
          id_doc_number: data.id_number.trim().toUpperCase() || null,
        });
      }
    } catch (e) {
      console.error('[registerCheckin] guest_checkins insert failed', e);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function reopenReservationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  try {
    await supabasePatch('reservations', id, { status: 'pending' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function createReservationAction(data: {
  guest_name: string; guest_email: string; guest_phone: string;
  room_type: string; check_in: string; check_out: string;
  nights: number; adults: number; children: number; rooms: number;
  total_mxn: number; notes: string; status: string; payment_method: string;
  notify?: boolean;
  // Identidad del huésped (opcional en creación, se completa en check-in)
  id_type?: string; id_number?: string; nationality?: string; date_of_birth?: string;
}) {
  await requireAuth();

  // Idempotency: if same email + check_in + check_out already exists in last 3 minutes,
  // return the existing folio instead of creating a duplicate.
  const windowStart = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  interface IdempotencyRow { id: string; folio: string; }
  const existing = await supabaseGet<IdempotencyRow>('reservations', {
    guest_email: `eq.${data.guest_email.toLowerCase().trim()}`,
    check_in:    `eq.${data.check_in}`,
    check_out:   `eq.${data.check_out}`,
    created_at:  `gte.${windowStart}`,
    source:      'eq.admin',
    select:      'id,folio',
    limit:       '1',
  }, true);
  if (existing.length > 0) {
    console.warn(`[ADMIN/CREATE] Deduplicación: ya existe ${existing[0].folio} para ${data.guest_email} ${data.check_in}→${data.check_out}`);
    return { success: true, folio: existing[0].folio, reservation_id: existing[0].id, deduplicated: true };
  }

  const folio = await getNextFolio();

  // Destructure 'notify' out — it's a UI flag, NOT a DB column
  const { notify, ...dbData } = data;

  // Filter out optional identity fields if empty — let DB defaults apply
  const cleanDbData = Object.fromEntries(
    Object.entries(dbData).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  const record = await supabasePost<{ id: string }>('reservations', {
    ...cleanDbData, folio, source: 'admin',
  });

  const reservationId = record?.id || `admin-${Date.now()}`;

  if (data.status === 'confirmed' && data.notify !== false) {
    const calPayload: CalendarPayload = {
      guest_name: data.guest_name, guest_phone: data.guest_phone,
      guest_email: data.guest_email, room_type: data.room_type,
      check_in: data.check_in, check_out: data.check_out,
      total_mxn: data.total_mxn, adults: data.adults,
      children: data.children, rooms: data.rooms, notes: data.notes,
    };
    const payload: ReservationPayload = {
      guest_name: data.guest_name, guest_email: data.guest_email,
      guest_phone: data.guest_phone, room_type: data.room_type,
      check_in: data.check_in, check_out: data.check_out,
      nights: data.nights, total_mxn: data.total_mxn,
      adults: data.adults, children: data.children, rooms: data.rooms, notes: data.notes,
    };
    // Await emails/calendar — failures are logged but do NOT throw (reservation is already saved)
    try {
      await Promise.all([
        createCalendarEvent(calPayload, folio, '2'),
        sendConfirmedEmails(payload, reservationId, folio),
      ]);
    } catch (err) {
      console.error('[ADMIN/CREATE] calendar/email error (reservación guardada, pero envío falló):', err);
    }
  }

  return { success: true, folio, reservation_id: reservationId };
}

export async function patchReservationAction(id: string, action: string) {
  await requireAuth();

  if (action === 'confirm') {
    // Fetch BEFORE patching to know the current payment_method
    const rows = await supabaseGet<FullReservation>('reservations', {
      'id': `eq.${id}`,
      select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
    }, true);

    if (!rows[0]) return { ok: false, error: 'Reservación no encontrada' };
    const r = rows[0];

    const paidByMP = r.payment_method === 'online';
    const now = new Date().toISOString();

    // Patch: confirm + set paid_at if MP and not already set
    await supabasePatch('reservations', id, {
      status:   'confirmed',
      ...(paidByMP && !r.paid_at ? { paid_at: now } : {}),
    });

    const calPayload: CalendarPayload = {
      guest_name: r.guest_name, guest_phone: r.guest_phone,
      guest_email: r.guest_email, room_type: r.room_type,
      check_in: r.check_in, check_out: r.check_out,
      total_mxn: r.total_mxn, adults: r.adults,
      children: r.children, rooms: r.rooms, notes: r.notes,
    };

    // Delete any prior pending/waitlist calendar events before creating the confirmed one
    await findAndDeleteCalendarEventsByFolio(r.folio);

    await Promise.all([
      createCalendarEvent(calPayload, r.folio, '2'),
      paidByMP
        ? sendPaymentConfirmedEmails({ ...r, paid_at: r.paid_at ?? now })
        : sendConfirmedEmails(r, r.id, r.folio),
    ]);

    return { ok: true, status: 'confirmed' };
  }

  if (action === 'mark_paid') {
    await supabasePatch('reservations', id, {
      status: 'confirmed', payment_method: 'cash', paid_at: new Date().toISOString(),
    });
    return { ok: true, status: 'confirmed' };
  }

  if (action === 'cancel' || action === 'cancel:timeout' || action === 'cancel:client' || action === 'cancel:refund' || action === 'cancel:mp_incomplete' || action === 'cancel:internal') {
    const reason = action.includes(':') ? action.split(':')[1] : 'timeout';
    const rows = await supabaseGet<FullReservation>('reservations', {
      'id': `eq.${id}`,
      select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_id',
    }, true);
    const newStatus = reason === 'refund' ? 'refund_pending' : 'cancelled';
    await supabasePatch('reservations', id, { status: newStatus });

    // Si es un espejo del Directorio, liberar también su reserva en la app iOS.
    // (Este server action es el flujo real del botón Cancelar / "cancelación
    // interna" del detalle de reservación — antes solo el API route propagaba.)
    await propagateDirectorioCancel(rows[0]?.notes);

    // Always clean up Google Calendar — fire and forget, non-blocking
    if (rows[0]?.folio) {
      findAndDeleteCalendarEventsByFolio(rows[0].folio).catch(e =>
        console.error('[CANCEL] Calendar cleanup error:', e)
      );
    }

    if (rows[0]?.guest_email) {
      const r = rows[0];

      const payload: ReservationPayload = {
        guest_name: r.guest_name, guest_email: r.guest_email, guest_phone: r.guest_phone,
        room_type: r.room_type, check_in: r.check_in, check_out: r.check_out,
        nights: r.nights, total_mxn: r.total_mxn,
        adults: r.adults, children: r.children, rooms: r.rooms, notes: r.notes,
      };
      if (reason === 'refund')           sendCancelledRefundPendingEmail(payload, r.folio, r.payment_id).catch(() => {});
      else if (reason === 'client')      sendCancelledByRequestEmail(payload, r.folio).catch(() => {});
      else if (reason === 'mp_incomplete') sendCancelledMpIncompleteEmail(payload, r.folio).catch(() => {});
      else if (reason === 'internal') { /* sin email — cancelación operativa interna */ }
      else                               sendCancelledTimeoutEmail(payload, r.folio).catch(() => {});
    }
    return { ok: true, status: newStatus };
  }

  if (action === 'refund') {
    const rows = await supabaseGet<FullReservation>('reservations', {
      'id': `eq.${id}`,
      select: 'id,folio,payment_id,total_mxn,guest_name',
    }, true);
    const r = rows[0];
    if (!r?.payment_id) return { ok: false, error: 'Sin payment_id — no se puede reembolsar por MP' };
    if (!MP_ACCESS_TOKEN) return { ok: false, error: 'MP_ACCESS_TOKEN no configurado' };

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${r.payment_id}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!mpRes.ok) {
      const err = await mpRes.text();
      return { ok: false, error: `MP error: ${err}` };
    }
    await supabasePatch('reservations', id, { status: 'cancelled' });
    if (r.folio) findAndDeleteCalendarEventsByFolio(r.folio).catch(() => {});
    return { ok: true, status: 'cancelled', refunded: true };
  }

  if (action === 'no_show') {
    await supabasePatch('reservations', id, { status: 'no_show' });
    return { ok: true, status: 'no_show' };
  }

  if (action === 'checkout') {
    const rows = await supabaseGet<FullReservation>('reservations', {
      'id': `eq.${id}`,
      select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at,line_items',
    }, true);
    const r = rows[0];
    if (!r) return { ok: false, error: 'Reservación no encontrada' };

    await supabasePatch('reservations', id, { status: 'checked_out' });

    await sendCheckoutEmail(r).catch((err) =>
      console.error('[ADMIN/CHECKOUT] Error al enviar correo de check-out:', err)
    );

    return { ok: true, status: 'checked_out' };
  }

  throw new Error('Acción desconocida');
}

/**
 * Reenvía el correo de confirmación al huésped para CUALQUIER reservación confirmada.
 * Útil cuando el correo original falló silenciosamente (Resend error, email incorrecto, etc.)
 */
export async function resendConfirmedEmailAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };

  console.log(`[ADMIN/RESEND] Reenviando correo para ${r.folio} → ${r.guest_email}`);

  const payload: ReservationPayload = {
    guest_name: r.guest_name, guest_email: r.guest_email, guest_phone: r.guest_phone,
    room_type: r.room_type, check_in: r.check_in, check_out: r.check_out,
    nights: r.nights, total_mxn: r.total_mxn,
    adults: r.adults, children: r.children, rooms: r.rooms, notes: r.notes,
  };

  try {
    if (r.payment_method === 'online' && r.status === 'confirmed') {
      await sendPaymentConfirmedEmails({ ...r, paid_at: r.paid_at ?? new Date().toISOString() });
    } else {
      await sendConfirmedEmails(payload, r.id, r.folio);
    }
  } catch (err) {
    console.error('[ADMIN/RESEND] Error al reenviar:', err);
    return { ok: false, error: String(err) };
  }

  return { ok: true };
}

/**
 * Reenvía el recibo de estancia (comprobante informal de gasto) al huésped.
 */
export async function sendReceiptAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at,line_items',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };

  console.log(`[ADMIN/RECEIPT] Enviando recibo para ${r.folio} → ${r.guest_email}`);
  return sendCheckoutEmail(r);
}

/**
 * Reenvía el correo correcto de "¡Pago recibido!" para una reservación MP ya confirmada.
 * Útil cuando se confirmó manualmente y el template equivocado fue enviado.
 */
export async function resendMpEmailAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };
  if (r.payment_method !== 'online') return { ok: false, error: 'No es una reservación de MP' };
  if (r.status !== 'confirmed') return { ok: false, error: 'La reservación no está confirmada' };

  await sendPaymentConfirmedEmails({
    ...r,
    paid_at: r.paid_at ?? new Date().toISOString(),
  });

  console.log(`[ADMIN/RESEND-MP] Correo MP reenviado para ${r.folio} → ${r.guest_email}`);
  return { ok: true };
}

/**
 * Consulta Mercado Pago por el pago de una reservación pending_payment.
 * Si el pago está approved → confirma la reservación y manda el correo.
 * Sirve como fallback cuando el webhook no procesó automáticamente.
 */
export async function verifyMpPaymentAction(id: string): Promise<{
  ok: boolean;
  status?: string;
  mpStatus?: string | null;
  message?: string;
  error?: string;
}> {
  await requireAuth();

  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  if (!accessToken) return { ok: false, error: 'MP_ACCESS_TOKEN no configurado' };

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };
  if (r.status === 'confirmed') return { ok: true, status: 'confirmed', message: 'Ya estaba confirmada' };

  // Buscar pago en MP
  interface MpPayment { id: number | string; status: string; }
  let mpPayment: MpPayment | null = null;

  if (r.payment_id) {
    // Ya tenemos payment_id — fetch directo
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${r.payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) mpPayment = await res.json();
  } else {
    // Buscar por external_reference = "{uuid}|{folio}"
    const extRef = encodeURIComponent(`${r.id}|${r.folio}`);
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${extRef}&sort=date_created&criteria=desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.ok) {
      const data = await res.json();
      const results: MpPayment[] = data?.results ?? [];
      // Preferir un pago aprobado; si no, el más reciente
      mpPayment = results.find(p => p.status === 'approved') ?? results[0] ?? null;
    }
  }

  if (!mpPayment) {
    console.warn(`[ADMIN/VERIFY-MP] No se encontró pago en MP para ${r.folio}`);
    return { ok: false, mpStatus: null, error: 'No se encontró pago en Mercado Pago' };
  }

  console.log(`[ADMIN/VERIFY-MP] ${r.folio} — MP status: ${mpPayment.status}`);

  if (mpPayment.status !== 'approved') {
    return { ok: false, mpStatus: mpPayment.status, error: `El pago está en estado: ${mpPayment.status}` };
  }

  // Pago aprobado → confirmar reservación
  const paymentId = String(mpPayment.id);
  const now = new Date().toISOString();

  await supabasePatch('reservations', id, {
    status:     'confirmed',
    payment_id: paymentId,
    paid_at:    r.paid_at ?? now,
  });

  const calPayload: CalendarPayload = {
    guest_name: r.guest_name, guest_phone: r.guest_phone, guest_email: r.guest_email,
    room_type: r.room_type, check_in: r.check_in, check_out: r.check_out,
    total_mxn: r.total_mxn, adults: r.adults, children: r.children,
    rooms: r.rooms, notes: r.notes,
  };

  await Promise.all([
    createCalendarEvent(calPayload, r.folio, '2'),
    sendPaymentConfirmedEmails({ ...r, payment_id: paymentId, paid_at: r.paid_at ?? now }),
  ]);

  console.log(`[ADMIN/VERIFY-MP] ${r.folio} confirmado manualmente via verify — payment ${paymentId}`);
  return { ok: true, status: 'confirmed', mpStatus: 'approved', message: `Pago verificado y reservación confirmada (payment ${paymentId})` };
}

export async function deleteReservationAction(id: string) {
  await requireAuth();
  await supabaseDelete('reservations', id);
  return { ok: true };
}

export interface EditReservationData {
  check_in?: string;
  check_out?: string;
  nights?: number;
  total_mxn?: number;
  rooms?: number;
  adults?: number;
  children?: number;
  room_type?: string;
  payment_method?: string;
  notes?: string;
  line_items?: LineItem[];
}

const VALID_ROOM_TYPES = ['suite', 'doble', 'grupal'] as const;
const VALID_PAYMENT_METHODS = ['online', 'pending', 'cash', 'transfer', 'card'] as const;

export async function editReservationAction(
  id: string,
  data: EditReservationData
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  if (!id) return { ok: false, error: 'ID requerido' };

  const update: Record<string, unknown> = {
    edited_at: new Date().toISOString(),
    edited_by: 'admin',
  };

  if (typeof data.check_in === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.check_in)) update.check_in = data.check_in;
  if (typeof data.check_out === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.check_out)) update.check_out = data.check_out;
  if (typeof data.nights === 'number' && data.nights > 0 && data.nights < 365) update.nights = Math.floor(data.nights);
  if (typeof data.total_mxn === 'number' && data.total_mxn >= 0) update.total_mxn = Math.round(data.total_mxn);
  if (typeof data.rooms === 'number' && data.rooms > 0 && data.rooms < 100) update.rooms = Math.floor(data.rooms);
  if (typeof data.adults === 'number' && data.adults > 0 && data.adults < 100) update.adults = Math.floor(data.adults);
  if (typeof data.children === 'number' && data.children >= 0 && data.children < 100) update.children = Math.floor(data.children);
  if (typeof data.notes === 'string') update.notes = data.notes.slice(0, 1000);
  if (typeof data.room_type === 'string' && (VALID_ROOM_TYPES as readonly string[]).includes(data.room_type)) update.room_type = data.room_type;
  if (typeof data.payment_method === 'string' && (VALID_PAYMENT_METHODS as readonly string[]).includes(data.payment_method)) update.payment_method = data.payment_method;

  if (Array.isArray(data.line_items)) {
    const validated: LineItem[] = data.line_items
      .filter(item => typeof item.description === 'string' && typeof item.amount === 'number' && item.amount >= 0)
      .map(item => ({
        description: item.description.slice(0, 200),
        amount: Math.round(item.amount * 100) / 100,
        ...(typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? { date: item.date } : {}),
        ...(typeof item.nights === 'number' && item.nights > 0 ? { nights: Math.floor(item.nights) } : {}),
      }));
    update.line_items = validated;
  }

  if (Object.keys(update).length <= 2) return { ok: false, error: 'Sin campos para actualizar' };

  await supabasePatch('reservations', id, update);
  return { ok: true };
}

/**
 * Reenvía el correo de lista de espera al huésped y la alerta al admin.
 */
/**
 * Deletes all Google Calendar events associated with a reservation folio.
 * Safe to call for any status — useful for cleaning up orphaned events
 * from reservations that were cancelled before this fix was deployed.
 */
export async function cleanCalendarAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name',
  }, true);
  const r = rows[0];
  if (!r?.folio) return { ok: false, error: 'Reservación no encontrada' };
  try {
    // Search by folio first, then by guest name as fallback (covers events created manually or without folio)
    await findAndDeleteCalendarEventsByFolio(r.folio, r.guest_name);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function resendWaitlistEmailAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };
  if (r.status !== 'waitlist') return { ok: false, error: 'No es una reservación en lista de espera' };

  try {
    const p: ReservationPayload = {
      guest_name: r.guest_name, guest_email: r.guest_email, guest_phone: r.guest_phone,
      room_type: r.room_type, check_in: r.check_in, check_out: r.check_out,
      nights: r.nights, total_mxn: r.total_mxn,
      adults: r.adults, children: r.children, rooms: r.rooms, notes: r.notes,
    };
    await sendWaitlistEmails(p, r.id, r.folio);
    console.log(`[ADMIN/RESEND-WAITLIST] Correo waitlist reenviado para ${r.folio} → ${r.guest_email}`);
    return { ok: true };
  } catch (err) {
    console.error('[ADMIN/RESEND-WAITLIST] Error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Genera un link de pago MP para una reservación en waitlist o pending,
 * actualiza la reserva a pending_payment y envía el correo al huésped.
 */
export async function generatePaymentLinkAction(
  id: string
): Promise<{ ok: boolean; folio?: string; guest_email?: string; error?: string }> {
  await requireAuth();

  const mpToken = process.env.MP_ACCESS_TOKEN?.trim();
  if (!mpToken) return { ok: false, error: 'MP_ACCESS_TOKEN no configurado' };

  const baseUrl = (process.env.SERVER_BASE_URL || 'https://hotelelencino.com').trim().replace(/\/+$/, '');

  const rows = await supabaseGet<FullReservation>('reservations', {
    'id': `eq.${id}`,
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method',
  }, true);

  const r = rows[0];
  if (!r) return { ok: false, error: 'Reservación no encontrada' };
  if (!['waitlist', 'pending'].includes(r.status)) {
    return { ok: false, error: `No se puede generar link para status "${r.status}"` };
  }

  // Create MP preference
  const preference = {
    items: [{ title: `Reservacion Hotel El Encino - ${r.folio}`, quantity: 1, unit_price: Number(r.total_mxn), currency_id: 'MXN' }],
    payer:  { name: r.guest_name ?? 'Huésped', email: r.guest_email.toLowerCase().trim() },
    back_urls: { success: `${baseUrl}/reservacion/confirmada`, failure: baseUrl, pending: `${baseUrl}/reservacion/confirmada` },
    notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    external_reference: `${r.id}|${r.folio}`,
    statement_descriptor: 'Hotel El Encino',
  };

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    console.error('[ADMIN/PAY-LINK] MP error:', err);
    return { ok: false, error: `Error MP: ${err.slice(0, 120)}` };
  }

  const { init_point, id: preference_id } = await mpRes.json();

  // Move to pending_payment so the webhook can confirm it automatically
  await supabasePatch('reservations', id, {
    status:         'pending_payment',
    payment_method: 'online',
    preference_id,
  });

  // Send the payment email to the guest
  const payload: ReservationPayload = {
    guest_name: r.guest_name, guest_email: r.guest_email, guest_phone: r.guest_phone,
    room_type: r.room_type, check_in: r.check_in, check_out: r.check_out,
    nights: r.nights, total_mxn: r.total_mxn,
    adults: r.adults, children: r.children, rooms: r.rooms, notes: r.notes,
  };
  await sendPendingPaymentEmails(payload, r.folio, init_point, r.id);

  console.log(`[ADMIN/PAY-LINK] ${r.folio} → ${r.guest_email} | pref ${preference_id}`);
  return { ok: true, folio: r.folio, guest_email: r.guest_email };
}
