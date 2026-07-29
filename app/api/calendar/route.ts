/**
 * GET /api/calendar
 * Returns a live iCal (.ics) feed of all confirmed/pending reservations.
 *
 * ⚠️ Expone datos personales de huéspedes — REQUIERE token.
 *
 * How to use:
 * - URL: https://hotelelencino.com/api/calendar?token=<CALENDAR_FEED_TOKEN>
 * - iPhone: Calendar app → Add Account → Other → Add Subscribed Calendar → paste URL
 * - Google Calendar: Settings → Other calendars → Add by URL → paste URL
 *
 * Without Supabase: returns an empty calendar (no errors).
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino',
  doble: 'Habitación Doble',
  grupal: 'Habitación Grupal',
};

function formatICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function nowUTC(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

interface Reservation {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  status: string;
  notes?: string;
  created_at: string;
}

async function fetchReservations(): Promise<Reservation[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];

  const params = new URLSearchParams({
    status: 'neq.cancelled',
    order: 'check_in.asc',
    select: 'id,guest_name,guest_phone,guest_email,room_type,check_in,check_out,nights,total_mxn,status,notes,created_at',
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/reservations?${params}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) return [];
  return res.json();
}

/**
 * El feed expone datos personales de huéspedes (nombre, teléfono, correo).
 * Exige token y FALLA CERRADO: si `CALENDAR_FEED_TOKEN` no está configurada,
 * nadie pasa. Comparación en tiempo constante para no filtrar el token.
 */
function tokenOk(req: NextRequest): boolean {
  const expected = process.env.CALENDAR_FEED_TOKEN;
  if (!expected) return false;

  const supplied =
    req.nextUrl.searchParams.get('token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  // Rate limit: 20 por hora por IP (feed de calendario)
  if (!limiters.calendar(getClientIP(req))) {
    return tooManyRequests();
  }

  if (!tokenOk(req)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const reservations = await fetchReservations();
  const dtstamp = nowUTC();

  const events = reservations.map((r) => {
    const room = ROOM_LABELS[r.room_type] || r.room_type;
    const summary = escapeICS(`${r.guest_name} · ${room}`);
    const description = escapeICS(
      [
        `Folio: ${r.id.slice(0, 8).toUpperCase()}`,
        `Habitación: ${room}`,
        `Huésped: ${r.guest_name}`,
        `Tel: ${r.guest_phone}`,
        `Total: $${r.total_mxn.toLocaleString('es-MX')} MXN`,
        r.notes ? `Notas: ${r.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );

    const statusMap: Record<string, string> = {
      pending: 'TENTATIVE',
      confirmed: 'CONFIRMED',
      pending_payment: 'TENTATIVE',
      waitlist: 'TENTATIVE',
      no_show: 'CANCELLED',
    };

    return [
      'BEGIN:VEVENT',
      `UID:${r.id}@hotelelencino.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatICSDate(r.check_in)}`,
      `DTEND;VALUE=DATE:${formatICSDate(r.check_out)}`,
      `SUMMARY:🏨 ${summary}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Hotel El Encino\\, Hermenegildo Galeana 200\\, Santiago\\, Nuevo León',
      `STATUS:${statusMap[r.status] || 'TENTATIVE'}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hotel El Encino//Reservaciones//ES',
    'X-WR-CALNAME:Reservaciones Hotel El Encino',
    'X-WR-TIMEZONE:America/Mexico_City',
    'X-WR-CALDESC:Reservaciones del Hotel El Encino Santiago N.L.',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hotel-el-encino.ics"',
      'Cache-Control': 'no-cache',
    },
  });
}
