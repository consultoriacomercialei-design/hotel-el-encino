/**
 * POST /api/admin/batch-confirm
 * One-time endpoint to confirm pending_payment reservations.
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabasePatch, supabaseGet } from '@/app/lib/supabase';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendPaymentConfirmedEmails, type FullReservation } from '@/app/lib/emails';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids requerido' }, { status: 400 });

  const results = [];
  for (const id of ids) {
    try {
      await supabasePatch('reservations', id, {
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      });

      const rows = await supabaseGet<FullReservation>('reservations', {
        'id': `eq.${id}`,
        select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
      }, true);

      if (rows.length) {
        const r = rows[0];
        const cal: CalendarPayload = { guest_name: r.guest_name, guest_phone: r.guest_phone, guest_email: r.guest_email, room_type: r.room_type, check_in: r.check_in, check_out: r.check_out, total_mxn: r.total_mxn, adults: r.adults, children: r.children, rooms: r.rooms, notes: r.notes };
        await Promise.all([createCalendarEvent(cal, r.folio, '2'), sendPaymentConfirmedEmails({ ...r, payment_method: 'online' })]);
        results.push({ id, folio: r.folio, guest: r.guest_name, ok: true });
      }
    } catch (e) {
      results.push({ id, ok: false, error: String(e) });
    }
  }
  return NextResponse.json({ results });
}
