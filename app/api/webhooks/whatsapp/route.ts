/**
 * WhatsApp Cloud API webhook
 *
 * GET  — Meta webhook verification (challenge response)
 * POST — Process incoming messages, run AI agent, respond
 *
 * Env vars: WA_VERIFY_TOKEN, WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendText, markRead } from '@/app/lib/whatsapp-cloud';
import { handleWAMessage } from '@/app/lib/wa-agent';

const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN;

/**
 * Verifica la firma X-Hub-Signature-256 de Meta contra el App Secret.
 * Falla CERRADO: sin WA_APP_SECRET configurado, o con firma inválida,
 * se rechaza el webhook (nadie puede inyectar mensajes falsos que
 * disparen el LLM o envíen WhatsApp desde el número del hotel).
 */
function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.WA_APP_SECRET;
  if (!appSecret || !signature) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── GET: webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WA-WEBHOOK] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  console.error('[WA-WEBHOOK] Verification failed — token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST: incoming messages ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificar firma de Meta ANTES de procesar (falla cerrado)
  if (!verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    console.error('[WA-WEBHOOK] Firma inválida o WA_APP_SECRET no configurado — rechazado');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Always respond 200 immediately so Meta doesn't retry
  // Process in background
  processWebhook(body).catch(e => console.error('[WA-WEBHOOK] Processing error:', e));

  return NextResponse.json({ status: 'ok' });
}

async function processWebhook(body: Record<string, unknown>) {
  if (body.object !== 'whatsapp_business_account') return;

  const entries = (body.entry as Record<string, unknown>[]) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[]) ?? [];

    for (const change of changes) {
      const value = change.value as Record<string, unknown>;
      if (!value) continue;

      const messages = (value.messages as Record<string, unknown>[]) ?? [];
      const contacts = (value.contacts as Record<string, unknown>[]) ?? [];

      for (const msg of messages) {
        // Only handle text messages for now
        if (msg.type !== 'text') {
          console.log(`[WA-WEBHOOK] Non-text message type: ${msg.type} — skipping`);
          continue;
        }

        const messageId = msg.id as string;
        const from      = msg.from as string;             // phone number with country code
        const text      = (msg.text as { body: string })?.body ?? '';

        // Get contact name
        const contact = contacts.find((c: Record<string, unknown>) => (c as { wa_id: string }).wa_id === from) as { profile?: { name?: string } } | undefined;
        const name    = contact?.profile?.name ?? 'Huésped';

        if (!text.trim()) continue;

        console.log(`[WA-WEBHOOK] Message from ${from} (${name}): ${text.slice(0, 100)}`);

        // Mark as read
        await markRead(messageId);

        // Run AI agent
        try {
          const reply = await handleWAMessage(from, name, text);
          await sendText(from, reply);
          console.log(`[WA-WEBHOOK] Replied to ${from}: ${reply.slice(0, 80)}...`);
        } catch (e) {
          console.error(`[WA-WEBHOOK] Agent error for ${from}:`, e);
          await sendText(from, 'Lo siento, hubo un problema técnico. Por favor llámanos al +52 (81) 2381 6588. 🙏');
        }
      }
    }
  }
}
