/**
 * POST /api/user/auth        — login or signup (body: { action, email, password, [displayName] })
 * DELETE /api/user/auth      — logout (clears dir_session cookies)
 */
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { sanitizeString, isValidEmail } from '@/app/lib/sanitize';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DIR_SESSION_COOKIE  = 'dir_session';
const DIR_REFRESH_COOKIE  = 'dir_refresh';
const COOKIE_OPTS_SECURE  = 'HttpOnly; Path=/; SameSite=Lax; Secure';
const ACCESS_MAX_AGE      = 3600;         // 1 h
const REFRESH_MAX_AGE     = 7 * 86400;   // 7 d

function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Max-Age=${maxAge}; ${COOKIE_OPTS_SECURE}`;
}
function clearCookieHeader(name: string) {
  return `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

async function supabasePost(path: string, body: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify(body),
  });
}

async function ensureUserProfile(userId: string, displayName: string, avatarEmoji?: string) {
  const payload: Record<string, string> = { id: userId, display_name: displayName };
  if (avatarEmoji) payload.avatar_emoji = avatarEmoji;
  await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles`,
    {
      method: 'POST',
      headers: {
        apikey:         SERVICE_KEY,
        Authorization:  `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=ignore-duplicates',
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!rateLimit(`dirauth:${ip}`, 5, 10 * 60 * 1000)) return tooManyRequests(600);

  let body: { action?: string; email?: string; password?: string; displayName?: string; avatarEmoji?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { action, email: rawEmail, password, displayName: rawName, avatarEmoji: rawEmoji } = body;

  // Validate inputs
  const email = rawEmail?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 422 });

  if (!password || password.length < 6 || password.length > 128)
    return NextResponse.json({ error: 'Contraseña: mínimo 6 caracteres' }, { status: 422 });

  if (action === 'signup') {
    const displayName = sanitizeString(rawName ?? '', 30);
    if (displayName.length < 2)
      return NextResponse.json({ error: 'Nombre para juegos: mínimo 2 caracteres' }, { status: 422 });

    // Block common injection patterns in display name
    if (/[<>"'`;&|\\]/.test(displayName))
      return NextResponse.json({ error: 'Nombre contiene caracteres no permitidos' }, { status: 422 });

    const avatarEmoji = rawEmoji ?? '🎮';

    const res = await supabasePost('signup', { email, password });
    const d = await res.json();
    if (!res.ok) return NextResponse.json({ error: d.error_description || 'Error al registrar' }, { status: 400 });

    if (d.access_token) {
      await ensureUserProfile(d.user.id, displayName, avatarEmoji);
      const resp = NextResponse.json({ ok: true, needsConfirmation: false });
      resp.headers.append('Set-Cookie', cookieHeader(DIR_SESSION_COOKIE, d.access_token, ACCESS_MAX_AGE));
      resp.headers.append('Set-Cookie', cookieHeader(DIR_REFRESH_COOKIE, d.refresh_token, REFRESH_MAX_AGE));
      return resp;
    }

    // Email confirmation required — profile will be created after confirmation via webhook or on first login
    return NextResponse.json({ ok: true, needsConfirmation: true, pendingDisplayName: displayName, pendingAvatarEmoji: avatarEmoji });
  }

  if (action === 'login') {
    const res = await supabasePost('token?grant_type=password', { email, password });
    const d = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });

    // Ensure profile exists (first login after email confirmation)
    if (d.user?.id) {
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${d.user.id}&select=id`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const profiles = await profileRes.json();
      if (!profiles?.length) {
        const fallbackName = sanitizeString(email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''), 30) || 'Jugador';
        await ensureUserProfile(d.user.id, fallbackName);
      }
    }

    const resp = NextResponse.json({ ok: true });
    resp.headers.append('Set-Cookie', cookieHeader(DIR_SESSION_COOKIE, d.access_token, ACCESS_MAX_AGE));
    resp.headers.append('Set-Cookie', cookieHeader(DIR_REFRESH_COOKIE, d.refresh_token, REFRESH_MAX_AGE));
    return resp;
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}

export async function DELETE() {
  const resp = NextResponse.json({ ok: true });
  resp.headers.append('Set-Cookie', clearCookieHeader(DIR_SESSION_COOKIE));
  resp.headers.append('Set-Cookie', clearCookieHeader(DIR_REFRESH_COOKIE));
  return resp;
}
