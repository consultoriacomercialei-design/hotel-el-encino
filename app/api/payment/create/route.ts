/**
 * POST /api/payment/create
 *
 * Creates a Mercado Pago checkout preference and sends pending-payment email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { sendPendingPaymentEmails, type ReservationPayload } from '@/app/lib/emails';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { isValidEmail, sanitizeString } from '@/app/lib/sanitize';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
// SERVER_BASE_URL is non-public so it's read from Vercel env at runtime (not baked into build)
const BASE_URL = (process.env.SERVER_BASE_URL || 'https://hotelelencino.com').trim().replace(/\/+$/, '');

interface CreatePaymentBody extends ReservationPayload {
  reservation_id: string;
  folio: string;
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 por 15 min por IP (crear preferencia es costoso)
  if (!limiters.paymentCreate(getClientIP(req))) {
    return tooManyRequests();
  }

  try {
    const body: CreatePaymentBody = await req.json();
    const { reservation_id, folio, guest_name, guest_email } = body;

    // Validate required fields
    if (!reservation_id || !folio || !guest_email) {
      return NextResponse.json({ error: 'Parámetros requeridos faltantes' }, { status: 400 });
    }

    // Validate types and formats
    if (typeof reservation_id !== 'string' || reservation_id.length > 100) {
      return NextResponse.json({ error: 'reservation_id inválido' }, { status: 400 });
    }
    if (typeof folio !== 'string' || folio.length > 20) {
      return NextResponse.json({ error: 'folio inválido' }, { status: 400 });
    }
    if (!isValidEmail(guest_email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // El monto a cobrar SIEMPRE sale de la fila persistida (recalculada por el
    // servidor en /api/reservations), nunca del total que arma el navegador.
    const rows = await supabaseGet<{ total_mxn: number; nights: number }>('reservations', {
      id:     `eq.${reservation_id}`,
      select: 'total_mxn,nights',
    });
    const reservation = rows[0];
    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }
    const total_mxn = Number(reservation.total_mxn);
    if (!Number.isFinite(total_mxn) || total_mxn < 1000 || total_mxn > 500_000) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Servicio de pago no disponible' }, { status: 503 });
    }

    const tokenMode = MP_ACCESS_TOKEN.startsWith('TEST-') ? 'TEST' : 'PRODUCTION';
    console.log(`[PAYMENT/CREATE] token mode: ${tokenMode}, folio: ${folio}, total: ${total_mxn}`);

    const safeGuestName = sanitizeString(guest_name ?? '', 100) || 'Huésped';
    const nameParts = safeGuestName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Huésped';
    const lastName  = nameParts.slice(1).join(' ') || firstName;

    // Phone: MP espera area_code (2-4 dígitos) + number separados
    const phoneDigits = (body.guest_phone ?? '').replace(/\D/g, '');
    // MX: si empieza con 52, ya trae lada país; si no, tomar primeros 2-3 como lada
    const mxPhone = phoneDigits.startsWith('52') ? phoneDigits.slice(2) : phoneDigits;
    const areaCode = mxPhone.slice(0, 2) || '81';
    const phoneNumber = mxPhone.slice(2) || mxPhone;

    const successUrl = `${BASE_URL}/reservacion/confirmada`;
    const failureUrl = `${BASE_URL}/reservacion/confirmada`;
    // Pending = OXXO/transfer not yet cleared — same page, polling will handle it
    const pendingUrl = `${BASE_URL}/reservacion/confirmada`;

    // MP recomienda 45 min para checkout — alineado con cron expire-payments
    const expirationDate = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    console.log('[PAYMENT/CREATE] BASE_URL:', BASE_URL, '| back_urls:', successUrl, failureUrl);

    const preference = {
      items: [{
        id: folio,
        title: `Hospedaje Hotel El Encino`,
        description: `Reservación ${folio} — ${body.nights ?? 1} noche${(body.nights ?? 1) !== 1 ? 's' : ''}`,
        category_id: 'services',
        quantity: 1,
        unit_price: Number(total_mxn),
        currency_id: 'MXN',
      }],
      payer: {
        name: firstName,
        surname: lastName,
        email: guest_email.toLowerCase().trim(),
        phone: phoneNumber ? { area_code: areaCode, number: phoneNumber } : undefined,
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: 'approved',
      notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
      external_reference: `${reservation_id}|${folio}`,
      // Statement descriptor — máx 22 chars, sin acentos
      statement_descriptor: 'HOTEL EL ENCINO',
      // Cierra el checkout pasados 45 min (alineado con cron)
      expires: true,
      expiration_date_to: expirationDate,
      // Permite hasta 12 meses sin intereses con tarjeta
      payment_methods: {
        installments: 12,
      },
      // Metadata para reconciliación y antifraude
      metadata: {
        folio,
        reservation_id,
        nights: body.nights,
        check_in: body.check_in,
        check_out: body.check_out,
      },
    };

    console.log('[PAYMENT/CREATE] preference JSON:', JSON.stringify(preference));

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const mpErr = await mpRes.text();
      console.error('[PAYMENT/CREATE] MP error:', mpRes.status, mpErr);
      return NextResponse.json({ error: 'Error al crear preferencia de pago', detail: mpErr }, { status: 502 });
    }

    const mpData = await mpRes.json();
    const { init_point, id: preference_id } = mpData;

    await supabasePatch('reservations', reservation_id, { preference_id });
    await sendPendingPaymentEmails(body, folio, init_point, reservation_id);

    console.log(`[PAYMENT/CREATE] ${folio} — preference ${preference_id}`);

    return NextResponse.json({ init_point, preference_id });
  } catch (e) {
    console.error('[PAYMENT/CREATE] Error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
