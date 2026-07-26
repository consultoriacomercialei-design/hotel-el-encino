/**
 * GET /api/public/hotel-config
 * Returns room prices and add-ons from hotel_settings table.
 * Falls back to hardcoded defaults if the table doesn't exist yet.
 * Cached 5 min on CDN, stale-while-revalidate 1 min.
 */
import { NextResponse } from 'next/server';
import { fetchPricingConfig } from '@/app/lib/hotel-config';

export async function GET() {
  // Reusa `fetchPricingConfig`, que ya hace exactamente esta consulta con el
  // mismo merge contra los defaults y ahora está cacheada con la etiqueta
  // `hotel-settings`. Antes eran dos rutas paralelas al mismo dato: cada fallo
  // de caché del CDN golpeaba Supabase de nuevo. La respuesta es idéntica.
  const { prices, addons, seasons } = await fetchPricingConfig();

  return NextResponse.json(
    { prices, addons, seasons },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
  );
}
