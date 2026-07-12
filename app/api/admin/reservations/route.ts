/**
 * GET  /api/admin/reservations?status=&date_from=&date_to=
 * POST /api/admin/reservations  — create manual reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet, supabasePost, getNextFolio } from '@/app/lib/supabase';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendConfirmedEmails, sendReminderEmails, type ReservationPayload } from '@/app/lib/emails';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { sanitizeString, isValidEmail, isValidDate } from '@/app/lib/sanitize';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cancel pending_payment reservations older than 45 min — fire and forget */
function expireStalePayments(): void {
  const cutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  fetch(
    `${SUPABASE_URL}/rest/v1/reservations?status=eq.pending_payment&created_at=lt.${cutoff}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  ).then(r => {
    if (!r.ok) r.text().then(t => console.error('[ADMIN] expireStalePayments error:', t));
    else console.log('[ADMIN] expireStalePayments: stale pending_payment reservations cancelled');
  }).catch(e => console.error('[ADMIN] expireStalePayments fetch failed:', e));
}

/** Send 90-min reminder emails for pending reservations — fire and forget */
function remindStalePending(): void {
  const url = (SUPABASE_URL ?? '').trim();
  const key = (SERVICE_KEY ?? '').trim();
  if (!url || !key) return;

  const now = Date.now();
  const windowStart = new Date(now - 100 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now -  80 * 60 * 1000).toISOString();

  fetch(
    `${url}/rest/v1/reservations` +
    `?status=eq.pending` +
    `&created_at=gte.${windowStart}` +
    `&created_at=lte.${windowEnd}` +
    `&reminder_sent_at=is.null` +
    `&select=id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
    .then(r => r.json())
    .then(async (rows: Array<{
      id: string; folio: string; guest_name: string; guest_email: string;
      guest_phone: string; room_type: string; check_in: string; check_out: string;
      nights: number; total_mxn: number; adults: number | null; children: number | null;
      rooms: number | null; notes: string | null;
    }>) => {
      if (!Array.isArray(rows) || !rows.length) return;
      for (const r of rows) {
        try {
          await sendReminderEmails({
            id: r.id, folio: r.folio, guest_name: r.guest_name, guest_email: r.guest_email,
            guest_phone: r.guest_phone, room_type: r.room_type, check_in: r.check_in,
            check_out: r.check_out, nights: r.nights, total_mxn: r.total_mxn,
            adults: r.adults ?? undefined, children: r.children ?? undefined,
            rooms: r.rooms ?? undefined, notes: r.notes ?? undefined,
          });
          // Mark reminder sent — idempotent guard
          await fetch(`${url}/rest/v1/reservations?id=eq.${r.id}&status=eq.pending&reminder_sent_at=is.null`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
            body: JSON.stringify({ reminder_sent_at: new Date().toISOString() }),
          });
          console.log(`[ADMIN] remindStalePending: reminder sent for ${r.folio}`);
        } catch (e) {
          console.error(`[ADMIN] remindStalePending error for ${r.folio}:`, e);
        }
      }
    })
    .catch(e => console.error('[ADMIN] remindStalePending fetch failed:', e));
}

const ALLOWED_STATUSES = ['pending', 'confirmed', 'pending_payment', 'waitlist', 'cancelled', 'no_show', 'all'];
const ALLOWED_PAYMENT_METHODS = ['pending', 'online', 'cash', 'transfer'];

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get('hotel_admin_session')?.value;
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!limiters.admin(getClientIP(req))) return tooManyRequests();
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Cancel stale MP payments in the background (no await — don't block response)
  expireStalePayments();
  // Send 90-min reminder emails for unconfirmed cash/WhatsApp reservations
  remindStalePending();

  const { searchParams } = new URL(req.url);
  const status    = searchParams.get('status')    ?? '';
  const date_from = searchParams.get('date_from') ?? '';
  const date_to   = searchParams.get('date_to')   ?? '';

  const params: Record<string, string> = {
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,status,payment_method,notes,created_at',
    order: 'check_in.asc',
  };

  // Whitelist status values
  if (status && ALLOWED_STATUSES.includes(status) && status !== 'all') {
    params['status'] = `eq.${status}`;
  } else {
    params['status'] = 'neq.cancelled';
  }

  // Validate date filters
  if (date_from && isValidDate(date_from)) params['check_in']  = `gte.${date_from}`;
  if (date_to   && isValidDate(date_to))   params['check_out'] = `lte.${date_to}`;

  const rows = await supabaseGet<Record<string, unknown>>('reservations', params, true);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!limiters.admin(getClientIP(req))) return tooManyRequests();
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body: ReservationPayload & { status?: string; payment_method?: string } = await req.json();

  // Validate required fields
  const name = sanitizeString(body.guest_name, 100);
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
  }
  if (!isValidEmail(body.guest_email ?? '')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!isValidDate(body.check_in ?? '') || !isValidDate(body.check_out ?? '')) {
    return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
  }

  // Whitelist status and payment_method
  const status = ALLOWED_STATUSES.includes(body.status ?? '') && body.status !== 'all'
    ? body.status!
    : 'confirmed';
  const payment_method = ALLOWED_PAYMENT_METHODS.includes(body.payment_method ?? '')
    ? body.payment_method!
    : 'pending';

  const folio = await getNextFolio();

  const record = await supabasePost<{ id: string }>('reservations', {
    guest_name:     name,
    guest_email:    body.guest_email?.toLowerCase().trim(),
    guest_phone:    sanitizeString(body.guest_phone ?? '', 20),
    room_type:      body.room_type || 'doble',
    check_in:       body.check_in,
    check_out:      body.check_out,
    nights:         body.nights,
    total_mxn:      body.total_mxn,
    adults:         body.adults,
    children:       body.children,
    rooms:          body.rooms,
    notes:          sanitizeString(body.notes ?? '', 500),
    folio,
    status,
    source:         'admin',
    payment_method,
  });

  const reservationId = record?.id || `admin-${Date.now()}`;

  if (status === 'confirmed') {
    const calPayload: CalendarPayload = {
      guest_name:  name,
      guest_phone: sanitizeString(body.guest_phone ?? '', 20),
      guest_email: body.guest_email?.toLowerCase().trim() ?? '',
      room_type:   body.room_type || 'doble',
      check_in:    body.check_in,
      check_out:   body.check_out,
      total_mxn:   body.total_mxn || 0,
      adults:      body.adults,
      children:    body.children,
      rooms:       body.rooms,
      notes:       sanitizeString(body.notes ?? '', 500),
    };
    await Promise.all([
      createCalendarEvent(calPayload, folio, '2'),
      sendConfirmedEmails(body, reservationId, folio),
    ]);
  }

  console.log(`[ADMIN/RESERVATIONS] Created ${folio} — ${status}`);
  return NextResponse.json({ success: true, reservation_id: reservationId, folio, status });
}
