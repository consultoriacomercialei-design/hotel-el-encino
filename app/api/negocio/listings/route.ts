import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGuiaUser, SESSION_COOKIE } from '@/app/lib/guia-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET       = 'anuncios';
const MAX_BYTES    = 2 * 1024 * 1024;

const svcHeaders = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

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

/* GET /api/negocio/listings — my listings */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?owner_id=eq.${user.id}&order=created_at.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  return NextResponse.json(res.ok ? await res.json() : []);
}

/* POST /api/negocio/listings — create anuncio (max 2) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Check existing count
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?owner_id=eq.${user.id}&select=id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  const existing = countRes.ok ? await countRes.json() : [];
  if (existing.length >= 2)
    return NextResponse.json({ error: 'Límite de 2 anuncios por cuenta' }, { status: 400 });

  const form = await req.formData();
  const name        = (form.get('name')        as string | null)?.trim() ?? '';
  const category    = (form.get('category')    as string | null)?.trim() ?? '';
  const short_desc  = (form.get('short_desc')  as string | null)?.trim() ?? '';
  const long_desc   = (form.get('long_desc')   as string | null)?.trim() ?? '';
  const address     = (form.get('address')     as string | null)?.trim() ?? '';
  const phone       = (form.get('phone')       as string | null)?.trim() ?? '';
  const whatsapp    = (form.get('whatsapp')    as string | null)?.trim() ?? '';
  const instagram   = (form.get('instagram')   as string | null)?.trim() ?? '';
  const facebook    = (form.get('facebook')    as string | null)?.trim() ?? '';
  const website     = (form.get('website')     as string | null)?.trim() ?? '';
  const hours       = (form.get('hours')       as string | null)?.trim() ?? '';
  const price_range = (form.get('price_range') as string | null)?.trim() ?? '';
  const photo       = form.get('photo') as File | null;
  const latStr      = (form.get('lat') as string | null)?.trim() ?? '';
  const lngStr      = (form.get('lng') as string | null)?.trim() ?? '';
  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  if (!name || !category)
    return NextResponse.json({ error: 'Nombre y categoría son obligatorios' }, { status: 400 });

  // Ensure guia_profiles row exists (signup doesn't create it)
  await fetch(`${SUPABASE_URL}/rest/v1/guia_profiles`, {
    method: 'POST',
    headers: { ...svcHeaders, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ id: user.id, email: user.email }),
  });

  // Upload photo if provided
  let src: string | null = null;
  if (photo && photo.size > 0) {
    src = await uploadPhoto(photo);
  }

  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/guia_listings`, {
    method: 'POST',
    headers: { ...svcHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_id: user.id, slug, name, category,
      short_desc: short_desc || null, long_desc: long_desc || null,
      address: address || null, phone: phone || null, whatsapp: whatsapp || null,
      instagram: instagram || null, facebook: facebook || null, website: website || null,
      hours: hours || null, price_range: price_range || null,
      src, photos: src ? [src] : null,
      lat: lat && !isNaN(lat) ? lat : null,
      lng: lng && !isNaN(lng) ? lng : null,
      tier: 'free', status: 'active',
    }),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('[listings] insert error:', err);
    if (err.includes('duplicate')) return NextResponse.json({ error: 'Ya existe un anuncio con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: 'Error al crear el anuncio' }, { status: 500 });
  }

  const data = await insertRes.json();
  const newListing = data[0] ?? data;

  // ── Fire-and-forget: auto-mark outreach contact as converted ──
  if (phone || whatsapp) {
    markOutreachConverted(normalizePhone(phone || whatsapp), newListing.slug ?? slug).catch(() => {});
  }

  return NextResponse.json(newListing, { status: 201 });
}

// ── Phone normalizer ──────────────────────────────────────────────
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^52/, '');
}

// ── Auto-mark outreach conversion by phone ────────────────────────
async function markOutreachConverted(phone10: string, listingSlug: string): Promise<void> {
  if (!phone10 || phone10.length < 7) return;
  if (!SUPABASE_URL || !SERVICE_KEY) return;

  // Find outreach contact with matching phone (last 10 digits)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_status?select=key,telefono&estado=neq.registrado`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  if (!res.ok) return;

  const contacts: { key: string; telefono: string }[] = await res.json();
  const match = contacts.find(c => normalizePhone(c.telefono).endsWith(phone10));
  if (!match) return;

  // Update to registrado + link listing
  await fetch(`${SUPABASE_URL}/rest/v1/outreach_status?key=eq.${encodeURIComponent(match.key)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      estado: 'registrado',
      converted_listing_id: listingSlug,
      updated_at: new Date().toISOString(),
    }),
  });
}
