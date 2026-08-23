import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const TOTAL_ROOMS = 3;

// GET /api/mobile/reports?month=YYYY-MM — métricas hoteleras (b2, pestaña
// Más): ocupación %, ADR, ingresos del mes y comparativa vs mes anterior.
// Room-nights = noches de cada reserva que caen DENTRO del mes.

interface ResRow {
  check_in: string; check_out: string; nights: number | null;
  total_mxn: number | null; rooms: number | null; status: string;
}

function monthRange(month: string): { start: string; end: string; days: number } {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, days: lastDay };
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

async function monthStats(month: string) {
  const { start, end, days } = monthRange(month);
  const endExclusive = new Date(Date.parse(end) + 86_400_000).toISOString().slice(0, 10);

  const rows = await supabaseGet<ResRow>('reservations', {
    select: 'check_in,check_out,nights,total_mxn,rooms,status',
    status: 'eq.confirmed',
    check_in: `lt.${endExclusive}`,
    check_out: `gt.${start}`,
    limit: '500',
  });

  let roomNights = 0;
  let revenue = 0;
  for (const r of rows) {
    const inMs = Math.max(Date.parse(r.check_in), Date.parse(start));
    const outMs = Math.min(Date.parse(r.check_out), Date.parse(endExclusive));
    const nightsInMonth = Math.max(Math.round((outMs - inMs) / 86_400_000), 0);
    const roomCount = Math.max(r.rooms ?? 1, 1);
    roomNights += nightsInMonth * roomCount;
    // Ingreso prorrateado a las noches del mes.
    if (r.nights && r.nights > 0 && r.total_mxn) {
      revenue += (r.total_mxn / r.nights) * nightsInMonth;
    }
  }

  const capacity = TOTAL_ROOMS * days;
  return {
    month,
    occupancy_pct: capacity > 0 ? Math.round((roomNights / capacity) * 100) : 0,
    room_nights: roomNights,
    revenue_mxn: Math.round(revenue),
    adr_mxn: roomNights > 0 ? Math.round(revenue / roomNights) : 0,
    reservations: rows.length,
  };
}

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const qp = req.nextUrl.searchParams;
  const month = /^\d{4}-\d{2}$/.test(qp.get('month') ?? '')
    ? qp.get('month')!
    : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }).slice(0, 7);

  const [current, previous] = await Promise.all([
    monthStats(month),
    monthStats(prevMonth(month)),
  ]);

  return NextResponse.json({ success: true, data: { current, previous } });
}
