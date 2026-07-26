/**
 * Precios del hotel (server-side) — misma fuente que el modal de reserva y el
 * endpoint /api/public/hotel-config: tabla `hotel_settings` (key `room_prices`).
 * Con esto el home NUNCA se desincroniza del modal. Cae a DEFAULT_PRICES si la
 * tabla no existe o Supabase no está configurado.
 */
import { unstable_cache } from 'next/cache';
import { DEFAULT_PRICES, DEFAULT_ADDONS, DEFAULT_SEASONS } from './hotel-config-defaults';
import type { RoomPrices, Season, Addon } from './pricing';
import { DEFAULT_FISCAL, type FiscalConfig } from './cfdi-hospedaje';

export type { RoomPrices };

/**
 * Etiqueta de caché de toda la config del hotel. `upsertSetting` (en
 * admin/configuracion/actions.ts) la invalida al guardar, así que un cambio de
 * precios se ve al instante en la web y en la app — no hay ventana de datos viejos.
 */
export const HOTEL_SETTINGS_TAG = 'hotel-settings';

/**
 * Techo de frescura si nadie guarda nada. `hotel_settings` cambia unas pocas
 * veces al año; leerla en cada visita del home era ~2,700 consultas por nada.
 *
 * Se usa `unstable_cache` y no `next: { revalidate }` a propósito: las páginas
 * que llaman a estas funciones declaran `dynamic = 'force-dynamic'`, que según
 * la doc de Next 16 equivale a `fetchCache = 'force-no-store'` y descarta
 * cualquier `revalidate` puesto en el `fetch`. `unstable_cache` es otra capa y
 * sí sobrevive a eso, sin cambiar en nada cómo se renderiza la página.
 */
const SETTINGS_TTL_SECONDS = 300;

export interface AccountingConfig {
  /** Correo de la contadora. Vacío = el envío mensual no se dispara. */
  email: string;
}

/**
 * Config de contabilidad desde `hotel_settings` (key `accounting`).
 * Falla cerrado a propósito: sin correo configurado, el cron mensual no manda
 * nada en vez de adivinar un destinatario.
 */
export const fetchAccountingConfig = unstable_cache(async (): Promise<AccountingConfig> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallback: AccountingConfig = { email: '' };
  if (!url || !key) return fallback;

  try {
    const res = await fetch(`${url}/rest/v1/hotel_settings?select=value&key=eq.accounting`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Cache-Control': 'no-store' },
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    const rows: { value: Partial<AccountingConfig> }[] = await res.json();
    return { email: (rows[0]?.value?.email ?? '').trim() };
  } catch {
    return fallback;
  }
}, ['hotel-settings', 'accounting'], { tags: [HOTEL_SETTINGS_TAG], revalidate: SETTINGS_TTL_SECONDS });

/**
 * Tasas fiscales (IVA / ISH / retención ISR) desde `hotel_settings` (key `fiscal`),
 * con los defaults como respaldo. Si el ISH de Nuevo León cambia, se edita en la
 * base — no se hardcodea río abajo.
 */
export const fetchFiscalConfig = unstable_cache(async (): Promise<FiscalConfig> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return DEFAULT_FISCAL;

  try {
    const res = await fetch(`${url}/rest/v1/hotel_settings?select=value&key=eq.fiscal`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Cache-Control': 'no-store' },
      cache: 'no-store',
    });
    if (!res.ok) return DEFAULT_FISCAL;
    const rows: { value: Partial<FiscalConfig> }[] = await res.json();
    return { ...DEFAULT_FISCAL, ...(rows[0]?.value ?? {}) };
  } catch {
    return DEFAULT_FISCAL;
  }
}, ['hotel-settings', 'fiscal'], { tags: [HOTEL_SETTINGS_TAG], revalidate: SETTINGS_TTL_SECONDS });

export const fetchRoomPrices = unstable_cache(async (): Promise<RoomPrices> => {
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
}, ['hotel-settings', 'room-prices'], { tags: [HOTEL_SETTINGS_TAG], revalidate: SETTINGS_TTL_SECONDS });

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
export const fetchPricingConfig = unstable_cache(async (): Promise<PricingConfig> => {
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
}, ['hotel-settings', 'pricing'], { tags: [HOTEL_SETTINGS_TAG], revalidate: SETTINGS_TTL_SECONDS });
