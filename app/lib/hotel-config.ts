/**
 * Precios del hotel (server-side) — misma fuente que el modal de reserva y el
 * endpoint /api/public/hotel-config: tabla `hotel_settings` (key `room_prices`).
 * Con esto el home NUNCA se desincroniza del modal. Cae a DEFAULT_PRICES si la
 * tabla no existe o Supabase no está configurado.
 */
import { DEFAULT_PRICES } from './hotel-config-defaults';

export type RoomPrices = typeof DEFAULT_PRICES;

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
