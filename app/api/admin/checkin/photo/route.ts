import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'guest-ids';

// Paths válidos del bucket: "<uuid>/<uuid>.ext" (escáner/modal del hotel) o
// "lodging/<uuid>/<ts>.ext" (check-in del Directorio). Sin traversal.
const PATH_RE = /^[a-z0-9/][a-z0-9/_-]{0,180}\.(jpg|jpeg|png|webp|heic)$/i;

/**
 * GET /api/admin/checkin/photo?path=… — visor de la foto de identificación:
 * emite una URL firmada de 5 minutos del bucket PRIVADO guest-ids y redirige.
 * El bucket nunca se expone público; solo el admin autenticado llega aquí.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Almacenamiento no configurado' }, { status: 503 });
  }

  const path = req.nextUrl.searchParams.get('path') ?? '';
  if (!PATH_RE.test(path) || path.includes('..')) {
    return NextResponse.json({ error: 'Path inválido' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[checkin/photo] sign failed', res.status, txt);
      return NextResponse.json({ error: 'No se encontró la foto' }, { status: 404 });
    }
    const data = (await res.json()) as { signedURL?: string };
    if (!data.signedURL) {
      return NextResponse.json({ error: 'No se pudo firmar la URL' }, { status: 500 });
    }
    return NextResponse.redirect(`${SUPABASE_URL}/storage/v1${data.signedURL}`, 302);
  } catch (err) {
    console.error('[checkin/photo] error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
