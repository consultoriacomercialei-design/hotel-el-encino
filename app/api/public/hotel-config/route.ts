/**
 * GET /api/public/hotel-config
 * Returns room prices and add-ons from hotel_settings table.
 * Falls back to hardcoded defaults if the table doesn't exist yet.
 * Cached 5 min on CDN, stale-while-revalidate 1 min.
 */
import { NextResponse } from 'next/server';
import { DEFAULT_PRICES, DEFAULT_ADDONS, DEFAULT_SEASONS } from '@/app/lib/hotel-config-defaults';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ prices: DEFAULT_PRICES, addons: DEFAULT_ADDONS, seasons: DEFAULT_SEASONS });
  }

  try {
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

    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    const rows: { key: string; value: unknown }[] = await res.json();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

    return NextResponse.json(
      {
        prices:  (map.room_prices as typeof DEFAULT_PRICES)  ?? DEFAULT_PRICES,
        addons:  (map.addons      as typeof DEFAULT_ADDONS)  ?? DEFAULT_ADDONS,
        seasons: (map.seasons     as typeof DEFAULT_SEASONS) ?? DEFAULT_SEASONS,
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
    );
  } catch {
    return NextResponse.json({ prices: DEFAULT_PRICES, addons: DEFAULT_ADDONS, seasons: DEFAULT_SEASONS });
  }
}
