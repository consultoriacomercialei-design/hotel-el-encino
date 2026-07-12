import { NextResponse } from 'next/server';
import { SESSION_COOKIE, REFRESH_COOKIE } from '@/app/lib/guia-auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly`);
  res.headers.append('Set-Cookie', `${REFRESH_COOKIE}=; Max-Age=0; Path=/; HttpOnly`);
  return res;
}
