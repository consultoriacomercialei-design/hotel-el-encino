/**
 * WhatsApp Cloud API helpers — send messages, mark as read
 * Env vars required: WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN
 */

const GRAPH_API = 'https://graph.facebook.com/v20.0';

function getPhoneId() { return process.env.WA_PHONE_NUMBER_ID?.trim(); }
function getToken()   { return process.env.WA_ACCESS_TOKEN?.trim(); }

/** Send a plain text message */
export async function sendText(to: string, text: string): Promise<void> {
  const phoneId = getPhoneId();
  const token   = getToken();
  if (!phoneId || !token) {
    console.error('[WA] Missing WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN');
    return;
  }
  const res = await fetch(`${GRAPH_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    }),
  });
  if (!res.ok) console.error('[WA] sendText error:', await res.text());
}

/** Mark an incoming message as read (shows double blue check) */
export async function markRead(messageId: string): Promise<void> {
  const phoneId = getPhoneId();
  const token   = getToken();
  if (!phoneId || !token) return;
  await fetch(`${GRAPH_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(e => console.error('[WA] markRead error:', e));
}
