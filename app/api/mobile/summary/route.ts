import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

interface ReservationRow {
  id: string;
  folio: string | null;
  guest_name: string;
  guest_phone: string | null;
  room_type: string | null;
  rooms: number | null;
  check_in: string;
  check_out: string;
  nights: number | null;
  total_mxn: number | null;
  status: string;
  checkin_at: string | null;
  checkin_code: string | null;
  checkout_at: string | null;
  source: string | null;
}

/** Fecha local del hotel (America/Monterrey) en YYYY-MM-DD. */
function mtyDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
}

// GET /api/mobile/summary — pantalla Hoy: llegadas/salidas de hoy con acción
// pendiente, métricas de la semana en curso y requests abiertos.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const today = mtyDate();
  const weekEnd = mtyDate(7);

  const [arrivals, departures, weekRows, openRequests, pendingPay] = await Promise.all([
    supabaseGet<ReservationRow>('reservations', {
      select: 'id,folio,guest_name,guest_phone,room_type,rooms,check_in,check_out,nights,total_mxn,status,checkin_at,checkout_at,source,checkin_code',
      check_in: `eq.${today}`,
      status: 'in.(confirmed,pending_payment)',
      order: 'guest_name.asc',
    }),
    supabaseGet<ReservationRow>('reservations', {
      select: 'id,folio,guest_name,guest_phone,room_type,rooms,check_in,check_out,nights,total_mxn,status,checkin_at,checkout_at,source,checkin_code',
      check_out: `eq.${today}`,
      status: 'eq.confirmed',
      order: 'guest_name.asc',
    }),
    supabaseGet<{ total_mxn: number | null; check_in: string; nights: number | null }>('reservations', {
      select: 'total_mxn,check_in,nights',
      check_in: `gte.${today}`,
      and: `(check_in.lte.${weekEnd})`,
      status: 'eq.confirmed',
      limit: '200',
    }),
    supabaseGet<{ id: string }>('service_requests', {
      select: 'id',
      status: 'in.(pending,in_progress)',
      limit: '50',
    }),
    supabaseGet<{ id: string }>('reservations', {
      select: 'id',
      status: 'eq.pending_payment',
      check_in: `gte.${today}`,
      limit: '50',
    }),
  ]);

  const weekRevenue = weekRows.reduce((s, r) => s + (r.total_mxn ?? 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      today,
      arrivals,
      departures,
      week: { reservations: weekRows.length, revenue_mxn: weekRevenue },
      open_requests: openRequests.length,
      pending_payments: pendingPay.length,
    },
  });
}
