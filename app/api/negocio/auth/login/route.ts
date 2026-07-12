import { NextRequest, NextResponse } from 'next/server';
import { loginGuia, SESSION_COOKIE, REFRESH_COOKIE, COOKIE_OPTS, COOKIE_MAX_AGE, REFRESH_MAX_AGE } from '@/app/lib/guia-auth';
import { limiters, getClientIP, tooManyRequests, isPayloadTooLarge } from '@/app/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (!limiters.guiaLogin(getClientIP(req))) return tooManyRequests(600);
  if (isPayloadTooLarge(req, 2_000)) return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });

  const body = await req.json().catch(() => ({}));
  const email    = typeof body?.email    === 'string' ? body.email.trim().slice(0, 254) : '';
  const password = typeof body?.password === 'string' ? body.password.slice(0, 128) : '';
  if (!email || !password)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const result = await loginGuia(email as string, password as string);
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${result.access_token}; Max-Age=${COOKIE_MAX_AGE}; ${COOKIE_OPTS}`);
  res.headers.append('Set-Cookie', `${REFRESH_COOKIE}=${result.refresh_token}; Max-Age=${REFRESH_MAX_AGE}; ${COOKIE_OPTS}`);
  return res;
}
