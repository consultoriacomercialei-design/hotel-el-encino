import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tv/config — configuración del Conserje (Apple TV en habitaciones).
 * Auth: header `x-tv-token` == TV_KIOSK_TOKEN (falla cerrado; el token se
 * teclea UNA vez por TV en su pantalla de setup). La config vive en
 * hotel_settings key 'tv_config' — cambiarla por DB actualiza todas las TVs
 * sin rebuild (p.ej. app_download_url: TestFlight hoy → App Store al aprobar).
 */
export async function GET(req: NextRequest) {
  const token = process.env.TV_KIOSK_TOKEN;
  if (!token) return NextResponse.json({ error: 'TV no configurada' }, { status: 503 });
  if (req.headers.get('x-tv-token') !== token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const rows = await supabaseGet<{ key: string; value: Record<string, string> }>(
    'hotel_settings',
    { select: 'key,value', key: 'eq.tv_config', limit: '1' }
  );
  const cfg = rows?.[0]?.value ?? {};
  return NextResponse.json({
    hotel_name: 'Hotel El Encino',
    checkin: cfg.checkin ?? '15:00',
    checkout: cfg.checkout ?? '12:00',
    phone: cfg.phone ?? '',
    whatsapp: cfg.whatsapp ?? '',
    wifi_name: cfg.wifi_name ?? '',
    wifi_pass: cfg.wifi_pass ?? '',
    app_download_url: cfg.app_download_url ?? '',
  });
}
