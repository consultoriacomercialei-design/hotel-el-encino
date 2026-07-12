/**
 * POST /api/games/session
 * Issues a signed session token required to submit a game score.
 * Anti-cheat: token = HMAC(userId:gameSlug:timestamp, secret)
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { rateLimit, getClientIP } from '@/app/lib/rate-limit';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
// Use CRON_SECRET as signing key (already set in production)
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

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`gamesession:${ip}`, 20, 60_000)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

  const jar = await cookies();
  const token = jar.get('dir_session')?.value ?? jar.get('guia_session')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const userId = await getUser(token);
  if (!userId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let body: { gameSlug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const gameSlug = body.gameSlug?.replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!gameSlug) return NextResponse.json({ error: 'gameSlug requerido' }, { status: 422 });

  const ts = Date.now();
  const payload = `${userId}:${gameSlug}:${ts}`;
  const sig = createHmac('sha256', SIGN_KEY).update(payload).digest('hex');
  const sessionToken = Buffer.from(`${payload}:${sig}`).toString('base64url');

  return NextResponse.json({ sessionToken, issuedAt: ts });
}
