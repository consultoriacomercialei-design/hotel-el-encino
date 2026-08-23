import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — reservas que
// tocan el rango + estado de cuartos, para la vista Agenda (estilo
// anfitriones del Directorio) y la rejilla cuartos×días (b2, 23-ago).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function mtyDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
}

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const qp = req.nextUrl.searchParams;
  const from = DATE_RE.test(qp.get('from') ?? '') ? qp.get('from')! : mtyDate(-1);
  const to = DATE_RE.test(qp.get('to') ?? '') ? qp.get('to')! : mtyDate(45);

  const [reservations, rooms] = await Promise.all([
    supabaseGet<Record<string, unknown>>('reservations', {
      select:
        'id,folio,guest_name,guest_phone,room_type,rooms,room,check_in,check_out,nights,total_mxn,status,checkin_at,checkout_at,source,checkin_code,late_checkout_until',
      check_in: `lte.${to}`,
      check_out: `gte.${from}`,
      status: 'in.(confirmed,pending_payment)',
      order: 'check_in.asc',
      limit: '300',
    }),
    supabaseGet<Record<string, unknown>>('hotel_rooms_state', {
      select: 'room,state,note,blocked_until,updated_at',
      order: 'room.asc',
    }).catch(() => []),
  ]);

  return NextResponse.json({
    success: true,
    data: { from, to, today: mtyDate(), reservations, rooms },
  });
}
