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
import { logWebhookEvent, logAuditEvent } from '@/app/lib/supabase';
import { recordPayment, deriveReservationState, reservationIdFromReference, type MpPayment } from '@/app/lib/payments';

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

    const payment: MpPayment = await paymentRes.json();
    const { reservationId, folio } = reservationIdFromReference(payment);

    console.log(`[WEBHOOK/MP] payment ${paymentId} status=${payment.status} reservationId=${reservationId ?? 'none'}`);

    // 1. REGISTRAR: el intento de pago se guarda SIEMPRE, sin importar el
    //    estado de la reserva. Un pago aprobado sin reserva ligada queda
    //    visible en la vista payments_unlinked (invariante del sistema).
    await recordPayment(payment);

    if (!reservationId) {
      logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, sig_valid: true, action: 'no_reservation', error_msg: `external_reference: ${payment.external_reference ?? 'null'}` });
      return NextResponse.json({ ok: true });
    }

    // 2. DERIVAR: la regla única (pago aprobado ⇒ reserva confirmada) vive en
    //    lib/payments. Un rechazo no toca la reserva — el huésped casi siempre
    //    reintenta (incidente RSV-160); el cron expira solo abandonos reales.
    const result = await deriveReservationState(reservationId);

    switch (result) {
      case 'confirmed':
        logAuditEvent({ event: 'payment.webhook_confirmed', status: 'ok', reservation_id: reservationId, folio, details: { payment_id: paymentId, amount: payment.transaction_amount } });
        console.log(`[WEBHOOK/MP] Pago confirmado: ${reservationId} · payment ${paymentId}`);
        break;
      case 'already_confirmed':
        logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, reservation_id: reservationId, folio, sig_valid: true, action: 'already_confirmed' });
        break;
      case 'no_approved_payment':
        logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, reservation_id: reservationId, folio, sig_valid: true, action: payment.status === 'rejected' || payment.status === 'cancelled' ? 'payment_rejected_no_cancel' : 'recorded_no_action' });
        break;
      case 'error':
        logWebhookEvent({ source: 'mercadopago', payment_id: paymentId, payment_status: payment.status, reservation_id: reservationId, folio, sig_valid: true, action: 'derive_error' });
        break;
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
