import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { parseOccupancy, quoteExpress, roomAvailability } from '@/app/lib/express-quote';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/quote — b16: cotización viva de la Reserva
// Exprés. {check_in, check_out, occupancy:[{adults,children}]} → total del
// motor real (weekday/weekend/temporadas + adulto extra POR habitación),
// desglose, reglas de ocupación y cuartos físicos libres en esas fechas.
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    check_in?: string; check_out?: string; occupancy?: unknown;
  };
  const checkIn = b.check_in ?? '';
  const checkOut = b.check_out ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ success: false, error: 'Fechas inválidas' }, { status: 400 });
  }

  try {
    const occupancy = parseOccupancy(b.occupancy);
    const [quote, availability] = await Promise.all([
      quoteExpress({ checkIn, checkOut, occupancy }),
      roomAvailability({ checkIn, checkOut }),
    ]);
    const roomsLeft = Math.max(availability.totalRooms - availability.occupiedCount, 0);
    return NextResponse.json({
      success: true,
      data: {
        ...quote,
        rooms_left: roomsLeft,
        fits: occupancy.length <= roomsLeft,
        free_rooms: availability.freeRooms,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo cotizar';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
