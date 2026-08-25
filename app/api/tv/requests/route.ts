import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet, supabasePost } from '@/app/lib/supabase';
import { sendHotelPush } from '@/app/lib/apns-hotel';
import { syncRequestsLiveActivity } from '@/app/lib/requests-live-activity';

export const dynamic = 'force-dynamic';

const HOTEL_EMAIL = (process.env.HOTEL_EMAIL || 'gerencia@hotelelencino.com').trim();
const ADMIN_EMAIL = 'gerencia@hotelelencino.com';
const FROM = 'Hotel El Encino <reservaciones@hotelelencino.com>';

const TYPE_LABEL: Record<string, string> = {
  limpieza: 'Limpieza de habitación (para mañana)',
  toallas: 'Toallas extra',
  agua: 'Agua embotellada',
  problema: 'Reporte de problema',
  otro: 'Otra solicitud',
};

/**
 * POST /api/tv/requests — el huésped pide servicio desde el Apple TV del
 * cuarto. Body: { room_number, request_type, note? }. Auth x-tv-token.
 * Crea la fila (admin la ve en /admin/solicitudes) y avisa por correo interno
 * al instante — mismo canal que las reservas nuevas.
 */
export async function POST(req: NextRequest) {
  const token = process.env.TV_KIOSK_TOKEN;
  if (!token || req.headers.get('x-tv-token') !== token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  let body: { room_number?: unknown; request_type?: unknown; note?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const room = typeof body.room_number === 'string' ? body.room_number.trim().slice(0, 20) : '';
  const type = typeof body.request_type === 'string' ? body.request_type : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null;
  if (!room || !(type in TYPE_LABEL)) {
    return NextResponse.json({ error: 'Faltan room_number o request_type válido' }, { status: 400 });
  }

  const row = await supabasePost<{ id: string }>('service_requests', {
    room_number: room, request_type: type, note,
  });
  if (!row) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 });

  // Push a El Encino Manager (dueño+hermano) — best-effort pero AWAITED:
  // en Vercel la función se CONGELA al responder, así que un push disparado
  // sin await queda a medio camino y muere por timeout (incidente 24-ago,
  // "no llegó la notificación"). Esperarlo cuesta ~1 s y garantiza el envío.
  await sendHotelPush({
    title: `Habitación ${room}`,
    body: TYPE_LABEL[type] + (note ? ` — ${note.slice(0, 80)}` : ''),
    url: `encino://request/${row.id}`,
  }).catch((e: unknown) => console.error('[tv/requests] push failed', e));

  // Live Activity en los iPhone del staff (b9) — misma regla: awaited.
  await syncRequestsLiveActivity(true).catch((e: unknown) =>
    console.error('[tv/requests] live activity failed', e));

  // Aviso interno best-effort (fetch crudo a Resend, mismo patrón que emails.ts):
  // la solicitud ya quedó en el admin aunque el correo falle.
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [HOTEL_EMAIL, ADMIN_EMAIL, 'beto_00017@hotmail.com', 'elencino_22@hotmail.com'],
          subject: `🛎️ Habitación ${room}: ${TYPE_LABEL[type]}`,
          html: `<p><strong>Habitación ${room}</strong> pidió desde su TV:</p>
<p style="font-size:18px">${TYPE_LABEL[type]}</p>
${note ? `<p>Nota del huésped: ${note}</p>` : ''}
<p>Márcala como atendida en <a href="https://hotelelencino.com/admin/solicitudes">el panel de solicitudes</a>.</p>`,
        }),
      });
    } catch (err) { console.error('[tv/requests] email failed', err); }
  }

  return NextResponse.json({ ok: true, id: row.id });
}

/**
 * GET /api/tv/requests?room=N — estado real de las solicitudes de ESTA
 * habitación (últimas 24 h) para que el TV refleje Recibida → En proceso →
 * Lista en vez de fingir con estado local. Auth x-tv-token.
 */
export async function GET(req: NextRequest) {
  const token = process.env.TV_KIOSK_TOKEN;
  if (!token || req.headers.get('x-tv-token') !== token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const room = (req.nextUrl.searchParams.get('room') ?? '').trim().slice(0, 20);
  if (!room) return NextResponse.json({ error: 'Falta room' }, { status: 400 });

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const rows = await supabaseGet<Record<string, unknown>>('service_requests', {
    select: 'id,request_type,status,created_at,taken_at,resolved_at',
    room_number: `eq.${room}`,
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '20',
  });
  return NextResponse.json({ ok: true, requests: rows });
}
