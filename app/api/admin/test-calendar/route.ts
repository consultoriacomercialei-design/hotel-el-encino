/**
 * GET /api/admin/test-calendar
 * Diagnóstico + auto-suscripción del service account al calendario.
 * Solo accesible para admins autenticados.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { getGoogleAccessToken, listAccessibleCalendars } from '@/app/lib/google-calendar';

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const result: Record<string, unknown> = {
    env_calendar_id: GOOGLE_CALENDAR_ID,
    env_calendar_id_length: GOOGLE_CALENDAR_ID.length,
    env_calendar_id_trimmed: GOOGLE_CALENDAR_ID.trim(),
    env_calendar_id_chars_end: [...GOOGLE_CALENDAR_ID].slice(-5).map(c => c.charCodeAt(0)),
    has_sa_json: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  };

  // 1. Check token
  const accessToken = await getGoogleAccessToken();
  result.token_ok = !!accessToken;
  if (!accessToken) {
    result.error = 'No se pudo obtener access token — revisar GOOGLE_SERVICE_ACCOUNT_JSON';
    return NextResponse.json(result);
  }

  // 2. Try subscribing the SA to the calendar (safe to call even if already subscribed)
  const subscribeRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: GOOGLE_CALENDAR_ID }),
    }
  );
  const subscribeBody = await subscribeRes.json();
  result.subscribe_status = subscribeRes.status;
  result.subscribe_ok = subscribeRes.ok || subscribeRes.status === 409; // 409 = already subscribed
  if (!subscribeRes.ok && subscribeRes.status !== 409) {
    result.subscribe_error = subscribeBody;
  }

  // 3. List accessible calendars (after subscribe attempt)
  const calendars = await listAccessibleCalendars();
  result.accessible_calendars = calendars;
  result.calendar_found = calendars.some(c => c.id === GOOGLE_CALENDAR_ID);

  // 4. Try creating a test event
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const calId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const createRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: '🧪 TEST DIAGNÓSTICO — Eliminar',
        description: 'Evento de prueba. Puedes eliminarlo.',
        start: { date: dateStr },
        end:   { date: dateStr },
      }),
    }
  );

  if (createRes.ok) {
    const ev = await createRes.json();
    result.test_event_created = true;
    result.test_event_id = ev.id;
    // Clean up
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${ev.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );
    result.test_event_deleted = true;
    result.status = '✅ CALENDARIO FUNCIONANDO CORRECTAMENTE';
  } else {
    const errText = await createRes.text();
    result.test_event_created = false;
    result.test_event_error = errText;
    result.status = '❌ Fallo al crear evento — ver test_event_error';
  }

  return NextResponse.json(result, { status: 200 });
}
