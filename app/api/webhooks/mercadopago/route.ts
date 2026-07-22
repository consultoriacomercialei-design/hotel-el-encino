/**
 * POST /api/webhooks/mercadopago
 *
 * Receives MP payment notifications.
 * Verifies HMAC-SHA256 signature, then updates reservation status.
 * Always returns 200 (MP retries on non-200).
 * All events are logged to webhook_events table for observability.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabasePatch, supabaseGet, logWebhookEvent, logAuditEvent } from '@/app/lib/supabase';
import { createCalendarEvent, findAndDeleteCalendarEventsByFolio, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendPaymentConfirmedEmails, type FullReservation } from '@/app/lib/emails';
import { ensureCheckinCode } from '@/app/lib/wallet/checkin-code';

const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN?.trim();
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET?.trim();

function verifySignature(req: NextRequest, rawBody: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.warn('[WEBHOOK/MP] MP_WEBHOOK_SECRET not set — skipping verification');
    return true; // allow in dev
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  // x-signature: ts=...,v1=...
  const parts = Object.fromEntries(
    xSignature.split(',').map(p => {
      const eq = p.indexOf('=');
      return eq > -1 ? [p.slice(0, eq), p.slice(eq + 1)] : [p, ''];
    })
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Parse data.id from body
  let dataId = '';
  try {
    const parsed = JSON.parse(rawBody);
    dataId = parsed?.data?.id?.toString() || '';
  } catch { return false; }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(v1, 'hex')
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // MP sends notifications in two formats simultaneously:
  //   • Legacy (v1): { topic, resource } — uses a different auth scheme, incompatible with HMAC
  //   • Current (v2): { type, data: { id } } — uses x-signature HMAC-SHA256
  // Silently acknowledge legacy notifications to prevent false sig_failed log noise.
  const rawParsed = safeParseJson(rawBody);
  if (rawParsed && typeof rawParsed === 'object' && 'topic' in (rawParsed as object)) {
    return NextResponse.json({ ok: true });
  }

  if (!verifySignature(req, rawBody)) {
    console.warn('[WEBHOOK/MP] Firma invalida. x-signature:', req.headers.get('x-signature'), '| secret configurado:', !!MP_WEBHOOK_SECRET);
    logWebhookEvent({
      source: 'mercadopago',
      sig_valid: false,
      action: 'sig_failed',
      error_msg: `x-signature: ${req.headers.get('x-signature') ?? 'missing'} | secret_set: ${!!MP_WEBHOOK_SECRET}`,
      raw_event: rawParsed,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // rawParsed already computed above; re-use to avoid double parse
  let event: { type?: string; data?: { id?: string } };
  if (!rawParsed) {
    logWebhookEvent({ source: 'mercadopago', sig_valid: true, action: 'parse_error', error_msg: 'Invalid JSON body' });
    return NextResponse.json({ ok: true });
  }
  event = rawParsed as { type?: string; data?: { id?: string } };

  if (event.type !== 'payment' || !event.data?.id) {
    logWebhookEvent({
      source: 'mercadopago',
      sig_valid: true,
      action: 'ignored',
      error_msg: `type=${event.type ?? 'none'} data.id=${event.data?.id ?? 'none'}`,
      raw_event: event,
    });
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(event.data.id);

  if (!MP_ACCESS_TOKEN) {
    console.error('[WEBHOOK/MP] MP_ACCESS_TOKEN not set');
    logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, sig_valid: true, action: 'config_error', error_msg: 'MP_ACCESS_TOKEN not set' });
    return NextResponse.json({ ok: true });
  }

  try {
    // Fetch payment details from MP
    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      console.error('[WEBHOOK/MP] Error fetching payment:', errText);
      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, sig_valid: true, action: 'fetch_error', error_msg: `HTTP ${paymentRes.status}: ${errText.slice(0, 200)}` });
      return NextResponse.json({ ok: true });
    }

    const payment = await paymentRes.json();
    // external_reference is "uuid|folio" — extract only the UUID part
    const reservationId = payment.external_reference?.split('|')[0];
    const folio         = payment.external_reference?.split('|')[1] ?? '';

    if (!reservationId) {
      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, sig_valid: true, action: 'no_reservation', error_msg: `external_reference: ${payment.external_reference ?? 'null'}` });
      return NextResponse.json({ ok: true });
    }

    console.log(`[WEBHOOK/MP] payment ${paymentId} status=${payment.status} reservationId=${reservationId}`);

    if (payment.status === 'approved') {
      const patched = await supabasePatch('reservations', reservationId, {
        status:     'confirmed',
        payment_id: paymentId,
        paid_at:    new Date().toISOString(),
      }, { status: 'eq.pending_payment' });

      if (!patched) {
        console.warn(`[WEBHOOK/MP] PATCH no actualizó fila para ${reservationId} (ya confirmada o no en pending_payment)`);
        logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: 'approved', reservation_id: reservationId, folio, sig_valid: true, action: 'already_confirmed' });
        return NextResponse.json({ ok: true });
      }

      // Fetch full reservation for calendar + email
      const rows = await supabaseGet<FullReservation>(
        'reservations',
        {
          'id': `eq.${reservationId}`,
          select: 'id,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,folio,status,payment_method,payment_id,paid_at',
        },
        true
      );

      if (rows.length) {
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
          // Genera el código del pase de Wallet (best-effort; si falla, el
          // correo sale sin botón pero con su .ics).
          const checkinCode = await ensureCheckinCode(reservationId);
          // Remove any prior pending/waitlist calendar events before creating the confirmed one
          await findAndDeleteCalendarEventsByFolio(r.folio);
          await Promise.all([
            createCalendarEvent(calPayload, r.folio, '2'),
            sendPaymentConfirmedEmails({ ...r, payment_id: paymentId, checkin_code: checkinCode ?? undefined }),
          ]);
        } catch (emailErr) {
          console.error('[WEBHOOK/MP] calendar/email error (non-fatal):', emailErr);
          logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: 'approved', reservation_id: reservationId, folio, sig_valid: true, action: 'confirmed_email_failed', error_msg: String(emailErr) });
          return NextResponse.json({ ok: true });
        }
      }

      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: 'approved', reservation_id: reservationId, folio, sig_valid: true, action: 'confirmed' });
      logAuditEvent({ event: 'payment.webhook_confirmed', status: 'ok', reservation_id: reservationId, folio, details: { payment_id: paymentId, amount: payment.transaction_amount } });
      console.log(`[WEBHOOK/MP] Pago confirmado: ${reservationId} · payment ${paymentId}`);

    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabasePatch('reservations', reservationId, { status: 'cancelled' }, { status: 'eq.pending_payment' });
      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, reservation_id: reservationId, folio, sig_valid: true, action: 'cancelled' });
      logAuditEvent({ event: 'payment.webhook_cancelled', status: 'ok', reservation_id: reservationId, folio, details: { payment_id: paymentId, mp_status: payment.status } });
      console.log(`[WEBHOOK/MP] Pago ${payment.status}: ${reservationId}`);

    } else {
      // Other statuses: in_process, pending, etc. — just log, no action
      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, reservation_id: reservationId, folio, sig_valid: true, action: 'no_action', error_msg: `Unhandled status: ${payment.status}` });
    }

  } catch (e) {
    console.error('[WEBHOOK/MP] Error interno:', e);
    logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, sig_valid: true, action: 'internal_error', error_msg: String(e) });
  }

  return NextResponse.json({ ok: true });
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
