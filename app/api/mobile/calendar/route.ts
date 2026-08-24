import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { paidSumsFor } from '@/app/lib/payments';

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
  const to = DATE_RE.test(qp.get('to') ?? '') ? qp.get('to')! : mtyDate(365);
  // all=1 → incluye canceladas/no-show (filtro de la app b8).
  const statusFilter = qp.get('all') === '1'
    ? 'in.(confirmed,pending_payment,checked_out,cancelled,no_show)'
    : 'in.(confirmed,pending_payment,checked_out)';

  const [reservations, rooms] = await Promise.all([
    supabaseGet<Record<string, unknown>>('reservations', {
      select:
        'id,folio,guest_name,guest_phone,room_type,rooms,adults,children,room,check_in,check_out,nights,total_mxn,occupancy,status,checkin_at,checkout_at,source,paid_at,checkin_code,late_checkout_until',
      check_in: `lte.${to}`,
      check_out: `gte.${from}`,
      status: statusFilter,
      order: 'check_in.asc',
      limit: '500',
    }),
    supabaseGet<Record<string, unknown>>('hotel_rooms_state', {
      select: 'room,state,note,blocked_until,updated_at',
      order: 'room.asc',
    }).catch(() => []),
  ]);

  // b11: estado de cuenta por reserva (MP + pagos manuales).
  const paidMap = await paidSumsFor(
    reservations.map((r) => ({
      id: String(r.id),
      total_mxn: (r.total_mxn as number | null) ?? null,
      paid_at: (r.paid_at as string | null) ?? null,
    }))
  );
  const decorated = reservations.map((r) => ({ ...r, paid_mxn: paidMap[String(r.id)] ?? 0 }));

  return NextResponse.json({
    success: true,
    data: { from, to, today: mtyDate(), reservations: decorated, rooms },
  });
}
