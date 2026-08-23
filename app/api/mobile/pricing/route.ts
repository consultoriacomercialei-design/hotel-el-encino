import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePost } from '@/app/lib/supabase';
import { HOTEL_SETTINGS_TAG } from '@/app/lib/hotel-config';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SettingRow { key: string; value: unknown }

async function readSetting<T>(key: string): Promise<T | null> {
  const rows = await supabaseGet<SettingRow>('hotel_settings', {
    select: 'key,value',
    key: `eq.${key}`,
    limit: '1',
  });
  return (rows[0]?.value as T) ?? null;
}

async function writeSetting(key: string, value: unknown): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  // upsert por key (misma semántica que el admin web)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}

// GET /api/mobile/pricing — tarifas base + temporadas para la app.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const [prices, seasons] = await Promise.all([
    readSetting<Record<string, number>>('room_prices'),
    readSetting<unknown[]>('seasons'),
  ]);
  return NextResponse.json({ success: true, data: { prices: prices ?? {}, seasons: seasons ?? [] } });
}

// PATCH /api/mobile/pricing — {prices?, seasons?}: escribe y revalida caché.
export async function PATCH(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    prices?: Record<string, number>;
    seasons?: unknown[];
  };

  if (body.prices) {
    const clean = Object.fromEntries(
      Object.entries(body.prices).filter(
        ([, v]) => typeof v === 'number' && v >= 0 && v <= 100_000
      )
    );
    const current = (await readSetting<Record<string, number>>('room_prices')) ?? {};
    if (!(await writeSetting('room_prices', { ...current, ...clean }))) {
      return NextResponse.json({ success: false, error: 'No se pudo guardar tarifas' }, { status: 500 });
    }
  }
  if (body.seasons) {
    if (!Array.isArray(body.seasons) || body.seasons.length > 50) {
      return NextResponse.json({ success: false, error: 'Temporadas inválidas' }, { status: 400 });
    }
    if (!(await writeSetting('seasons', body.seasons))) {
      return NextResponse.json({ success: false, error: 'No se pudo guardar temporadas' }, { status: 500 });
    }
  }
  revalidateTag(HOTEL_SETTINGS_TAG, { expire: 0 });
  return NextResponse.json({ success: true, data: { saved: true } });
}

void supabasePost;
