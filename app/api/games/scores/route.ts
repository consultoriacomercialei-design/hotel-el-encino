/**
 * GET  /api/games/scores?game=<slug>  — leaderboard (top 10 + caller's best)
 * POST /api/games/scores              — submit score after completing game
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { rateLimit, getClientIP } from '@/app/lib/rate-limit';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SIGN_KEY     = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.id ? (d.id as string) : null;
}

function validateSessionToken(sessionToken: string, userId: string, gameSlug: string): boolean {
  try {
    const decoded = Buffer.from(sessionToken, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;
    const [tokenUserId, tokenSlug, tsStr, sig] = parts;
    if (tokenUserId !== userId || tokenSlug !== gameSlug) return false;

    const ts = parseInt(tsStr, 10);
    const age = Date.now() - ts;
    if (age < 0 || age > 24 * 60 * 60 * 1000) return false; // token expired (> 24h)

    const expectedSig = createHmac('sha256', SIGN_KEY)
      .update(`${tokenUserId}:${tokenSlug}:${tsStr}`)
      .digest('hex');
    return sig === expectedSig;
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`gamescore-get:${ip}`, 30, 60_000)) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

  const gameSlug = req.nextUrl.searchParams.get('game')?.replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!gameSlug) return NextResponse.json({ error: 'game requerido' }, { status: 422 });

  // Get top 10 scores with display names
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_leaderboard`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_game_slug: gameSlug, p_limit: 10 }),
    }
  );

  // Fallback: direct query if RPC not yet created
  let leaderboard: Array<{ rank: number; display_name: string; avatar_emoji: string; score_seconds: number; completed_at: string }> = [];
  if (res.ok) {
    leaderboard = await res.json();
  } else {
    const fallback = await fetch(
      `${SUPABASE_URL}/rest/v1/game_scores?game_slug=eq.${encodeURIComponent(gameSlug)}&order=score_seconds.asc&limit=10&select=score_seconds,completed_at,user_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (fallback.ok) {
      const rows = await fallback.json() as Array<{ score_seconds: number; completed_at: string; user_id: string }>;
      // Fetch display names
      const userIds = rows.map(r => r.user_id);
      if (userIds.length) {
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/user_profiles?id=in.(${userIds.map(id => `"${id}"`).join(',')})&select=id,display_name,avatar_emoji`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        );
        const profiles: Array<{ id: string; display_name: string; avatar_emoji: string }> = profilesRes.ok ? await profilesRes.json() : [];
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
        leaderboard = rows.map((r, i) => ({
          rank: i + 1,
          display_name: profileMap[r.user_id]?.display_name ?? 'Anónimo',
          avatar_emoji: profileMap[r.user_id]?.avatar_emoji ?? '🎮',
          score_seconds: r.score_seconds,
          completed_at: r.completed_at,
        }));
      }
    }
  }

  // Get caller's best score if logged in
  const jar = await cookies();
  const token = jar.get('dir_session')?.value ?? jar.get('guia_session')?.value;
  let myBest: number | null = null;
  if (token) {
    const userId = await getUser(token);
    if (userId) {
      const myRes = await fetch(
        `${SUPABASE_URL}/rest/v1/game_scores?user_id=eq.${userId}&game_slug=eq.${encodeURIComponent(gameSlug)}&select=score_seconds`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      const myRows = myRes.ok ? await myRes.json() : [];
      myBest = myRows[0]?.score_seconds ?? null;
    }
  }

  return NextResponse.json({ leaderboard, myBest });
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`gamescore-post:${ip}`, 5, 60_000)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

  const jar = await cookies();
  const token = jar.get('dir_session')?.value ?? jar.get('guia_session')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const userId = await getUser(token);
  if (!userId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let body: { gameSlug?: string; scoreSeconds?: number; sessionToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { gameSlug: rawSlug, scoreSeconds, sessionToken } = body;
  const gameSlug = rawSlug?.replace(/[^a-z0-9-]/g, '').slice(0, 60);

  if (!gameSlug || typeof scoreSeconds !== 'number' || !sessionToken)
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 422 });

  if (scoreSeconds < 10 || scoreSeconds > 7200)
    return NextResponse.json({ error: 'Tiempo inválido' }, { status: 422 });

  if (!validateSessionToken(sessionToken, userId, gameSlug))
    return NextResponse.json({ error: 'Token de sesión inválido' }, { status: 403 });

  // Upsert score — if duplicate (user already has one), return existing
  const res = await fetch(`${SUPABASE_URL}/rest/v1/game_scores`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify({ user_id: userId, game_slug: gameSlug, score_seconds: scoreSeconds, session_token: sessionToken }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'Error al guardar puntaje', detail: err }, { status: 500 });
  }

  // Send push notification if user beat their previous best (new record)
  // Fire-and-forget — no await needed for the response
  notifyRecordBeaten(userId, gameSlug, scoreSeconds).catch(() => {});

  return NextResponse.json({ ok: true, scoreSeconds });
}

async function notifyRecordBeaten(userId: string, gameSlug: string, newScore: number) {
  // Get user's push subscriptions
  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?owner_id=eq.${userId}&select=endpoint,p256dh,auth`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!subsRes.ok) return;
  const subs = await subsRes.json() as Array<{ endpoint: string; p256dh: string; auth: string }>;
  if (!subs.length) return;

  const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const mins = Math.floor(newScore / 60);
  const secs = newScore % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const payload = JSON.stringify({
    title: '¡Nuevo récord! 🎉',
    body: `Completaste el crucigrama en ${timeStr}`,
    icon: '/logo.png',
    data: { url: '/directorio#juegos' },
  });

  const { sendPushNotification } = await import('@/app/lib/push-helper').catch(() => ({ sendPushNotification: null }));
  if (!sendPushNotification) return;

  await Promise.allSettled(subs.map(sub => sendPushNotification(sub, payload)));
}
