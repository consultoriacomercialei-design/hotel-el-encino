/**
 * GET /api/cron/remind-pending
 *
 * Sends reminder emails for reservations that have been in `pending` status
 * for 80–100 minutes without confirmation (cash/WhatsApp bookings).
 *
 * Runs every 15 minutes via Vercel Cron.
 * Uses `reminder_sent_at` to guarantee each reservation gets exactly one reminder.
 * Protected by Vercel-injected Bearer token (CRON_SECRET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmails } from '@/app/lib/emails';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Send reminder when reservation is between 80–100 minutes old
const REMINDER_MIN = 80;
const REMINDER_MAX = 100;

type PendingReservation = {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  notes: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  // Verify Vercel cron auth — fail closed: if secret not configured, deny all
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const url = SUPABASE_URL.trim();
  const key = KEY.trim();
  const now = Date.now();
  const windowStart = new Date(now - REMINDER_MAX * 60 * 1000).toISOString();
  const windowEnd   = new Date(now - REMINDER_MIN * 60 * 1000).toISOString();

  // Find pending reservations in the 80–100 min window that haven't been reminded yet
  const getRes = await fetch(
    `${url}/rest/v1/reservations` +
    `?status=eq.pending` +
    `&created_at=gte.${windowStart}` +
    `&created_at=lte.${windowEnd}` +
    `&reminder_sent_at=is.null` +
    `&select=id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,created_at`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );

  if (!getRes.ok) {
    const err = await getRes.text();
    console.error('[CRON/REMIND] Error fetching pending reservations:', err);
    return NextResponse.json({ error: 'DB fetch error' }, { status: 500 });
  }

  const pending: PendingReservation[] = await getRes.json();

  if (!pending.length) {
    console.log('[CRON/REMIND] No reservations need reminders right now');
    return NextResponse.json({ reminded: 0, records: [] });
  }

  const results: { folio: string; ok: boolean }[] = [];

  for (const r of pending) {
    try {
      // Send both guest + admin emails
      await sendReminderEmails({
        id: r.id,
        folio: r.folio,
        guest_name: r.guest_name,
        guest_email: r.guest_email,
        guest_phone: r.guest_phone,
        room_type: r.room_type,
        check_in: r.check_in,
        check_out: r.check_out,
        nights: r.nights,
        total_mxn: r.total_mxn,
        adults: r.adults ?? undefined,
        children: r.children ?? undefined,
        rooms: r.rooms ?? undefined,
        notes: r.notes ?? undefined,
      });

      // Mark reminder as sent — idempotent: only update if still pending + null
      const patchRes = await fetch(
        `${url}/rest/v1/reservations?id=eq.${r.id}&status=eq.pending&reminder_sent_at=is.null`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${key}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ reminder_sent_at: new Date().toISOString() }),
        }
      );

      if (!patchRes.ok) {
        console.error(`[CRON/REMIND] Failed to mark reminder for ${r.folio}:`, await patchRes.text());
      }

      console.log(`[CRON/REMIND] Sent reminder for ${r.folio} (${r.guest_name})`);
      results.push({ folio: r.folio, ok: true });
    } catch (err) {
      console.error(`[CRON/REMIND] Error processing ${r.folio}:`, err);
      results.push({ folio: r.folio, ok: false });
    }
  }

  return NextResponse.json({ reminded: results.filter(r => r.ok).length, records: results });
}
