/**
 * GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&room_type=doble[&rooms=N]
 *
 * Devuelve disponibilidad considerando el número de habitaciones solicitadas.
 * `available_rooms` es cuántas quedan libres en el rango — útil para mostrar
 * "Quedan 2 habitaciones" en la UI o marcar como insuficiente si rooms > available_rooms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { isValidDate } from '@/app/lib/sanitize';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Inventario total por tipo. Hoy hardcoded; el roadmap (R3) lo mueve a hotel_settings.
const ROOM_CAPACITY: Record<string, number> = {
  suite: 1,
  doble: 3,
  grupal: 1,
};

// pending_payment reservations expire after 45 min (cron runs daily).
// We only count them as blocking for 20 min so that an abandoned MP checkout
// stops blocking new bookings well before the daily cron fires.
const PENDING_PAYMENT_BLOCK_MINUTES = 20;

const ALLOWED_ROOM_TYPES = ['doble'];

async function getConflictingRooms(
  check_in: string,
  check_out: string,
  room_type: string
): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return 0;

  const dateFilter = new URLSearchParams({
    room_type: `eq.${room_type}`,
    check_in:  `lt.${check_out}`,
    check_out: `gt.${check_in}`,
    select:    'rooms',
  });

  // 1) Confirmed/pending reservations always block
  const confirmedParams = `${dateFilter}&status=in.(pending,confirmed)`;

  // 2) pending_payment only blocks if created within the last 20 min
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_BLOCK_MINUTES * 60 * 1000).toISOString();
  const ppParams = `${dateFilter}&status=eq.pending_payment&created_at=gt.${cutoff}`;

  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  const [r1, r2] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/reservations?${confirmedParams}`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/reservations?${ppParams}`,        { headers }),
  ]);

  const sum = (res: Response, data: { rooms: number }[]) =>
    res.ok ? data.reduce((s, r) => s + (r.rooms ?? 1), 0) : 0;

  const [d1, d2]: [{ rooms: number }[], { rooms: number }[]] = await Promise.all([
    r1.ok ? r1.json() : Promise.resolve([]),
    r2.ok ? r2.json() : Promise.resolve([]),
  ]);

  return sum(r1, d1) + sum(r2, d2);
}

export async function GET(req: NextRequest) {
  // Rate limit: 60 consultas por minuto por IP
  if (!limiters.availability(getClientIP(req))) {
    return tooManyRequests();
  }

  const { searchParams } = new URL(req.url);
  const check_in  = searchParams.get('check_in')  ?? '';
  const check_out = searchParams.get('check_out') ?? '';
  const room_type = searchParams.get('room_type') ?? '';
  const roomsParam = searchParams.get('rooms');

  if (!check_in || !check_out || !room_type) {
    return NextResponse.json(
      { error: 'Parámetros requeridos: check_in, check_out, room_type' },
      { status: 400 }
    );
  }

  // Whitelist room type
  if (!ALLOWED_ROOM_TYPES.includes(room_type)) {
    return NextResponse.json({ error: 'room_type inválido' }, { status: 400 });
  }

  // Validate date format
  if (!isValidDate(check_in) || !isValidDate(check_out)) {
    return NextResponse.json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' }, { status: 400 });
  }

  if (new Date(check_in) >= new Date(check_out)) {
    return NextResponse.json({ error: 'check_out debe ser posterior a check_in' }, { status: 400 });
  }

  // Cuántas habitaciones está pidiendo el cliente. Default 1.
  const capacity = ROOM_CAPACITY[room_type] ?? 1;
  const requested_rooms = Math.max(1, Math.min(capacity, parseInt(roomsParam ?? '1', 10) || 1));

  const conflicts = await getConflictingRooms(check_in, check_out, room_type);
  const available_rooms = Math.max(0, capacity - conflicts);
  const available = available_rooms >= requested_rooms;

  return NextResponse.json({
    available,
    waitlist_available: !available,
    available_rooms,
    requested_rooms,
    room_type,
    check_in,
    check_out,
    conflicts,
    capacity,
    supabase_connected: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
