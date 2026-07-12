/**
 * Proxy autenticado del portal Mi Negocio → APIs de anfitrión de Santiapp.
 *
 * hotel-landing y santiapp comparten el MISMO proyecto Supabase, así que el
 * access_token de GoTrue del portal (cookie `guia_session`) es un Bearer válido
 * para las rutas `/api/organizer/*` de santiapp (que solo hacen verifySupabaseJwt).
 *
 * Reenvía cualquier método al endpoint santiapp correspondiente, con allowlist
 * de rutas para no exponer más de lo necesario. La pertenencia/rol la sigue
 * enforzando santiapp. Si el access_token expiró, refresca con `guia_refresh`
 * y reintenta una vez, devolviendo las cookies nuevas al navegador.
 *
 *   /api/negocio/santiapp/<path>  →  {SANTIAPP_API_URL}/api/<path>
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  refreshGuiaSession,
  SESSION_COOKIE,
  REFRESH_COOKIE,
  COOKIE_OPTS,
  COOKIE_MAX_AGE,
  REFRESH_MAX_AGE,
} from '@/app/lib/guia-auth';

const BASE = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

/** Rutas santiapp permitidas: [regex sobre el subpath, métodos aceptados]. */
const ALLOWLIST: Array<{ re: RegExp; methods: string[] }> = [
  { re: /^me$/, methods: ['GET'] },
  { re: /^organizer\/become$/, methods: ['POST'] },
  { re: /^organizer\/account$/, methods: ['GET', 'DELETE'] },
  { re: /^organizer\/onboarding\/(session|complete)$/, methods: ['POST'] },
  { re: /^organizer\/lodgings(\/.*)?$/, methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  { re: /^organizer\/events(\/.*)?$/, methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
];

function isAllowed(subPath: string, method: string): boolean {
  return ALLOWLIST.some((rule) => rule.re.test(subPath) && rule.methods.includes(method));
}

function unauthorized(message = 'Inicia sesión de nuevo.') {
  return NextResponse.json({ success: false, error: { code: 'unauthorized', message } }, { status: 401 });
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const subPath = (path ?? []).join('/');
  const method = req.method.toUpperCase();

  if (!isAllowed(subPath, method)) {
    return NextResponse.json(
      { success: false, error: { code: 'forbidden', message: 'Ruta no permitida.' } },
      { status: 403 }
    );
  }

  const jar = await cookies();
  const access = jar.get(SESSION_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return unauthorized();

  const target = `${BASE}/api/${subPath}${req.nextUrl.search}`;
  const contentType = req.headers.get('content-type') || undefined;
  const hasBody = method === 'POST' || method === 'PATCH' || method === 'PUT';
  const bodyBuf = hasBody ? await req.arrayBuffer() : undefined;

  const forward = (token: string) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;
    return fetch(target, {
      method,
      headers,
      body: bodyBuf ? Buffer.from(bodyBuf) : undefined,
      cache: 'no-store',
    });
  };

  let refreshed: { access_token: string; refresh_token: string } | null = null;
  let upstream: Response;
  try {
    if (access) {
      upstream = await forward(access);
      // Access token vencido → intenta refrescar una vez.
      if (upstream.status === 401 && refresh) {
        refreshed = await refreshGuiaSession(refresh);
        if (refreshed) upstream = await forward(refreshed.access_token);
      }
    } else {
      refreshed = await refreshGuiaSession(refresh!);
      if (!refreshed) return unauthorized();
      upstream = await forward(refreshed.access_token);
    }
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'upstream', message: 'No se pudo conectar con el servidor.' } },
      { status: 502 }
    );
  }

  const data = await upstream.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: upstream.status });
  if (refreshed) {
    res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${refreshed.access_token}; ${COOKIE_OPTS}; Max-Age=${COOKIE_MAX_AGE}`);
    res.headers.append('Set-Cookie', `${REFRESH_COOKIE}=${refreshed.refresh_token}; ${COOKIE_OPTS}; Max-Age=${REFRESH_MAX_AGE}`);
  }
  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
