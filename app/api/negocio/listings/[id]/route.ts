import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGuiaUser, SESSION_COOKIE } from '@/app/lib/guia-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET       = 'anuncios';
const MAX_BYTES    = 2 * 1024 * 1024;

async function getCurrentUser(req: NextRequest) {
  const cookieStore = await cookies();
  // x-guia-token is set by middleware when it refreshes an expired access token
  const freshToken  = req.headers.get('x-guia-token');
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;
  const authToken   = req.headers.get('Authorization')?.replace('Bearer ', '');

  for (const token of [freshToken, cookieToken, authToken]) {
    if (!token) continue;
    const user = await getGuiaUser(token);
    if (user) return user;
  }
  return null;
}

async function uploadPhoto(photo: File): Promise<string | null> {
  if (photo.size > MAX_BYTES) return null;
  const ext = photo.type === 'image/webp' ? 'webp' : photo.type === 'image/png' ? 'png' : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': photo.type,
      'x-upsert': 'true',
    },
    body: await photo.arrayBuffer(),
  });
  if (!res.ok) { console.error('[listings] storage upload error', res.status, await res.text()); return null; }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

/* PATCH /api/negocio/listings/[id] — update own anuncio */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Verify ownership
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?id=eq.${id}&owner_id=eq.${user.id}&select=id,src`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  const rows = checkRes.ok ? await checkRes.json() : [];
  if (!rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const form = await req.formData();
  const ALLOWED = ['name', 'category', 'short_desc', 'long_desc', 'address',
    'phone', 'whatsapp', 'instagram', 'facebook', 'website', 'hours', 'price_range', 'img_focus'];

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    const val = form.get(key);
    if (val !== null) patch[key] = (val as string).trim() || null;
  }

  // lat/lng handled separately (numeric)
  const latStr = (form.get('lat') as string | null)?.trim();
  const lngStr = (form.get('lng') as string | null)?.trim();
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) { patch.lat = lat; patch.lng = lng; }
  }

  // Handle multi-photo gallery: photos_keep (JSON array) + new_photo_0..N
  const photosKeepStr = form.get('photos_keep') as string | null;
  if (photosKeepStr !== null) {
    let kept: string[] = [];
    try { kept = JSON.parse(photosKeepStr); } catch { kept = []; }
    const uploaded: string[] = [];
    for (let i = 0; i < 10; i++) {
      const file = form.get(`new_photo_${i}`) as File | null;
      if (!file || file.size === 0) break;
      const url = await uploadPhoto(file);
      if (url) uploaded.push(url);
    }
    const allPhotos = [...kept, ...uploaded];
    patch.photos = allPhotos.length > 0 ? allPhotos : null;
    patch.src = allPhotos[0] ?? null;
  } else {
    // Legacy: single photo field (backward compat)
    const photo = form.get('photo') as File | null;
    if (photo && photo.size > 0) {
      const url = await uploadPhoto(photo);
      if (url) { patch.src = url; patch.photos = [url]; }
    }
  }

  console.log('[PATCH listing]', id, 'patch keys:', Object.keys(patch), 'lat:', patch.lat, 'lng:', patch.lng);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/guia_listings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[PATCH listing] supabase error:', res.status, errText);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }

  const updated = await res.json();
  const row = updated[0] ?? {};
  console.log('[PATCH listing] saved lat:', row.lat, 'lng:', row.lng, 'src:', row.src);
  return NextResponse.json({ ok: true, lat: row.lat, lng: row.lng });
}
