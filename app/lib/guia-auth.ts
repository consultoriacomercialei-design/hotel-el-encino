/**
 * Supabase Auth helpers for the business portal (/mi-negocio)
 * Uses anon key — users authenticate with their own JWT
 */

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY!;

export interface GuiaUser { id: string; email: string }

const AUTH_HEADERS = { 'Content-Type': 'application/json', apikey: ANON_KEY };

/** Verify an access_token → returns user or null */
export async function getGuiaUser(accessToken: string): Promise<GuiaUser | null> {
  if (!accessToken || !SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { ...AUTH_HEADERS, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = await res.json();
  return { id: d.id, email: d.email };
}

/** Exchange refresh_token for new tokens */
export async function refreshGuiaSession(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  if (!refreshToken || !SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return { access_token: d.access_token, refresh_token: d.refresh_token };
}

/** Login → returns tokens or error message */
export async function loginGuia(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const d = await res.json();
  if (!res.ok) return { error: d.error_description || 'Credenciales incorrectas' };
  return { access_token: d.access_token as string, refresh_token: d.refresh_token as string };
}

/** Sign up → returns tokens or error */
export async function signupGuia(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const d = await res.json();
  if (!res.ok) return { error: d.error_description || 'Error al registrar' };
  // If email confirmation is enabled, access_token may be null until verified
  return {
    access_token: (d.access_token as string) || null,
    refresh_token: (d.refresh_token as string) || null,
    needsConfirmation: !d.access_token,
  };
}

/** Send password reset email */
export async function recoverGuia(email: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

/** Cookie config */
export const SESSION_COOKIE  = 'guia_session';
export const REFRESH_COOKIE  = 'guia_refresh';
// `Secure` se omite SOLO para el preview local por http (Safari no guarda
// cookies Secure sobre http). En producción nunca se define esta variable →
// las cookies siguen siendo Secure.
export const COOKIE_OPTS     =
  process.env.PREVIEW_INSECURE_COOKIES === '1'
    ? 'HttpOnly; Path=/; SameSite=Lax'
    : 'HttpOnly; Path=/; SameSite=Lax; Secure';
export const COOKIE_MAX_AGE  = 3600;         // 1 h (access token)
export const REFRESH_MAX_AGE = 7 * 86400;   // 7 d (refresh token)
