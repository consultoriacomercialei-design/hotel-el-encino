/**
 * Lista negra de huéspedes
 * Bloquea email/teléfono para nuevas reservaciones desde la web.
 */

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serviceHeaders() {
  return {
    apikey:          SUPABASE_SERVICE_KEY!,
    Authorization:   `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };
}

export async function isBlacklisted(email?: string): Promise<boolean> {
  if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  try {
    const qs = new URLSearchParams({
      select: 'id',
      email:  `eq.${email.toLowerCase().trim()}`,
      limit:  '1',
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blacklist?${qs}`, {
      headers: serviceHeaders(),
    });
    if (!res.ok) return false;
    const rows: unknown[] = await res.json();
    return rows.length > 0;
  } catch {
    return false; // Never block reservations on DB errors
  }
}

export async function addToBlacklist(data: {
  email: string;
  phone?: string;
  guest_name: string;
  reason?: string;
  reservation_id?: string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/blacklist`, {
    method: 'POST',
    headers: { ...serviceHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      email:          data.email.toLowerCase().trim(),
      phone:          data.phone ?? null,
      guest_name:     data.guest_name,
      reason:         data.reason ?? null,
      reservation_id: data.reservation_id ?? null,
    }),
  });
}

export async function removeFromBlacklist(email: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/blacklist?email=eq.${encodeURIComponent(email.toLowerCase().trim())}`,
    { method: 'DELETE', headers: serviceHeaders() }
  );
}

export async function getBlacklistEntry(email: string): Promise<{ id: string; reason?: string } | null> {
  if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const qs = new URLSearchParams({ select: 'id,reason', email: `eq.${email.toLowerCase().trim()}`, limit: '1' });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blacklist?${qs}`, { headers: serviceHeaders() });
    if (!res.ok) return null;
    const rows: { id: string; reason?: string }[] = await res.json();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
