/**
 * GET    /api/user/favorites              — list user's favorite slugs
 * POST   /api/user/favorites              — add favorite { listingSlug }
 * DELETE /api/user/favorites?slug=<slug>  — remove favorite
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit, getClientIP } from '@/app/lib/rate-limit';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.id ? (d.id as string) : null;
}

async function resolveUserId() {
  const jar = await cookies();
  const token = jar.get('dir_session')?.value ?? jar.get('guia_session')?.value;
  if (!token) return null;
  return getUser(token);
}

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&select=listing_slug,created_at&order=created_at.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  const rows = res.ok ? await res.json() : [];
  return NextResponse.json({ favorites: (rows as Array<{ listing_slug: string }>).map(r => r.listing_slug) });
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`favorites:${ip}`, 30, 60_000)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { listingSlug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const slug = body.listingSlug?.replace(/[^a-z0-9-]/g, '').slice(0, 120);
  if (!slug) return NextResponse.json({ error: 'listingSlug requerido' }, { status: 422 });

  // Add favorite (ignore if duplicate)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({ user_id: userId, listing_slug: slug }),
  });
  if (!res.ok) return NextResponse.json({ error: 'Error al guardar favorito' }, { status: 500 });

  // Notify listing owner (fire-and-forget)
  notifyListingOwner(slug).catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`favorites:${ip}`, 30, 60_000)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const slug = req.nextUrl.searchParams.get('slug')?.replace(/[^a-z0-9-]/g, '').slice(0, 120);
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 422 });

  await fetch(
    `${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&listing_slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }
  );
  return NextResponse.json({ ok: true });
}

async function notifyListingOwner(listingSlug: string) {
  // Find owner of the listing
  const listingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?slug=eq.${encodeURIComponent(listingSlug)}&select=owner_id,name`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!listingRes.ok) return;
  const listings = await listingRes.json() as Array<{ owner_id: string | null; name: string }>;
  const listing = listings[0];
  if (!listing?.owner_id) return;

  // Get owner's push subscriptions
  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?owner_id=eq.${listing.owner_id}&select=endpoint,p256dh,auth`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!subsRes.ok) return;
  const subs = await subsRes.json() as Array<{ endpoint: string; p256dh: string; auth: string }>;
  if (!subs.length) return;

  const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const payload = JSON.stringify({
    title: '¡Nuevo favorito! ❤️',
    body: `Alguien guardó "${listing.name}" en sus favoritos`,
    icon: '/logo.png',
    data: { url: `/directorio/actividades/${listingSlug}` },
  });

  const { sendPushNotification } = await import('@/app/lib/push-helper').catch(() => ({ sendPushNotification: null }));
  if (!sendPushNotification) return;
  await Promise.allSettled(subs.map(sub => sendPushNotification(sub, payload)));
}
