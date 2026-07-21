/**
 * Motor de precios del Hotel El Encino — FUENTE ÚNICA DE VERDAD.
 *
 * Función pura, sin I/O: la usan el modal de reserva (cliente), el alta manual
 * del admin y el servidor (recálculo al crear reserva y al cobrar). Toda la
 * configuración (tarifas, ocupación, temporadas) llega como argumento; nada
 * está hardcodeado aquí — las temporadas se editan desde /admin/configuracion.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface RoomPrices {
  weekday: number;
  weekend: number;
  extra_adult: number;
  /** Adultos incluidos en la tarifa base, por habitación. */
  base_occupancy: number;
  /** Tope de personas por habitación (más → se asigna otra habitación). */
  max_occupancy: number;
  /** @deprecated migrado a `seasons`; se conserva como dato (lo usa la home para "Desde $X"). */
  special_extra: number;
  /** @deprecated migrado a `seasons`; se conserva como dato (lo usa la home para "Desde $X"). */
  semana_santa: number;
}

export interface SeasonRange {
  from: string; // YYYY-MM-DD (inclusive)
  to: string;   // YYYY-MM-DD (inclusive)
}

export interface Season {
  id: string;
  label: string;
  active: boolean;
  /** 'flat' = tarifa plana por noche/hab (anula weekday/weekend). 'surcharge' = +monto sobre la base. */
  type: 'flat' | 'surcharge';
  amount: number;
  ranges: SeasonRange[];
}

export interface Addon {
  id: string;
  icon?: string;
  title: string;
  subtitle?: string;
  unitPrice: number;
  perNight: boolean;
  perPerson?: boolean; // se multiplica por número de adultos
  active?: boolean;
}

export interface BreakdownItem {
  label: string;
  amount: number;
}

export interface AddonItem {
  id: string;
  label: string;
  amount: number;
}

export interface RoomQuote {
  valid: boolean;
  nights: number;
  rooms: number;
  extraAdults: number;
  total: number; // solo habitación (sin add-ons)
  breakdown: BreakdownItem[];
  special: string | null; // etiqueta de la primera temporada activa que aplica
  autoRoomNote: string | null;
}

export interface ReservationQuote extends RoomQuote {
  roomTotal: number;
  addonsTotal: number;
  addonItems: AddonItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Viernes(5), sábado(6) y domingo(0) cuentan como fin de semana. */
export function isWeekend(d: Date): boolean {
  const n = d.getDay();
  return n === 0 || n === 5 || n === 6;
}

/** Fecha ISO (YYYY-MM-DD) de un Date parseado a mediodía local. */
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Temporada que aplica a una fecha. Una temporada `flat` activa tiene prioridad
 * (anula la base); si no hay flat, aplica la primera `surcharge` activa en orden
 * de la lista. Devuelve null si ninguna temporada activa cubre la fecha.
 */
export function seasonForDate(iso: string, seasons: Season[]): Season | null {
  const matching = seasons.filter(
    s => s.active && Array.isArray(s.ranges) && s.ranges.some(r => iso >= r.from && iso <= r.to),
  );
  if (matching.length === 0) return null;
  return matching.find(s => s.type === 'flat') ?? matching[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cotización de habitación
// ─────────────────────────────────────────────────────────────────────────────

export function quoteRoom(input: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  prices: RoomPrices;
  seasons?: Season[];
}): RoomQuote {
  const { checkIn, checkOut, adults, children, prices } = input;
  const seasons = input.seasons ?? [];
  const nil: RoomQuote = {
    valid: false, nights: 0, rooms: 1, extraAdults: 0,
    total: 0, breakdown: [], special: null, autoRoomNote: null,
  };
  if (!checkIn || !checkOut) return nil;

  const start = new Date(checkIn + 'T12:00:00');
  const end = new Date(checkOut + 'T12:00:00');
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (nights <= 0) return nil;

  const baseOcc = Math.max(1, prices.base_occupancy ?? 2);
  const maxOcc = Math.max(baseOcc, prices.max_occupancy ?? 4);
  const PEA = Math.max(0, prices.extra_adult ?? 0);

  const totalPeople = adults + children;
  const rooms = Math.max(1, Math.ceil(totalPeople / maxOcc));
  // Cargo por adulto por encima de la ocupación incluida (todos los extra, sin tope por habitación).
  const extraAdults = Math.max(0, adults - baseOcc * rooms);

  let grandTotal = 0;
  let weekdayNights = 0;
  let weekendNights = 0;
  let firstSpecial: string | null = null;
  // Agrupa noches por temporada para el desglose.
  const seasonAgg: Record<string, { label: string; type: 'flat' | 'surcharge'; amount: number; nights: number }> = {};

  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = isoOf(d);
    const season = seasonForDate(iso, seasons);
    if (season && !firstSpecial) firstSpecial = season.label;

    if (season?.type === 'flat') {
      grandTotal += season.amount * rooms;
    } else {
      const base = isWeekend(d) ? prices.weekend : prices.weekday;
      const surcharge = season?.type === 'surcharge' ? season.amount : 0;
      grandTotal += (base + surcharge) * rooms;
      isWeekend(d) ? weekendNights++ : weekdayNights++;
    }

    if (season) {
      const agg = seasonAgg[season.id] ?? { label: season.label, type: season.type, amount: season.amount, nights: 0 };
      agg.nights += 1;
      seasonAgg[season.id] = agg;
    }
  }

  // Cargo por adulto extra: por noche.
  grandTotal += extraAdults * PEA * nights;

  // Desglose para la UI.
  const breakdown: BreakdownItem[] = [];
  if (rooms > 1) breakdown.push({ label: `${rooms} habitaciones`, amount: 0 });
  for (const id in seasonAgg) {
    const s = seasonAgg[id];
    if (s.type === 'flat') {
      breakdown.push({ label: `${s.nights} noche${s.nights > 1 ? 's' : ''} ${s.label}`, amount: s.amount * rooms * s.nights });
    }
  }
  if (weekdayNights) breakdown.push({ label: `${weekdayNights} noche${weekdayNights > 1 ? 's' : ''} entre semana`, amount: prices.weekday * rooms * weekdayNights });
  if (weekendNights) breakdown.push({ label: `${weekendNights} noche${weekendNights > 1 ? 's' : ''} fin de semana`, amount: prices.weekend * rooms * weekendNights });
  for (const id in seasonAgg) {
    const s = seasonAgg[id];
    if (s.type === 'surcharge') {
      breakdown.push({ label: `Temporada ${s.label} (+$${s.amount.toLocaleString('es-MX')}/hab.)`, amount: s.amount * rooms * s.nights });
    }
  }
  if (extraAdults > 0) {
    breakdown.push({ label: `Adulto extra · ${extraAdults} × ${nights} noche${nights > 1 ? 's' : ''}`, amount: extraAdults * PEA * nights });
  }

  const autoRoomNote = rooms > 1 ? `Se asignan automáticamente ${rooms} habitaciones para ${totalPeople} personas` : null;

  return { valid: true, nights, rooms, extraAdults, total: grandTotal, breakdown, special: firstSpecial, autoRoomNote };
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-ons
// ─────────────────────────────────────────────────────────────────────────────

/** Precio total de UN add-on según noches y adultos. */
export function addonUnitTotal(a: Addon, nights: number, adults: number): number {
  const n = Math.max(nights, 1);
  if (a.perPerson) return a.unitPrice * adults * (a.perNight ? n : 1);
  return a.perNight ? a.unitPrice * n : a.unitPrice;
}

export function quoteAddons(
  selectedIds: string[],
  addons: Addon[],
  nights: number,
  adults: number,
): { total: number; items: AddonItem[] } {
  const active = addons.filter(a => a.active !== false);
  const chosen = active.filter(a => selectedIds.includes(a.id));
  const items: AddonItem[] = chosen.map(a => ({ id: a.id, label: a.title, amount: addonUnitTotal(a, nights, adults) }));
  const total = items.reduce((sum, it) => sum + it.amount, 0);
  return { total, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cotización completa (habitación + add-ons)
// ─────────────────────────────────────────────────────────────────────────────

export function quoteReservation(input: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  prices: RoomPrices;
  seasons?: Season[];
  addons?: Addon[];
  selectedAddonIds?: string[];
}): ReservationQuote {
  const room = quoteRoom(input);
  const addonsRes = quoteAddons(input.selectedAddonIds ?? [], input.addons ?? [], room.nights, input.adults);
  return {
    ...room,
    roomTotal: room.total,
    addonsTotal: addonsRes.total,
    addonItems: addonsRes.items,
    total: room.total + addonsRes.total,
  };
}
