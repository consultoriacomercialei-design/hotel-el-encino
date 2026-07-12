/**
 * GET /api/cron/expire-payments
 *
 * Cancels reservations stuck in pending_payment for more than 45 minutes.
 * Called by Vercel Cron every 30 minutes.
 * Protected by CRON_SECRET (Vercel injects Bearer token automatically).
 *
 * For each expired reservation:
 *   1. PATCH status → cancelled
 *   2. Send "pago no completado" email to guest
 *   3. Delete Google Calendar event (frees the room)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendCancelledMpIncompleteEmail, type ReservationPayload } from '@/app/lib/emails';
import { findAndDeleteCalendarEventsByFolio } from '@/app/lib/google-calendar';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

// MP checkout links expire in ~45 min — match the same window
const EXPIRY_MINUTES = 45;

interface StaleReservation {
  id:           string;
  folio:        string;
  guest_name:   string;
  guest_email:  string;
  guest_phone:  string;
  room_type:    string;
  check_in:     string;
  check_out:    string;
  nights:       number;
  total_mxn:    number;
  adults:       number | null;
  children:     number | null;
  rooms:        number | null;
  notes:        string | null;
  created_at:   string;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();

  // 1. Fetch stale pending_payment with FULL data needed for email/calendar
  const selectCols = 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,created_at';
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?status=eq.pending_payment&created_at=lt.${cutoff}&select=${selectCols}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );

  if (!getRes.ok) {
    console.error('[CRON/EXPIRE] Error fetching stale reservations:', await getRes.text());
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const stale: StaleReservation[] = await getRes.json();

  if (!stale.length) {
    console.log('[CRON/EXPIRE] No stale pending_payment reservations found');
    return NextResponse.json({ cancelled: 0, records: [] });
  }

  // 2. PATCH all stale → cancelled (idempotent, only matches still pending_payment)
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?status=eq.pending_payment&created_at=lt.${cutoff}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  );

  if (!patchRes.ok) {
    console.error('[CRON/EXPIRE] Error cancelling stale reservations:', await patchRes.text());
    return NextResponse.json({ error: 'Cancel failed' }, { status: 500 });
  }

  // 3. Fire-and-forget side effects per reservation (don't block the cron)
  const sideEffects = stale.map(async (r) => {
    const payload: ReservationPayload = {
      guest_name:  r.guest_name,
      guest_email: r.guest_email,
      guest_phone: r.guest_phone,
      room_type:   r.room_type,
      check_in:    r.check_in,
      check_out:   r.check_out,
      nights:      r.nights,
      total_mxn:   r.total_mxn,
      adults:      r.adults ?? undefined,
      children:    r.children ?? undefined,
      rooms:       r.rooms ?? undefined,
      notes:       r.notes ?? undefined,
    };

    const results = await Promise.allSettled([
      sendCancelledMpIncompleteEmail(payload, r.folio),
      findAndDeleteCalendarEventsByFolio(r.folio),
    ]);

    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const op = ['email', 'gcal'][i];
        console.error(`[CRON/EXPIRE] ${r.folio} ${op} failed:`, res.reason);
      }
    });
  });

  await Promise.allSettled(sideEffects);

  const cancelled = stale.map(r => ({ id: r.id, folio: r.folio, guest: r.guest_name }));
  console.log(`[CRON/EXPIRE] Cancelled ${cancelled.length} stale reservations:`, cancelled.map(r => r.folio).join(', '));

  return NextResponse.json({ cancelled: cancelled.length, records: cancelled });
}
