/**
 * Resend webhook — email events (opened, clicked, bounced, delivered)
 * Docs: https://resend.com/docs/dashboard/webhooks/event-types
 *
 * Setup: In Resend dashboard → Webhooks → add endpoint:
 *   URL: https://hotelelencino.com/api/webhooks/resend
 *   Events: email.opened, email.clicked, email.bounced, email.delivered
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  let event: ResendEvent;
  try {
    event = await req.json() as ResendEvent;
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
