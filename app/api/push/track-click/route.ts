import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:hola@hotelelencino.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

const INSTANT_LIMIT = 2;           // first N clicks in a window → send immediately
const WINDOW_MS     = 5 * 60_000;  // 5-minute grouping window

type RateLimitRow = {
  window_start: string;
  send_count: number;
  pending_count: number;
};

type PushSub = { endpoint: string; p256dh: string; auth: string };

/** POST /api/push/track-click  { slug: string } */
export async function POST(req: NextRequest) {
  let body: { slug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }
  const { slug } = body;
  if (!slug) return NextResponse.json({ ok: false });

  // Persist click to DB for analytics (fire-and-forget)
  if (SUPABASE_URL && SERVICE_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/listing_clicks`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }

  notifyOwner(slug).catch(() => {});
  return NextResponse.json({ ok: true });
}

async function notifyOwner(slug: string) {
  if (!SUPABASE_URL || !VAPID_PUBLIC || !VAPID_PRIVATE) return;

  // 1. Get listing + owner
  const listingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_listings?slug=eq.${encodeURIComponent(slug)}&select=owner_id,name&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!listingRes.ok) return;
  const [listing] = (await listingRes.json()) as Array<{ owner_id: string | null; name: string }>;
  if (!listing?.owner_id) return;

  // 2. Get subscriptions
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?owner_id=eq.${listing.owner_id}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!subRes.ok) return;
  const subs = (await subRes.json()) as PushSub[];
  if (!subs.length) return;

  // 3. Rate-limit check
  const row = await getRateLimit(listing.owner_id, slug);
  const now  = Date.now();
  const windowExpired = !row || (now - new Date(row.window_start).getTime()) > WINDOW_MS;

  let shouldSend = false;
  let body       = `Alguien está viendo "${listing.name}" en el directorio.`;

  if (windowExpired) {
    // New window — send (grouped if there were pending clicks from last window)
    shouldSend = true;
    const total = (row?.pending_count ?? 0) + 1;
    if (total > 1) {
      body = `${total} personas vieron "${listing.name}" recientemente — ¡sigue creciendo! 🚀`;
    }
    await upsertRateLimit(listing.owner_id, slug, { window_start: new Date().toISOString(), send_count: 1, pending_count: 0 });
  } else if ((row?.send_count ?? 0) < INSTANT_LIMIT) {
    // Within window, under instant threshold
    shouldSend = true;
    await upsertRateLimit(listing.owner_id, slug, { window_start: row!.window_start, send_count: (row!.send_count) + 1, pending_count: row!.pending_count });
  } else {
    // Suppress — just increment pending count
    await upsertRateLimit(listing.owner_id, slug, { window_start: row!.window_start, send_count: row!.send_count, pending_count: (row!.pending_count) + 1 });
  }

  if (!shouldSend) return;

  // 4. Send push to all devices
  const payload = JSON.stringify({
    title: '¡Nuevo clic en tu anuncio!',
    body,
    icon:  '/logo.png',
    url:   '/mi-negocio',
    tag:   `click-${slug}`,
  });

  const deadEndpoints: string[] = [];
  await Promise.all(
    subs.map(sub =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 120 }
        )
        .catch((err: { statusCode?: number }) => {
          if (err?.statusCode === 404 || err?.statusCode === 410) deadEndpoints.push(sub.endpoint);
        })
    )
  );

  // 5. Clean up expired subscriptions
  if (deadEndpoints.length) {
    await Promise.all(
      deadEndpoints.map(endpoint =>
        fetch(
          `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
          { method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        ).catch(() => {})
      )
    );
  }
}

async function getRateLimit(ownerId: string, slug: string): Promise<RateLimitRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_rate_limit?owner_id=eq.${ownerId}&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) return null;
  const [row] = (await res.json()) as RateLimitRow[];
  return row ?? null;
}

async function upsertRateLimit(ownerId: string, slug: string, fields: Omit<RateLimitRow, never>) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_rate_limit`, {
    method: 'POST',
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates',
    },
    body: JSON.stringify({ owner_id: ownerId, slug, ...fields }),
  }).catch(() => {});
}
