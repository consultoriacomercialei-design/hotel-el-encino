/**
 * POST /api/admin/auth  — login, sets HttpOnly cookie
 * DELETE /api/admin/auth — logout, clears cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { signAdminToken } from '@/app/lib/admin-auth';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export async function POST(req: NextRequest) {
  // Anti brute-force: 5 intentos por 15 min
  if (!limiters.adminAuth(getClientIP(req))) {
    return tooManyRequests();
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!password || !ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Limit password length to prevent DoS via huge hash input
  if (password.length > 128) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hash = (s: string) => crypto.createHash('sha256').update(s.trim()).digest();
  const match = crypto.timingSafeEqual(hash(password), hash(ADMIN_PASSWORD));

  if (!match) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const token = signAdminToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set('hotel_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86_400,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('hotel_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
