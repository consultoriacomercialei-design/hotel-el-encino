/**
 * Admin session token — HMAC-SHA256, 24h expiry
 * Used in Node.js runtime (API routes, Server Components)
 */

import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_EXPIRY = 86_400; // 24 hours

/** Signs a token containing expiry timestamp */
export function signAdminToken(): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY;
  const payload = `exp:${exp}`;
  // HMAC as raw bytes encoded in base64 (compatible with Web Crypto for middleware)
  const hmacBytes = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest();
  const hmacB64 = hmacBytes.toString('base64');
  return Buffer.from(`${payload}|${hmacB64}`).toString('base64');
}

/** Verifies token: checks HMAC and expiry */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !ADMIN_PASSWORD) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const pipeIdx = decoded.lastIndexOf('|');
    if (pipeIdx === -1) return false;

    const payload = decoded.slice(0, pipeIdx);
    const hmacB64 = decoded.slice(pipeIdx + 1);

    const expectedBytes = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest();
    const actualBytes = Buffer.from(hmacB64, 'base64');

    if (expectedBytes.length !== actualBytes.length) return false;
    const safe = crypto.timingSafeEqual(expectedBytes, actualBytes);
    if (!safe) return false;

    const exp = parseInt(payload.replace('exp:', ''));
    return !isNaN(exp) && Math.floor(Date.now() / 1000) < exp;
  } catch {
    return false;
  }
}
