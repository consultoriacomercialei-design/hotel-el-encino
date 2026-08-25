import { supabaseGet } from '@/app/lib/supabase';
import { fetchPricingConfig } from '@/app/lib/hotel-config';
import { quoteRoom, type BreakdownItem } from '@/app/lib/pricing';

// Cotización y disponibilidad para la Reserva Exprés (b16), compartida por
// /api/mobile/reservations/quote y /create. Regla del dueño (b12): el cargo
// por adulto extra es POR HABITACIÓN (el 3er adulto de UNA habitación paga
// aunque otra vaya vacía) y los niños NO se cobran pero SÍ cuentan para el
// tope de personas por habitación. Todo sale de la config del motor
// (room_prices + seasons) — nada hardcodeado.

export interface OccupancyRoom {
  adults: number;
  children: number;
}

export interface ExpressQuote {
  nights: number;
  rooms: number;
  /** Total sugerido por el motor (base + temporadas + adultos extra). */
  total_mxn: number;
  /** Solo el cargo por adultos extra (se persiste aparte, como en b12). */
  surcharge_mxn: number;
  extra_adults: number;
  breakdown: BreakdownItem[];
  rules: { base_occupancy: number; max_occupancy: number; extra_adult: number };
}

/** Normaliza y valida la distribución por habitación. Lanza con mensaje claro. */
export function parseOccupancy(raw: unknown): OccupancyRoom[] {
  const list = Array.isArray(raw) && raw.length > 0 ? raw : [{ adults: 2, children: 0 }];
  if (list.length > 20) throw new Error('Demasiadas habitaciones');
  return list.map((o, i) => {
    const r = o as { adults?: unknown; children?: unknown };
    const adults = Math.floor(Number(r.adults));
    const children = Math.floor(Number(r.children ?? 0));
    if (!Number.isFinite(adults) || adults < 1 || adults > 20 ||
        !Number.isFinite(children) || children < 0 || children > 20) {
      throw new Error(`Personas inválidas en la habitación ${i + 1}`);
    }
    return { adults, children };
  });
}

/**
 * Cotiza la estancia HABITACIÓN POR HABITACIÓN con el motor real
 * (weekday/weekend/temporadas) + adulto extra por cuarto.
 */
export async function quoteExpress(input: {
  checkIn: string;
  checkOut: string;
  occupancy: OccupancyRoom[];
}): Promise<ExpressQuote> {
  const { prices, seasons } = await fetchPricingConfig();
  const baseOcc = Math.max(1, prices.base_occupancy ?? 2);
  const maxOcc = Math.max(baseOcc, prices.max_occupancy ?? 4);
  const extraRate = Math.max(0, prices.extra_adult ?? 0);

  // Tope POR habitación: niños cuentan para el máximo, no para el cobro.
  const over = input.occupancy.findIndex((o) => o.adults + o.children > maxOcc);
  if (over >= 0) {
    const o = input.occupancy[over];
    throw new Error(
      `La habitación ${over + 1} tiene ${o.adults + o.children} personas (máx. ${maxOcc} por habitación)`
    );
  }

  let nights = 0;
  let baseTotal = 0;
  let extraAdults = 0;
  const baseAgg: Record<string, BreakdownItem> = {};

  for (const room of input.occupancy) {
    // Cada llamada cotiza UNA habitación (su gente cabe en una, ya validado).
    const q = quoteRoom({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: Math.min(room.adults, baseOcc), // el extra se calcula aquí, por cuarto
      children: 0,
      prices,
      seasons,
    });
    if (!q.valid) throw new Error('Fechas inválidas');
    nights = q.nights;
    baseTotal += q.total;
    extraAdults += Math.max(0, room.adults - baseOcc);
    for (const b of q.breakdown) {
      const agg = baseAgg[b.label] ?? { label: b.label, amount: 0 };
      agg.amount += b.amount;
      baseAgg[b.label] = agg;
    }
  }

  const surcharge = extraAdults * extraRate * nights;
  const breakdown = Object.values(baseAgg).filter((b) => b.amount > 0);
  if (surcharge > 0) {
    breakdown.push({
      label: `Adulto extra · ${extraAdults} × ${nights} noche${nights === 1 ? '' : 's'}`,
      amount: surcharge,
    });
  }

  return {
    nights,
    rooms: input.occupancy.length,
    total_mxn: Math.round(baseTotal + surcharge),
    surcharge_mxn: surcharge,
    extra_adults: extraAdults,
    breakdown,
    rules: { base_occupancy: baseOcc, max_occupancy: maxOcc, extra_adult: extraRate },
  };
}

export interface RoomAvailability {
  totalRooms: number;
  occupiedCount: number;
  /** Cuartos físicos tomados (asignados o con check-in) en el rango. */
  taken: Set<string>;
  /** Cuartos físicos libres, en el orden de la lista del hotel. */
  freeRooms: string[];
}

/** Disponibilidad real en el rango: aforo + cuartos físicos tomados. */
export async function roomAvailability(input: {
  checkIn: string;
  checkOut: string;
  excludeId?: string;
}): Promise<RoomAvailability> {
  const roomList = await supabaseGet<{ room: string }>('hotel_rooms_state', {
    select: 'room',
    limit: '50',
  }).catch(() => [] as { room: string }[]);
  const totalRooms = Math.max(roomList.length, 1);

  const filters: Record<string, string> = {
    select: 'id,room,rooms,assigned_rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `lt.${input.checkOut}`,
    check_out: `gt.${input.checkIn}`,
    limit: '50',
  };
  if (input.excludeId) filters.id = `neq.${input.excludeId}`;
  const overlapping = await supabaseGet<{
    id: string; room: string | null; rooms: number | null; assigned_rooms: string[] | null;
  }>('reservations', filters);

  const taken = new Set<string>();
  let occupiedCount = 0;
  for (const o of overlapping) {
    occupiedCount += Math.max(o.rooms ?? 1, 1);
    if (o.room) taken.add(o.room);
    if (Array.isArray(o.assigned_rooms)) for (const a of o.assigned_rooms) taken.add(a);
  }

  return {
    totalRooms,
    occupiedCount,
    taken,
    freeRooms: roomList.map((r) => r.room).filter((r) => !taken.has(r)),
  };
}
