import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { fetchRoomPrices } from '@/app/lib/hotel-config';

export const dynamic = 'force-dynamic';

interface LineItem { amount_mxn?: number }

// PATCH /api/mobile/reservations/[id]/occupancy — b12: editar habitaciones y
// personas SIN tocar fechas. Reglas 100% de configuración (cero hardcode):
//  - `room_prices` (admin): extra_adult ($/noche), base_occupancy (adultos
//    incluidos por habitación) y max_occupancy (tope de personas por hab).
//  - Aforo total = cuartos registrados en hotel_rooms_state (la lista de
//    cuartos que el hotel administra desde la app).
// La tarifa base por habitación/noche se PRESERVA (precios negociados
// intactos): el cargo por adultos extra vive aparte en occupancy_surcharge_mxn.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    adults?: number; children?: number; rooms?: number;
  };
  const adults = Math.floor(Number(body.adults));
  const children = Math.floor(Number(body.children ?? 0));
  const rooms = Math.floor(Number(body.rooms));
  if (!Number.isFinite(adults) || adults < 1 || adults > 50 ||
      !Number.isFinite(children) || children < 0 || children > 50 ||
      !Number.isFinite(rooms) || rooms < 1 || rooms > 20) {
    return NextResponse.json({ success: false, error: 'Personas/habitaciones inválidas' }, { status: 400 });
  }

  const rows = await supabaseGet<{
    id: string; folio: string | null; status: string; room: string | null;
    check_in: string; check_out: string; nights: number | null;
    rooms: number | null; total_mxn: number | null;
    occupancy_surcharge_mxn: number | null; line_items: LineItem[] | null;
  }>('reservations', {
    select: 'id,folio,status,room,check_in,check_out,nights,rooms,total_mxn,occupancy_surcharge_mxn,line_items',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (!['confirmed', 'pending_payment'].includes(r.status)) {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  // Reglas de ocupación desde la configuración del admin.
  const prices = await fetchRoomPrices();
  const baseOcc = Math.max(1, prices.base_occupancy ?? 2);
  const maxOcc = Math.max(baseOcc, prices.max_occupancy ?? 4);
  const extraRate = Math.max(0, prices.extra_adult ?? 0);

  const people = adults + children;
  if (people > maxOcc * rooms) {
    const needed = Math.ceil(people / maxOcc);
    return NextResponse.json(
      { success: false, error: `${people} personas no caben en ${rooms} habitación(es) (máx. ${maxOcc} por habitación). Necesitas ${needed}.` },
      { status: 400 }
    );
  }

  // Aforo del hotel = cuartos registrados (fuente: la lista de la app).
  const roomList = await supabaseGet<{ room: string }>('hotel_rooms_state', {
    select: 'room',
    limit: '50',
  }).catch(() => [] as { room: string }[]);
  const totalRooms = Math.max(roomList.length, 1);
  const overlapping = await supabaseGet<{ id: string; rooms: number | null }>('reservations', {
    select: 'id,rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `lt.${r.check_out}`,
    check_out: `gt.${r.check_in}`,
    id: `neq.${id}`,
    limit: '50',
  });
  const occupied = overlapping.reduce((s, o) => s + Math.max(o.rooms ?? 1, 1), 0);
  if (occupied + rooms > totalRooms) {
    return NextResponse.json(
      { success: false, error: `Solo quedan ${Math.max(totalRooms - occupied, 0)} habitación(es) libres en esas fechas` },
      { status: 409 }
    );
  }

  // Recalcular preservando la tarifa base por habitación/noche.
  const nights = r.nights && r.nights > 0 ? r.nights : 1;
  const oldRooms = Math.max(r.rooms ?? 1, 1);
  const extras = (Array.isArray(r.line_items) ? r.line_items : [])
    .reduce((s, li) => s + (typeof li.amount_mxn === 'number' ? li.amount_mxn : 0), 0);
  const oldSurcharge = r.occupancy_surcharge_mxn ?? 0;
  const base = Math.max((r.total_mxn ?? 0) - oldSurcharge - extras, 0);
  const nightlyPerRoom = base / (oldRooms * nights);

  const extraAdults = Math.max(0, adults - baseOcc * rooms);
  const newSurcharge = extraAdults * extraRate * nights;
  const newTotal = Math.round(nightlyPerRoom * rooms * nights + newSurcharge + extras);

  const ok = await supabasePatch('reservations', id, {
    adults,
    children,
    rooms,
    occupancy_surcharge_mxn: newSurcharge,
    total_mxn: newTotal,
    edited_at: new Date().toISOString(),
    edited_by: staff.full_name,
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: {
      adults,
      children,
      rooms,
      extra_adults: extraAdults,
      extra_adult_rate: extraRate,
      surcharge_mxn: newSurcharge,
      nightly_room_mxn: Math.round(nightlyPerRoom),
      total_mxn: newTotal,
    },
  });
}
