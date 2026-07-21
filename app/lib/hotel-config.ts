/**
 * Precios del hotel (server-side) — misma fuente que el modal de reserva y el
 * endpoint /api/public/hotel-config: tabla `hotel_settings` (key `room_prices`).
 * Con esto el home NUNCA se desincroniza del modal. Cae a DEFAULT_PRICES si la
 * tabla no existe o Supabase no está configurado.
 */
import { DEFAULT_PRICES, DEFAULT_ADDONS, DEFAULT_SEASONS } from './hotel-config-defaults';
import type { RoomPrices, Season, Addon } from './pricing';

export type { RoomPrices };

export async function fetchRoomPrices(): Promise<RoomPrices> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return DEFAULT_PRICES;

  try {
    const res = await fetch(
      `${url}/rest/v1/hotel_settings?select=key,value&key=eq.room_prices`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Cache-Control': 'no-store' },
        cache: 'no-store',
      }
    );
    if (!res.ok) return DEFAULT_PRICES;
    const rows: { key: string; value: unknown }[] = await res.json();
    const row = rows.find(r => r.key === 'room_prices');
    return { ...DEFAULT_PRICES, ...((row?.value as Partial<RoomPrices>) ?? {}) };
  } catch {
    return DEFAULT_PRICES;
  }
}

export interface PricingConfig {
  prices: RoomPrices;
  seasons: Season[];
  addons: Addon[];
}

/**
 * Config completa de precios (tarifas + ocupación + temporadas + add-ons) en una
 * sola lectura. La usa el servidor para recalcular el total real de una reserva.
 * Cae a los defaults si Supabase no está disponible o falta alguna key.
 */
export async function fetchPricingConfig(): Promise<PricingConfig> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallback: PricingConfig = { prices: DEFAULT_PRICES, seasons: DEFAULT_SEASONS, addons: DEFAULT_ADDONS };
  if (!url || !key) return fallback;

  try {
    const res = await fetch(
      `${url}/rest/v1/hotel_settings?select=key,value&key=in.(room_prices,addons,seasons)`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Cache-Control': 'no-store' },
        cache: 'no-store',
      }
    );
    if (!res.ok) return fallback;
    const rows: { key: string; value: unknown }[] = await res.json();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return {
      prices: { ...DEFAULT_PRICES, ...((map.room_prices as Partial<RoomPrices>) ?? {}) },
      seasons: (map.seasons as Season[]) ?? DEFAULT_SEASONS,
      addons: (map.addons as Addon[]) ?? DEFAULT_ADDONS,
    };
  } catch {
    return fallback;
  }
}
