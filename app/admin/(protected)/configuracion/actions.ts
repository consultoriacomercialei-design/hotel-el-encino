'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { findAndDeleteCalendarEventsByFolio } from '@/app/lib/google-calendar';
import type { Season } from '@/app/lib/pricing';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) throw new Error('No autorizado');
}

async function upsertSetting(key: string, value: unknown) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase no configurado');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);
}

/**
 * Busca eventos en Google Calendar que contengan el texto dado.
 * Devuelve la lista para que el usuario elija cuál borrar.
 */
export async function searchCalendarEventsAction(
  query: string,
): Promise<{ ok: boolean; events: { id: string; summary: string; start: string; end: string; description?: string }[]; error?: string }> {
  await requireAuth();
  const q = query.trim();
  if (!q) return { ok: false, events: [], error: 'Escribe un folio o nombre para buscar' };

  const { getGoogleAccessToken } = await import('@/app/lib/google-calendar');
  const CALENDAR_ID = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return { ok: false, events: [], error: 'No se pudo conectar con Google Calendar (verifica GOOGLE_SERVICE_ACCOUNT_JSON)' };

  try {
    const params = new URLSearchParams({
      q,
      maxResults:   '20',
      singleEvents: 'true',
      timeMin:      new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString(),
      timeMax:      new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString(),
    });
    const calId = encodeURIComponent(CALENDAR_ID);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, events: [], error: `Google Calendar error: ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    const items = (data.items ?? []) as { id: string; summary?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string }; description?: string }[];
    const events = items.map(ev => ({
      id:          ev.id,
      summary:     ev.summary ?? '(sin título)',
      start:       ev.start?.date ?? ev.start?.dateTime?.slice(0, 10) ?? '',
      end:         ev.end?.date ?? ev.end?.dateTime?.slice(0, 10) ?? '',
      description: ev.description,
    }));
    return { ok: true, events };
  } catch (err) {
    return { ok: false, events: [], error: String(err) };
  }
}

/**
 * Elimina un evento específico de Google Calendar por su ID.
 */
export async function deleteCalendarEventByIdAction(
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const { deleteCalendarEvent } = await import('@/app/lib/google-calendar');
  try {
    const ok = await deleteCalendarEvent(eventId);
    return ok ? { ok: true } : { ok: false, error: 'No se pudo eliminar el evento' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function savePricesAction(prices: {
  weekday: number;
  weekend: number;
  extra_adult: number;
  base_occupancy: number;
  max_occupancy: number;
  special_extra?: number;
  semana_santa?: number;
}) {
  await requireAuth();
  await upsertSetting('room_prices', prices);
  return { ok: true };
}

export async function saveSeasonsAction(seasons: Season[]) {
  await requireAuth();
  await upsertSetting('seasons', seasons);
  return { ok: true };
}

export async function saveAddonsAction(addons: Array<{
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  unitPrice: number;
  perNight: boolean;
  perPerson?: boolean;
  active: boolean;
}>) {
  await requireAuth();
  await upsertSetting('addons', addons);
  return { ok: true };
}

export async function loadSettingsAction(): Promise<{
  prices: { weekday: number; weekend: number; extra_adult: number; base_occupancy: number; max_occupancy: number; special_extra?: number; semana_santa?: number };
  addons: Array<{ id: string; icon: string; title: string; subtitle: string; unitPrice: number; perNight: boolean; perPerson?: boolean; active: boolean }>;
  seasons: Season[];
}> {
  const { DEFAULT_PRICES, DEFAULT_ADDONS, DEFAULT_SEASONS } = await import('@/app/lib/hotel-config-defaults');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { prices: DEFAULT_PRICES, addons: DEFAULT_ADDONS, seasons: DEFAULT_SEASONS };
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/hotel_settings?select=key,value&key=in.(room_prices,addons,seasons)`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Cache-Control': 'no-store',
      },
    }
  );

  if (!res.ok) return { prices: DEFAULT_PRICES, addons: DEFAULT_ADDONS, seasons: DEFAULT_SEASONS };

  const rows: { key: string; value: unknown }[] = await res.json();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return {
    prices:  { ...DEFAULT_PRICES, ...((map.room_prices as Partial<typeof DEFAULT_PRICES>) ?? {}) },
    addons:  (map.addons  as typeof DEFAULT_ADDONS)  ?? DEFAULT_ADDONS,
    seasons: (map.seasons as Season[])               ?? DEFAULT_SEASONS,
  };
}
