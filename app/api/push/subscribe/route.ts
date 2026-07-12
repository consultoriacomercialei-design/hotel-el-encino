import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGuiaUser, SESSION_COOKIE } from '@/app/lib/guia-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getGuiaUser(token);
}

/** POST /api/push/subscribe — save browser push subscription */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      apikey:          SERVICE_KEY,
      Authorization:   `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      owner_id: user.id,
      endpoint,
      p256dh:   keys.p256dh,
      auth:     keys.auth,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[push/subscribe] Supabase error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — remove subscription */
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { endpoint?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

  await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?owner_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(body.endpoint)}`,
    {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }
  );

  return NextResponse.json({ ok: true });
}
