/**
 * In-memory sliding window rate limiter.
 * Works per Vercel instance — good enough for low-traffic sites.
 */

import { NextRequest } from 'next/server';

const store = new Map<string, number[]>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
  for (const [key, hits] of store.entries()) {
    const fresh = hits.filter(t => t > cutoff);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * @param key     Unique key (e.g. "auth:1.2.3.4")
 * @param limit   Max requests in window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (store.get(key) ?? []).filter(t => t > windowStart);
  if (hits.length >= limit) return false;
  hits.push(now);
  store.set(key, hits);
  return true;
}

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Pre-configured limiters */
export const limiters = {
  /** Admin login — 5 intentos por 15 min (anti brute-force) */
  adminAuth: (ip: string) => rateLimit(`auth:${ip}`, 5, 15 * 60 * 1000),

  /** Reservaciones — 10 por 15 min por IP */
  reservations: (ip: string) => rateLimit(`res:${ip}`, 10, 15 * 60 * 1000),

  /** Disponibilidad — 60 por minuto por IP */
  availability: (ip: string) => rateLimit(`avail:${ip}`, 60, 60 * 1000),

  /** Crear pago — 5 por 15 min por IP */
  paymentCreate: (ip: string) => rateLimit(`pay:${ip}`, 5, 15 * 60 * 1000),

  /** Polling status pago — 30 por minuto por IP */
  paymentStatus: (ip: string) => rateLimit(`pstatus:${ip}`, 30, 60 * 1000),

  /** Calendario público — 20 por hora por IP */
  calendar: (ip: string) => rateLimit(`cal:${ip}`, 20, 60 * 60 * 1000),

  /** Rutas admin — 60 por minuto por IP */
  admin: (ip: string) => rateLimit(`admin:${ip}`, 60, 60 * 1000),

  /** Guia login — 5 intentos por 10 min (anti brute-force) */
  guiaLogin: (ip: string) => rateLimit(`guia-login:${ip}`, 5, 10 * 60 * 1000),

  /** Guia signup — 3 por 10 min por IP */
  guiaSignup: (ip: string) => rateLimit(`guia-signup:${ip}`, 3, 10 * 60 * 1000),

  /** Guia recover — 3 por 10 min por IP (anti email bombing) */
  guiaRecover: (ip: string) => rateLimit(`guia-recover:${ip}`, 3, 10 * 60 * 1000),

  /** Dir user auth — 5 intentos por 10 min */
  dirAuth: (ip: string) => rateLimit(`dirauth:${ip}`, 5, 10 * 60 * 1000),

  /** Game session — 20 por minuto por IP */
  gameSession: (ip: string) => rateLimit(`gamesession:${ip}`, 20, 60 * 1000),

  /** Game score submit — 5 por minuto por IP */
  gameScore: (ip: string) => rateLimit(`gamescore-post:${ip}`, 5, 60 * 1000),

  /** User favorites — 30 por minuto por IP */
  userFavorites: (ip: string) => rateLimit(`favorites:${ip}`, 30, 60 * 1000),

  /** AI Chat — 20 por minuto por IP */
  chat: (ip: string) => rateLimit(`chat:${ip}`, 20, 60 * 1000),
};

export function tooManyRequests(retryAfterSec = 60) {
  return new Response(
    JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) } }
  );
}

/** Returns true if Content-Length header exceeds maxBytes — reject early without reading body */
export function isPayloadTooLarge(req: import('next/server').NextRequest, maxBytes = 10_000): boolean {
  const cl = req.headers.get('content-length');
  if (!cl) return false; // unknown — let it through, body read will still be bounded
  return parseInt(cl, 10) > maxBytes;
}
