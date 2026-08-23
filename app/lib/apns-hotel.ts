/**
 * Push APNs a El Encino Manager (tabla hotel_devices). Mismo patrón probado
 * de santiapp/app/lib/apns.ts: node:http2 (undici no habla HTTP/2), JWT ES256
 * cacheado ~50 min, tokens muertos se limpian. Best-effort: nunca lanza.
 * Env: APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID + HOTEL_APNS_BUNDLE_ID.
 */

import crypto from 'node:crypto';
import http2 from 'node:http2';
import { supabaseGet } from './supabase';

const APNS_HOST = 'https://api.push.apple.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ApnsEnv { key: string; keyId: string; teamId: string; bundleId: string }

function apnsEnv(): ApnsEnv | null {
  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } = process.env;
  const bundleId = process.env.HOTEL_APNS_BUNDLE_ID ?? 'com.consultoria.EncinoManager';
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) return null;
  return { key: APNS_KEY, keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID, bundleId };
}

let cachedJwt: { token: string; expiresAt: number } | null = null;

function providerJwt(env: ApnsEnv): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now) return cachedJwt.token;
  const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');
  const signingInput = `${b64url(JSON.stringify({ alg: 'ES256', kid: env.keyId }))}.${b64url(
    JSON.stringify({ iss: env.teamId, iat: now })
  )}`;
  const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
    key: env.key,
    dsaEncoding: 'ieee-p1363',
  });
  const token = `${signingInput}.${b64url(signature)}`;
  cachedJwt = { token, expiresAt: now + 50 * 60 };
  return token;
}

function sendOne(
  session: http2.ClientHttp2Session,
  jwt: string,
  bundleId: string,
  deviceToken: string,
  body: string
): Promise<{ status: number; reason: string }> {
  return new Promise((resolve) => {
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let status = 0;
    let data = '';
    req.on('response', (headers) => { status = Number(headers[':status'] ?? 0); });
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      let reason = '';
      try { reason = (JSON.parse(data) as { reason?: string }).reason ?? ''; } catch { /* 200 sin cuerpo */ }
      resolve({ status, reason });
    });
    req.on('error', () => resolve({ status: 0, reason: 'stream_error' }));
    req.setTimeout(10_000, () => {
      req.close(http2.constants.NGHTTP2_CANCEL);
      resolve({ status: 0, reason: 'timeout' });
    });
    req.end(body);
  });
}

async function deleteDeadToken(token: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/hotel_devices?device_token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  }).catch(() => undefined);
}

/** Push a TODOS los dispositivos del staff del hotel. Devuelve enviados. */
export async function sendHotelPush(payload: {
  title: string;
  body: string;
  sound?: string;
  url?: string;
}): Promise<number> {
  const env = apnsEnv();
  if (!env) return 0;

  const rows = await supabaseGet<{ device_token: string }>('hotel_devices', {
    select: 'device_token',
    platform: 'eq.ios',
  });
  if (rows.length === 0) return 0;

  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: payload.sound ?? 'default',
    },
    url: payload.url ?? '',
  });

  const jwt = providerJwt(env);
  const session = http2.connect(APNS_HOST);
  session.on('error', (err) => console.error('[apns-hotel] session error', err));

  let sent = 0;
  try {
    const results = await Promise.all(
      rows.map(async (row) => ({
        token: row.device_token,
        result: await sendOne(session, jwt, env.bundleId, row.device_token, body),
      }))
    );
    for (const { token, result } of results) {
      if (result.status === 200) sent++;
      else if (result.status === 410 || (result.status === 400 && result.reason === 'BadDeviceToken')) {
        await deleteDeadToken(token);
      } else {
        console.error(`[apns-hotel] send failed ${result.status} ${result.reason}`);
      }
    }
  } finally {
    session.close();
  }
  return sent;
}
