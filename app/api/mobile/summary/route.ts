import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { paidSumsFor } from '@/app/lib/payments';

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
  paid_at: string | null;
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

  const [arrivals, departures, weekRows, openRequests, pendingPay, roomStates, createdToday] = await Promise.all([
    supabaseGet<ReservationRow>('reservations', {
      select: 'id,folio,guest_name,guest_phone,guest_email,room_type,rooms,adults,children,room,assigned_rooms,check_in,check_out,nights,total_mxn,occupancy,status,checkin_at,checkout_at,source,paid_at,checkin_code,notes,late_checkout_until,damage_consent_at,id_photo_path,signature_path',
      check_in: `eq.${today}`,
      status: 'in.(confirmed,pending_payment)',
      order: 'guest_name.asc',
    }),
    supabaseGet<ReservationRow>('reservations', {
      select: 'id,folio,guest_name,guest_phone,guest_email,room_type,rooms,adults,children,room,assigned_rooms,check_in,check_out,nights,total_mxn,occupancy,status,checkin_at,checkout_at,source,paid_at,checkin_code,notes,late_checkout_until,damage_consent_at,id_photo_path,signature_path',
      check_out: `eq.${today}`,
      status: 'in.(confirmed,checked_out)',
      order: 'guest_name.asc',
    }),
    supabaseGet<{ total_mxn: number | null; check_in: string; nights: number | null }>('reservations', {
      select: 'total_mxn,check_in,nights',
      check_in: `gte.${today}`,
      and: `(check_in.lte.${weekEnd})`,
      status: 'in.(confirmed,checked_out)',
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
    // b10: cuartos por limpiar — tarjeta clickeable en Hoy.
    supabaseGet<{ room: string; state: string }>('hotel_rooms_state', {
      select: 'room,state',
      limit: '50',
    }).catch(() => [] as { room: string; state: string }[]),
    // b13: reservas CREADAS hoy (para cualquier fecha) — "¿qué pasó HOY?".
    // Medianoche de Monterrey = 06:00 UTC (NL sin horario de verano desde 2022).
    supabaseGet<ReservationRow>('reservations', {
      select: 'id,folio,guest_name,guest_phone,guest_email,room_type,rooms,adults,children,room,assigned_rooms,check_in,check_out,nights,total_mxn,occupancy,status,checkin_at,checkout_at,source,paid_at,checkin_code,notes,late_checkout_until,damage_consent_at,id_photo_path,signature_path',
      created_at: `gte.${today}T06:00:00Z`,
      order: 'created_at.desc',
      limit: '30',
    }).catch(() => [] as ReservationRow[]),
  ]);

  // Ocupación de ESTA noche (b9, widget): cuartos con reserva viva que cubre hoy.
  const tonight = await supabaseGet<{ rooms: number | null }>('reservations', {
    select: 'rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `lte.${today}`,
    check_out: `gt.${today}`,
    limit: '50',
  }).catch(() => [] as { rooms: number | null }[]);
  const occupied = tonight.reduce((s, r) => s + Math.max(r.rooms ?? 1, 1), 0);
  // Aforo = cuartos registrados en la app (cero hardcode); 3 solo como red de
  // seguridad si la lista viniera vacía.
  const totalRooms = Math.max(roomStates.length, 3);
  const occupancyPct = Math.min(100, Math.round((occupied / totalRooms) * 100));

  const weekRevenue = weekRows.reduce((s, r) => s + (r.total_mxn ?? 0), 0);

  // b11: estado de cuenta por reserva (suma de pagos aprobados, MP + manuales).
  const paidMap = await paidSumsFor(
    [...arrivals, ...departures, ...createdToday].map((r) => ({ id: r.id, total_mxn: r.total_mxn, paid_at: r.paid_at }))
  );
  const withPaid = (r: ReservationRow) => ({ ...r, paid_mxn: paidMap[r.id] ?? 0 });

  return NextResponse.json({
    success: true,
    data: {
      today,
      arrivals: arrivals.map(withPaid),
      departures: departures.map(withPaid),
      created_today: createdToday.map(withPaid),
      week: { reservations: weekRows.length, revenue_mxn: weekRevenue },
      open_requests: openRequests.length,
      pending_payments: pendingPay.length,
      occupancy_pct: occupancyPct,
      rooms_to_clean: roomStates.filter((r) => r.state === 'dirty').map((r) => r.room),
    },
  });
}
