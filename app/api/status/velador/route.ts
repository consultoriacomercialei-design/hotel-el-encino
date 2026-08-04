import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const FROM = 'El Velador <reservaciones@hotelelencino.com>';
const ADMIN_EMAIL = 'gerencia@hotelelencino.com';

/**
 * El "hombre muerto" del Velador (monitoreo del Directorio + hotel).
 *
 * GET (público): estado del latido de la sonda de la Mac + solicitudes de
 * servicio envejecidas. Responde la palabra "fresh" SOLO si la sonda latió
 * hace <15 min — UptimeRobot vigila esa palabra: si la Mac muere, la palabra
 * desaparece y el dueño recibe correo del propio UptimeRobot (externo).
 *
 * POST (x-tv-token): { beat: true } registra latido · { reporte: "..." }
 * manda el resumen diario a gerencia@ usando el Resend del servidor (la Mac
 * no guarda ningún secreto).
 */
export async function GET() {
  const rows = await supabaseGet<{ key: string; value: Record<string, string> }>(
    'hotel_settings', { select: 'key,value', key: 'eq.velador_beat', limit: '1' }
  );
  const beatIso = rows?.[0]?.value?.at ?? null;
  const ageS = beatIso ? Math.floor((Date.now() - new Date(beatIso).getTime()) / 1000) : null;
  const fresh = ageS !== null && ageS < 900;

  const pending = await supabaseGet<{ created_at: string }>('service_requests', {
    select: 'created_at', status: 'eq.pending', order: 'created_at.asc', limit: '50',
  });
  const oldestMin = pending?.[0]
    ? Math.floor((Date.now() - new Date(pending[0].created_at).getTime()) / 60000)
    : 0;

  return NextResponse.json({
    guardian: fresh ? 'fresh' : 'sin-latido',
    beat_age_s: ageS,
    solicitudes_pendientes: pending?.length ?? 0,
    solicitud_mas_vieja_min: oldestMin,
  }, { status: fresh ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  const token = process.env.TV_KIOSK_TOKEN;
  if (!token || req.headers.get('x-tv-token') !== token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  let body: { beat?: boolean; reporte?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  if (body.beat) {
    // Upsert por key (hotel_settings se llavea por `key`, no por id).
    await fetch(`${(process.env.SUPABASE_URL ?? '').replace(/\s/g, '')}/rest/v1/hotel_settings`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: 'velador_beat', value: { at: new Date().toISOString() } }),
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (typeof body.reporte === 'string' && body.reporte.length > 0) {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [ADMIN_EMAIL],
          subject: `🕯️ El Velador — reporte ${new Date().toLocaleDateString('es-MX')}`,
          text: body.reporte.slice(0, 10000),
        }),
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Nada que hacer' }, { status: 400 });
}
