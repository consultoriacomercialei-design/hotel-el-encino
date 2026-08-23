import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const TOTAL_ROOMS = 3;

// GET /api/mobile/reports?month=YYYY-MM — tablero (b8, "tableau sencillo"):
// KPIs del mes con rango explícito + comparativa, serie de 12 meses
// (ocupación e ingresos) y desglose del mes por origen y forma de pago.
// Metodología: noches-cuarto DENTRO del mes; ingreso prorrateado por noche.

interface ResRow {
  check_in: string; check_out: string; nights: number | null;
  total_mxn: number | null; rooms: number | null; status: string;
  source: string | null; payment_method: string | null;
}

function monthRange(month: string): { start: string; endExclusive: string; days: number } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const endExclusive = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, endExclusive, days: lastDay };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function statsFor(month: string, rows: ResRow[]) {
  const { start, endExclusive, days } = monthRange(month);
  let roomNights = 0;
  let revenue = 0;
  let reservations = 0;
  for (const r of rows) {
    const inMs = Math.max(Date.parse(r.check_in), Date.parse(start));
    const outMs = Math.min(Date.parse(r.check_out), Date.parse(endExclusive));
    const nightsInMonth = Math.max(Math.round((outMs - inMs) / 86_400_000), 0);
    if (nightsInMonth === 0) continue;
    reservations += 1;
    const roomCount = Math.max(r.rooms ?? 1, 1);
    roomNights += nightsInMonth * roomCount;
    if (r.nights && r.nights > 0 && r.total_mxn) {
      revenue += (r.total_mxn / r.nights) * nightsInMonth;
    }
  }
  const capacity = TOTAL_ROOMS * days;
  return {
    month,
    range: { start, end: `${month}-${String(days).padStart(2, '0')}` },
    occupancy_pct: capacity > 0 ? Math.round((roomNights / capacity) * 100) : 0,
    room_nights: roomNights,
    revenue_mxn: Math.round(revenue),
    adr_mxn: roomNights > 0 ? Math.round(revenue / roomNights) : 0,
    revpar_mxn: capacity > 0 ? Math.round(revenue / capacity) : 0,
    reservations,
  };
}

function sourceLabel(source: string | null): string {
  const s = (source ?? '').toLowerCase();
  if (s.includes('directorio')) return 'Directorio Santiago';
  if (s.includes('walk')) return 'Walk-in (app)';
  if (s.includes('admin')) return 'Admin web';
  if (!s || s === 'web') return 'Página web';
  return source ?? 'Otro';
}

function paymentLabel(method: string | null): string {
  switch ((method ?? '').toLowerCase()) {
    case 'online': return 'Mercado Pago';
    case 'efectivo': case 'cash': return 'Efectivo';
    case 'terminal': case 'card': return 'Tarjeta (terminal)';
    case 'transferencia': case 'transfer': return 'Transferencia';
    case 'directorio': return 'Directorio (Stripe)';
    case 'pending': return 'Por cobrar';
    case '': return 'Sin registrar';
    default: return method ?? 'Otro';
  }
}

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const qp = req.nextUrl.searchParams;
  const month = /^\d{4}-\d{2}$/.test(qp.get('month') ?? '')
    ? qp.get('month')!
    : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }).slice(0, 7);

  // UNA consulta para toda la ventana (11 meses atrás → fin del mes pedido).
  const windowStart = `${shiftMonth(month, -11)}-01`;
  const { endExclusive } = monthRange(month);

  const rows = await supabaseGet<ResRow>('reservations', {
    select: 'check_in,check_out,nights,total_mxn,rooms,status,source,payment_method',
    status: 'in.(confirmed,checked_out)',
    check_in: `lt.${endExclusive}`,
    check_out: `gt.${windowStart}`,
    limit: '2000',
  });

  const overlapping = (m: string) => {
    const { start, endExclusive: end } = monthRange(m);
    return rows.filter((r) => r.check_in < end && r.check_out > start);
  };

  const current = statsFor(month, overlapping(month));
  const previous = statsFor(shiftMonth(month, -1), overlapping(shiftMonth(month, -1)));

  const series = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(month, i - 11);
    const s = statsFor(m, overlapping(m));
    return { month: m, occupancy_pct: s.occupancy_pct, revenue_mxn: s.revenue_mxn };
  });

  // Desglose del mes pedido por origen y forma de pago (ingreso prorrateado).
  const monthRows = overlapping(month);
  const { start, endExclusive: end } = monthRange(month);
  const bucket = (labelOf: (r: ResRow) => string) => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const r of monthRows) {
      const inMs = Math.max(Date.parse(r.check_in), Date.parse(start));
      const outMs = Math.min(Date.parse(r.check_out), Date.parse(end));
      const nightsInMonth = Math.max(Math.round((outMs - inMs) / 86_400_000), 0);
      if (nightsInMonth === 0) continue;
      const rev = r.nights && r.nights > 0 && r.total_mxn
        ? (r.total_mxn / r.nights) * nightsInMonth
        : 0;
      const key = labelOf(r);
      const cur = map.get(key) ?? { count: 0, revenue: 0 };
      map.set(key, { count: cur.count + 1, revenue: cur.revenue + rev });
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, reservations: v.count, revenue_mxn: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue_mxn - a.revenue_mxn);
  };

  return NextResponse.json({
    success: true,
    data: {
      current,
      previous,
      series,
      sources: bucket((r) => sourceLabel(r.source)),
      payments: bucket((r) => paymentLabel(r.payment_method)),
    },
  });
}
