import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'guia_session';
const REFRESH_COOKIE = 'guia_refresh';

// Allowed origins for CORS — add localhost for local dev
const ALLOWED_ORIGINS = new Set([
  'https://hotelelencino.com',
  'https://www.hotelelencino.com',
  'http://localhost:3000',
  'http://localhost:3001',
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://hotelelencino.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/** Decode JWT payload without verification — only for expiry check */
function jwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    // atob works in Edge runtime (no Buffer available)
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    // 30s buffer so we refresh before the API call fails
    return !decoded.exp || decoded.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

async function tryRefresh(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.access_token
      ? { access_token: d.access_token, refresh_token: d.refresh_token }
      : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  // Redirect www → apex (permanent 301)
  const host = req.headers.get('host') || '';
  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4); // strip "www."
    url.port = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  const { pathname, search } = req.nextUrl;
  const origin = req.headers.get('origin');

  // El directorio se mudó a su propio dominio. Redirige permanentemente (301)
  // las rutas viejas del hotel al dominio nuevo, preservando ruta y query.
  //   hotelelencino.com/directorio*  → directoriosantiago.com/*  (sin el prefijo)
  //   hotelelencino.com/mi-negocio*  → directoriosantiago.com/mi-negocio*
  // Debe ir ANTES del gate de auth de /mi-negocio de abajo.
  if (pathname === '/directorio' || pathname.startsWith('/directorio/')) {
    const rest = pathname.slice('/directorio'.length) || '/';
    return NextResponse.redirect(`https://directoriosantiago.com${rest}${search}`, 301);
  }
  if (pathname === '/mi-negocio' || pathname.startsWith('/mi-negocio/')) {
    return NextResponse.redirect(`https://directoriosantiago.com${pathname}${search}`, 301);
  }

  // Handle CORS preflight for all API routes
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const isGuiaPage =
    pathname.startsWith('/mi-negocio') &&
    !pathname.match(/^\/mi-negocio\/(login|registro|recuperar)(\/|$)/);
  const isGuiaApi = pathname.startsWith('/api/negocio/listings');
  const isApi = pathname.startsWith('/api/');

  // Non-guia API routes: add CORS and pass through
  if (isApi && !isGuiaApi) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders(origin))) response.headers.set(k, v);
    return response;
  }

  // Non-guia, non-API routes: pass through
  if (!isGuiaPage && !isGuiaApi) return NextResponse.next();

  const access  = req.cookies.get(SESSION_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Valid token → pass through (with CORS for API)
  if (access && !jwtExpired(access)) {
    if (isGuiaApi) {
      const response = NextResponse.next();
      for (const [k, v] of Object.entries(corsHeaders(origin))) response.headers.set(k, v);
      return response;
    }
    return NextResponse.next();
  }

  // Expired / missing access token — try to refresh
  if (refresh) {
    const tokens = await tryRefresh(refresh);
    if (tokens) {
      // Inject new token into request headers so API route handlers can read it
      const reqHeaders = new Headers(req.headers);
      reqHeaders.set('x-guia-token', tokens.access_token);

      const response = NextResponse.next({ request: { headers: reqHeaders } });
      if (isGuiaApi) {
        for (const [k, v] of Object.entries(corsHeaders(origin))) response.headers.set(k, v);
      }

      const secure = process.env.NODE_ENV === 'production' && process.env.PREVIEW_INSECURE_COOKIES !== '1';
      response.cookies.set(SESSION_COOKIE, tokens.access_token, {
        httpOnly: true, path: '/', sameSite: 'lax', secure, maxAge: 3600,
      });
      response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
        httpOnly: true, path: '/', sameSite: 'lax', secure, maxAge: 7 * 86400,
      });
      return response;
    }
  }

  // No valid auth at all
  if (isGuiaApi) {
    const response = NextResponse.next(); // Let route return 401 naturally
    for (const [k, v] of Object.entries(corsHeaders(origin))) response.headers.set(k, v);
    return response;
  }
  return NextResponse.redirect(new URL('/mi-negocio/login', req.url));
}

export const config = {
  matcher: [
    // www redirect must run on all routes
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff2|woff|ttf)).*)',
  ],
};
