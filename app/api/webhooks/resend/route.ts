/**
 * Resend webhook — email events (opened, clicked, bounced, delivered)
 * Docs: https://resend.com/docs/dashboard/webhooks/event-types
 *
 * Setup: In Resend dashboard → Webhooks → add endpoint:
 *   URL: https://hotelelencino.com/api/webhooks/resend
 *   Events: email.opened, email.clicked, email.bounced, email.delivered
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verifica la firma Svix de Resend (svix-id/svix-timestamp/svix-signature).
 * Falla CERRADO: sin RESEND_WEBHOOK_SECRET, o firma inválida, se rechaza
 * (nadie puede reescribir el tracking de correos con un POST falso).
 * El secreto (whsec_...) sale del dashboard de Resend → Webhooks.
 */
function verifySvixSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = headers.get('svix-id');
  const svixTs = headers.get('svix-timestamp');
  const svixSig = headers.get('svix-signature');
  if (!secret || !svixId || !svixTs || !svixSig) return false;

  const keyB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(keyB64, 'base64');
  } catch {
    return false;
  }
  const signed = `${svixId}.${svixTs}.${rawBody}`;
  const expected = createHmac('sha256', keyBytes).update(signed).digest('base64');
  const expBuf = Buffer.from(expected);

  // svix-signature = "v1,<sig> v1,<sig2> ..." — aceptar si alguna coincide
  for (const part of svixSig.split(' ')) {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) return true;
  }
  return false;
}

type ResendEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
};

async function patchEmailLog(resendId: string, patch: Record<string, string>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/email_log?resend_id=eq.${encodeURIComponent(resendId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(patch),
    }
  ).catch(() => {});
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySvixSignature(rawBody, req.headers)) {
    console.error('[RESEND WEBHOOK] Firma inválida o RESEND_WEBHOOK_SECRET no configurado — rechazado');
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { type, created_at, data } = event;
  const emailId = data?.email_id;

  if (!emailId) {
    return NextResponse.json({ ok: true });
  }

  console.log(`[RESEND WEBHOOK] ${type} — email_id: ${emailId}`);

  if (type === 'email.opened') {
    await patchEmailLog(emailId, { opened_at: created_at });
  } else if (type === 'email.clicked') {
    await patchEmailLog(emailId, { clicked_at: created_at });
  } else if (type === 'email.bounced') {
    await patchEmailLog(emailId, { bounced_at: created_at });
  } else if (type === 'email.delivered') {
    await patchEmailLog(emailId, { delivered_at: created_at });
  }

  return NextResponse.json({ ok: true });
}
