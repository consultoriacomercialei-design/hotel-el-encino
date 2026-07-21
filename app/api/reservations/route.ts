/**
 * POST /api/reservations
 *
 * Creates a reservation with status derived from source + payment_method:
 *   source='web-waitlist'    → status='waitlist'   (no room blocked)
 *   payment_method='online'  → status='pending_payment' (awaiting MP)
 *   payment_method='pending' → status='pending'    (pay at hotel)
 *   default                  → status='confirmed'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNextFolio, logAuditEvent, supabaseGet, supabasePost } from '@/app/lib/supabase';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import {
  sendPendingCashEmails,
  sendWaitlistEmails,
  type ReservationPayload,
} from '@/app/lib/emails';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { validateReservationInput, sanitizeString } from '@/app/lib/sanitize';
import { isBlacklisted } from '@/app/lib/blacklist';
import { fetchPricingConfig } from '@/app/lib/hotel-config';
import { quoteReservation } from '@/app/lib/pricing';

interface RequestBody extends ReservationPayload {
  payment_method?: 'online' | 'pending';
  addons?: string[];
  line_items?: Array<{ description: string; amount: number }>;
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 reservaciones por 15 min por IP
  if (!limiters.reservations(getClientIP(req))) {
    return tooManyRequests();
  }

  try {
    const body: RequestBody = await req.json();

    // Sanitize and validate all user inputs
    const validationError = validateReservationInput(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    // Check blacklist (silently blocks without revealing the reason)
    if (await isBlacklisted(body.guest_email)) {
      return NextResponse.json({
        success: false,
        error: 'No es posible procesar tu reservación en este momento. Por favor contáctanos directamente al +52 81 2698 8232.',
      }, { status: 403 });
    }

    // Whitelist source and payment_method
    const source = body.source === 'web-waitlist' ? 'web-waitlist' : 'web';
    const payment_method = body.payment_method === 'online' ? 'online' : 'pending';

    // Idempotency: if this email+dates already has a pending_payment reservation created
    // within the last 90 seconds, return it instead of creating a duplicate.
    // Protects against double-tap / impatient retries that slip past the frontend guard.
    if (payment_method === 'online') {
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const existing = await supabaseGet<{ id: string; folio: string }>(
        'reservations',
        {
          guest_email: `eq.${body.guest_email}`,
          check_in:    `eq.${body.check_in}`,
          check_out:   `eq.${body.check_out}`,
          status:      'eq.pending_payment',
          created_at:  `gt.${cutoff}`,
          select:      'id,folio',
        }
      );
      if (existing.length) {
        console.log(`[RESERVATIONS] Idempotency hit — returning existing ${existing[0].folio} for ${body.guest_email}`);
        logAuditEvent({
          event:          'reservation.duplicate_blocked',
          status:         'duplicate',
          reservation_id: existing[0].id,
          folio:          existing[0].folio,
          guest_email:    body.guest_email,
          ip:             req.headers.get('x-forwarded-for') ?? undefined,
          details:        { check_in: body.check_in, check_out: body.check_out },
        });
        return NextResponse.json({
          success: true,
          reservation_id: existing[0].id,
          folio:          existing[0].folio,
          status:         'pending_payment',
          message:        'Reservación ya iniciada. Completa el pago para confirmar.',
        });
      }
    }

    const isWaitlist = source === 'web-waitlist';
    const isOnline   = payment_method === 'online';

    // ── Recálculo de precio del lado del servidor (fuente de verdad) ──────────
    // NUNCA se confía en el total del cliente: se recalcula desde fechas,
    // ocupación y temporadas con la config viva de hotel_settings.
    const cfg = await fetchPricingConfig();
    const quote = quoteReservation({
      checkIn:  body.check_in,
      checkOut: body.check_out,
      adults:   body.adults ?? 1,
      children: body.children ?? 0,
      prices:   cfg.prices,
      seasons:  cfg.seasons,
      addons:   cfg.addons,
      selectedAddonIds: Array.isArray(body.addons) ? body.addons : [],
    });

    const serverLineItems = [
      ...quote.breakdown.filter(b => b.amount > 0).map(b => ({ description: b.label, amount: b.amount })),
      ...quote.addonItems.map(a => ({ description: a.label, amount: a.amount })),
    ];

    if (quote.valid && quote.total !== body.total_mxn) {
      console.warn(`[RESERVATIONS] Total recalculado: cliente $${body.total_mxn} → servidor $${quote.total} (${body.check_in}→${body.check_out}, ${body.adults ?? 1}A/${body.children ?? 0}N)`);
    }

    // Sobrescribe los valores del cliente con los del servidor (usados en insert, calendario y correos)
    if (quote.valid) {
      body.total_mxn  = quote.total;
      body.nights     = quote.nights;
      body.rooms      = quote.rooms;
      body.line_items = serverLineItems;
    }

    // Determine status
    let status: string;
    if (isWaitlist)    status = 'waitlist';
    else if (isOnline) status = 'pending_payment';
    else               status = 'pending';

    // Get atomic folio
    const folio = await getNextFolio();

    // Save to Supabase (only sanitized/whitelisted fields)
    const record = await supabasePost<{ id: string }>('reservations', {
      guest_name:     body.guest_name,
      guest_email:    body.guest_email,
      guest_phone:    body.guest_phone,
      room_type:      body.room_type,
      check_in:       body.check_in,
      check_out:      body.check_out,
      nights:         body.nights,
      total_mxn:      body.total_mxn,
      adults:         body.adults ?? 1,
      children:       body.children ?? 0,
      rooms:          body.rooms ?? 1,
      line_items:     body.line_items ?? [],
      notes:          sanitizeString(body.notes ?? '', 500),
      source,
      payment_method,
      status,
      folio,
    });

    const reservationId = record?.id || `local-${Date.now()}`;

    console.log(`[RESERVATIONS] ${folio} — ${status} — ${reservationId} — ${body.check_in} → ${body.check_out}`);

    logAuditEvent({
      event:          'reservation.created',
      status:         'ok',
      reservation_id: reservationId,
      folio,
      guest_email:    body.guest_email,
      ip:             req.headers.get('x-forwarded-for') ?? undefined,
      user_agent:     req.headers.get('user-agent') ?? undefined,
      details:        { payment_method, check_in: body.check_in, check_out: body.check_out, total_mxn: body.total_mxn, rooms: body.rooms ?? 1 },
    });

    const calPayload: CalendarPayload = {
      guest_name:  body.guest_name,
      guest_phone: body.guest_phone,
      guest_email: body.guest_email,
      room_type:   body.room_type,
      check_in:    body.check_in,
      check_out:   body.check_out,
      total_mxn:   body.total_mxn,
      adults:      body.adults,
      children:    body.children,
      rooms:       body.rooms,
      notes:       body.notes,
    };

    if (isWaitlist) {
      await Promise.all([
        createCalendarEvent(calPayload, folio, '11'),
        sendWaitlistEmails(body, reservationId, folio),
      ]);
    } else if (!isOnline) {
      await Promise.all([
        createCalendarEvent(calPayload, folio, '10'),
        sendPendingCashEmails(body, reservationId, folio),
      ]);
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservationId,
      folio,
      status,
      message: isWaitlist
        ? 'Te anotamos en lista de espera. Te contactaremos pronto.'
        : isOnline
        ? 'Reservación iniciada. Completa el pago para confirmar.'
        : '¡Reservación recibida! Te enviamos los detalles a tu correo.',
    });
  } catch (e) {
    console.error('[RESERVATIONS] Error:', e);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
