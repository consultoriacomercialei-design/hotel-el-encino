/**
 * Google Calendar helpers — no external packages
 * JWT auth via service account
 */

import crypto from 'crypto';

const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const GOOGLE_CALENDAR_ID = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

export const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino',
  doble: 'Habitación Doble',
  grupal: 'Habitación Grupal',
};

function b64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getGoogleAccessToken(): Promise<string | null> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  try {
    const sa = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    const now = Math.floor(Date.now() / 1000);

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));

    const sigInput = `${header}.${claims}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(sigInput);
    const signature = b64url(sign.sign(sa.private_key));
    const jwt = `${sigInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[CALENDAR] Token error:', await tokenRes.text());
      return null;
    }
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
  } catch (e) {
    console.error('[CALENDAR] JWT error:', e);
    return null;
  }
}

export interface CalendarPayload {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  room_type: string;
  check_in: string;
  check_out: string;
  total_mxn: number;
  adults?: number;
  children?: number;
  rooms?: number;
  notes?: string;
}

/**
 * colorId guide:
 *   '2'  = Sage/verde    → confirmed
 *   '10' = Basil/musgo   → pending (pagar al llegar)
 *   '11' = Tomato/rojo   → waitlist / sobrecupo
 */
export async function createCalendarEvent(
  payload: CalendarPayload,
  folio: string,
  colorId = '2'
): Promise<void> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn('[CALENDAR] GOOGLE_SERVICE_ACCOUNT_JSON no configurada — omitiendo evento para', folio);
    return;
  }
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    console.error('[CALENDAR] No se pudo obtener access token — omitiendo evento para', folio);
    return;
  }

  const room = ROOM_LABELS[payload.room_type] || payload.room_type;
  const descLines = [
    `Folio: ${folio}`,
    `Huésped: ${payload.guest_name}`,
    `Tel: ${payload.guest_phone}`,
    `Email: ${payload.guest_email}`,
    payload.adults ? `Adultos: ${payload.adults}` : '',
    payload.children ? `Niños: ${payload.children}` : '',
    payload.rooms && payload.rooms > 1 ? `Habitaciones: ${payload.rooms}` : '',
    `Total: $${payload.total_mxn.toLocaleString('es-MX')} MXN`,
    payload.notes ? `Notas: ${payload.notes}` : '',
  ].filter(Boolean).join('\n');

  const event = {
    summary: `🏨 ${payload.guest_name} · ${room}`,
    location: 'Hermenegildo Galeana 200, Santiago, Nuevo León',
    description: descLines,
    start: { date: payload.check_in },
    end: { date: payload.check_out },
    colorId,
  };

  const calId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (res.ok) {
    const ev = await res.json();
    console.log(`[CALENDAR] Evento creado: ${ev.id} — ${payload.guest_name} · ${payload.check_in} (colorId: ${colorId})`);
  } else {
    const errText = await res.text();
    console.error(`[CALENDAR] Error al crear evento (calId: ${GOOGLE_CALENDAR_ID}):`, errText);
  }
}

/**
 * Delete a single calendar event by its Google event ID.
 * Returns true on success or if already deleted (404).
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return false;
  const calId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok || res.status === 204 || res.status === 404) {
      console.log(`[CALENDAR] Evento ${eventId} eliminado`);
      return true;
    }
    console.error('[CALENDAR] Error al eliminar evento:', res.status, await res.text());
    return false;
  } catch (e) {
    console.error('[CALENDAR] deleteCalendarEvent exception:', e);
    return false;
  }
}

/**
 * Search Google Calendar events by a text query and delete all matches.
 * Returns the number of events deleted.
 */
async function searchAndDeleteByQuery(query: string, accessToken: string): Promise<number> {
  const calId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const params = new URLSearchParams({
    q:            query,
    maxResults:   '20',
    singleEvents: 'true',
    timeMin:      new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString(), // 2 years back
    timeMax:      new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString(), // 2 years forward
  });
  const searchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!searchRes.ok) {
    console.error('[CALENDAR] Error buscando eventos:', query, await searchRes.text());
    return 0;
  }
  const data = await searchRes.json();
  const events: { id: string; summary?: string }[] = data.items ?? [];
  if (!events.length) return 0;
  await Promise.all(events.map(ev => deleteCalendarEvent(ev.id)));
  return events.length;
}

/**
 * Searches Google Calendar for all events that mention the given folio
 * in their description or summary, and deletes them.
 * Falls back to searching by guest name if folio search finds nothing.
 * Fire-and-forget safe — errors are logged but not thrown.
 */
export async function findAndDeleteCalendarEventsByFolio(
  folio: string,
  guestName?: string,
): Promise<void> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) return;
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return;

  try {
    // Primary search: by folio (exact match in description)
    let deleted = await searchAndDeleteByQuery(folio, accessToken);
    console.log(`[CALENDAR] findAndDelete folio "${folio}": ${deleted} evento(s) eliminados`);

    // Fallback: if folio search found nothing and we have a guest name, try by name
    if (deleted === 0 && guestName) {
      deleted = await searchAndDeleteByQuery(guestName, accessToken);
      console.log(`[CALENDAR] findAndDelete nombre "${guestName}": ${deleted} evento(s) eliminados`);
    }

    if (deleted === 0) {
      console.log(`[CALENDAR] findAndDelete: sin eventos encontrados para folio ${folio}${guestName ? ` / ${guestName}` : ''}`);
    }
  } catch (e) {
    console.error('[CALENDAR] findAndDeleteCalendarEventsByFolio exception:', e);
  }
}

export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end:   { date?: string; dateTime?: string };
  colorId?: string;
  status?: string;
}

/**
 * Lists all events from Google Calendar for a given month.
 * Used by the admin calendar to show GCal as the primary source.
 */
export async function listCalendarEventsForMonth(year: number, month: number): Promise<GCalEvent[]> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) return [];
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return [];

  const timeMin = new Date(year, month - 1, 1).toISOString();
  const timeMax = new Date(year, month,     1).toISOString(); // first moment of next month
  const calId   = encodeURIComponent(GOOGLE_CALENDAR_ID);

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '250',
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Cache-Control': 'no-store' } },
    );
    if (!res.ok) {
      console.error('[CALENDAR] listEvents error:', await res.text());
      return [];
    }
    const data = await res.json();
    return (data.items ?? []) as GCalEvent[];
  } catch (e) {
    console.error('[CALENDAR] listEvents exception:', e);
    return [];
  }
}

/** Diagnostic: list calendars visible to the service account */
export async function listAccessibleCalendars(): Promise<{ id: string; summary: string; accessRole: string }[]> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return [];
  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      console.error('[CALENDAR] listCalendars error:', await res.text());
      return [];
    }
    const data = await res.json();
    return (data.items ?? []).map((c: { id: string; summary: string; accessRole: string }) => ({
      id: c.id,
      summary: c.summary,
      accessRole: c.accessRole,
    }));
  } catch (e) {
    console.error('[CALENDAR] listCalendars exception:', e);
    return [];
  }
}
