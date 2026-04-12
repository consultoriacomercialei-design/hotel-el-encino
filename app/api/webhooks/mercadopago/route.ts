/**
 * POST /api/webhooks/mercadopago
 *
 * Receives MP payment notifications.
 * Verifies HMAC-SHA256 signature, then updates reservation status.
 * Always returns 200 (MP retries on non-200).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabasePatch, supabaseGet } from '@/app/lib/supabase';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendPaymentConfirmedEmails, type FullReservation } from '@/app/lib/emails';
import { notifyHome } from '@/app/lib/notify-home';

const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

function verifySignature(req: NextRequest, rawBody: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.warn('[WEBHOOK/MP] MP_WEBHOOK_SECRET not set — skipping verification');
    return true; // allow in dev
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  // x-signature: ts=...,v1=...
  const parts = Object.fromEntries(
    xSignature.split(',').map(p => p.split('='))
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

  if (!verifySignature(req, rawBody)) {
    console.warn('[WEBHOOK/MP] Firma inválida — ignorando');
    return NextResponse.json({ ok: true }, { status: 200 }); // always 200
  }

  let event: { type?: string; data?: { id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (event.type !== 'payment' || !event.data?.id) {
    return NextResponse.json({ ok: true });
  }

  if (!MP_ACCESS_TOKEN) {
    console.error('[WEBHOOK/MP] MP_ACCESS_TOKEN not set');
    return NextResponse.json({ ok: true });
  }

  try {
    // Fetch payment details from MP
    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${event.data.id}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    if (!paymentRes.ok) {
      console.error('[WEBHOOK/MP] Error fetching payment:', await paymentRes.text());
      return NextResponse.json({ ok: true });
    }

    const payment = await paymentRes.json();
    // external_reference is "uuid|folio" — extract only the UUID part
    const reservationId = payment.external_reference?.split('|')[0];
    const paymentId     = String(event.data.id);

    if (!reservationId) {
      return NextResponse.json({ ok: true });
    }

    if (payment.status === 'approved') {
      // Idempotent update: only if currently pending_payment
      const patched = await supabasePatch('reservations', reservationId, {
        status:     'confirmed',
        payment_id: paymentId,
        paid_at:    new Date().toISOString(),
      });

      if (patched) {
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

          // Notificar casa → luces verdes ✅
          notifyHome({
            event:     'confirmed',
            folio:     r.folio,
            guest:     r.guest_name,
            check_in:  r.check_in,
            total_mxn: r.total_mxn,
            room_type: r.room_type,
          }).catch(() => {});

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
          await Promise.all([
            createCalendarEvent(calPayload, r.folio, '2'), // verde
            sendPaymentConfirmedEmails({ ...r, payment_id: paymentId }),
          ]);
        }
        console.log(`[WEBHOOK/MP] Pago confirmado: ${reservationId} · payment ${paymentId}`);
      }
    } else if (payment.status === 'rejected') {
      await supabasePatch('reservations', reservationId, { status: 'cancelled' });
      console.log(`[WEBHOOK/MP] Pago rechazado: ${reservationId}`);
    }
  } catch (e) {
    console.error('[WEBHOOK/MP] Error interno:', e);
  }

  return NextResponse.json({ ok: true });
}
