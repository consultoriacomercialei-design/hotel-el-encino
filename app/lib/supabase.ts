/**
 * Supabase helpers — server-side only
 * Uses service key for writes, anon key for reads
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function supabaseGet<T>(
  table: string,
  params: Record<string, string>,
  useServiceKey = true
): Promise<T[]> {
  if (!SUPABASE_URL) return [];
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  if (!key) return [];

  const qs = new URLSearchParams(params);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Cache-Control': 'no-store',
    },
  });
  if (!res.ok) {
    console.error(`[SUPABASE] GET ${table} error:`, await res.text());
    return [];
  }
  return res.json();
}

export async function supabasePost<T>(
  table: string,
  body: Record<string, unknown>
): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '(no body)');
    console.error(`[SUPABASE] POST ${table} error ${res.status}:`, errText);
    throw new Error(`Error al guardar en base de datos (${res.status}): ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.[0] ?? null;
}

export async function supabasePatch(
  table: string,
  id: string,
  body: Record<string, unknown>,
  extraWhere?: Record<string, string>
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  const extra = extraWhere ? '&' + new URLSearchParams(extraWhere).toString() : '';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}${extra}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      // return=representation: Supabase returns the updated rows as JSON array.
      // Empty array = 0 rows matched the WHERE clause (idempotency check).
      // Non-empty = rows were actually updated.
      // (return=minimal always returns 204 even for 0-row updates — useless for idempotency)
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[SUPABASE] PATCH ${table} ${id} error ${res.status}:`, errText);
    return false;
  }
  try {
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/** Soft delete: sets status='cancelled' */
export async function supabaseDelete(table: string, id: string): Promise<boolean> {
  return supabasePatch(table, id, { status: 'cancelled' });
}

/** Fire-and-forget email send log — never throws, never blocks */
export function logEmailSent(data: {
  reservation_id: string;
  email_type: string;
  recipient_email: string;
  subject?: string;
  resend_id?: string;
}): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/email_log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(data),
  }).catch(() => {});
}

/** Fire-and-forget webhook event log — never throws, never blocks */
export function logWebhookEvent(data: {
  source: string;
  payment_id?: string;
  payment_status?: string;
  reservation_id?: string;
  folio?: string;
  sig_valid: boolean;
  action: string;
  error_msg?: string;
  raw_event?: unknown;
}): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(data),
  }).catch(() => {});
}

/** Fire-and-forget structured audit log — never throws, never blocks the request path.
 *  Requires the audit_log table to exist (run supabase/migrations/20260514_audit_log.sql). */
export function logAuditEvent(data: {
  event:          string;           // e.g. 'reservation.created', 'payment.initiated'
  status?:        string;           // 'ok' | 'error' | 'duplicate' | 'blocked'
  reservation_id?: string;
  folio?:         string;
  guest_email?:   string;
  ip?:            string;
  user_agent?:    string;
  details?:       Record<string, unknown>;
}): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(data),
  }).catch(() => {}); // never propagate — audit must not break the main flow
}

/** Returns 'RSV-01' style folio using atomic DB sequence. Falls back to timestamp. */
export async function getNextFolio(): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return `RSV-${String(Date.now()).slice(-4)}`;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_folio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: '{}',
    });
    if (res.ok) {
      const folio = await res.json();
      return folio as string;
    }
  } catch { /* fallback */ }
  // Fallback: find MAX folio number (safe after deletions — never relies on count)
  try {
    const maxRes = await fetch(
      `${SUPABASE_URL}/rest/v1/reservations?select=folio&folio=like.RSV-*&order=folio.desc&limit=100`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (maxRes.ok) {
      const rows: { folio: string }[] = await maxRes.json();
      const maxNum = rows.reduce((max, r) => {
        const n = parseInt(r.folio.replace('RSV-', ''), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      return `RSV-${String(maxNum + 1).padStart(2, '0')}`;
    }
  } catch { /* ignore */ }
  return `RSV-${String(Date.now()).slice(-4)}`;
}
