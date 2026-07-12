/**
 * POST /api/admin/sync-calendar
 * Creates Google Calendar events for ALL confirmed reservations.
 * Admin auth required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import type { FullReservation } from '@/app/lib/emails';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const rows = await supabaseGet<FullReservation>('reservations', {
    status: 'eq.confirmed',
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,total_mxn,adults,children,rooms,notes',
    order: 'check_in.asc',
  }, true);

  const results = [];
  for (const r of rows) {
    const cal: CalendarPayload = {
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
      await createCalendarEvent(cal, r.folio, '2');
      results.push({ folio: r.folio, guest: r.guest_name, ok: true });
    } catch (e) {
      results.push({ folio: r.folio, guest: r.guest_name, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ total: rows.length, results });
}
