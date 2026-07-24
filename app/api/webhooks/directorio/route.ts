import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseGet } from '@/app/lib/supabase';
import {
  createCalendarEvent,
  findAndDeleteCalendarEventsByFolio,
  type CalendarPayload,
} from '@/app/lib/google-calendar';
import {
  sendDirectorioNewReservationEmail,
  sendDirectorioCancelledEmail,
  type FullReservation,
} from '@/app/lib/emails';

export const runtime = 'nodejs';

/**
 * Webhook que dispara el Directorio Santiago al confirmar/cancelar una reserva
 * espejo (fila `reservations` con source='directorio', insertada por el
 * Directorio en la base compartida). Aquí corre el flujo NATIVO del hotel:
 * evento en Google Calendar + correo interno "Nueva reservación" a
 * HOTEL_EMAIL + ADMIN_EMAIL. El Directorio no sabe cómo notifica el hotel;
 * este endpoint no sabe nada del Directorio más allá del aviso.
 *
 * Auth: header X-Webhook-Secret contra DIRECTORIO_WEBHOOK_SECRET (fail closed).
 * Body: { reservation_id: uuid, action?: 'confirmed' | 'cancelled' }
 */

function secretOk(given: string | null): boolean {
  const secret = process.env.DIRECTORIO_WEBHOOK_SECRET;
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  if (!process.env.DIRECTORIO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 });
  }
  if (!secretOk(req.headers.get('x-webhook-secret'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { reservation_id?: string; action?: string; guest_notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const reservationId = body.reservation_id ?? '';
  const action = body.action === 'cancelled' ? 'cancelled' : 'confirmed';
  // Comentarios del huésped (los manda el Directorio en el payload) — para que
  // el anfitrión los vea en SU correo de "Nueva reservación".
  const guestNotes = typeof body.guest_notes === 'string' ? body.guest_notes.trim() : '';
  if (!UUID_RE.test(reservationId)) {
    return NextResponse.json({ error: 'reservation_id inválido' }, { status: 400 });
  }

  // SOLO filas espejo del Directorio — este webhook no toca reservas nativas.
  const rows = await supabaseGet<FullReservation>('reservations', {
    id: `eq.${reservationId}`,
    source: 'eq.directorio',
    select:
      'id,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,folio,status,source',
  });
  if (!rows.length) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  const r = rows[0];

  const calPayload: CalendarPayload = {
    guest_name: r.guest_name,
    guest_phone: r.guest_phone,
    guest_email: r.guest_email,
    room_type: r.room_type,
    check_in: r.check_in,
    check_out: r.check_out,
    total_mxn: r.total_mxn,
    adults: r.adults,
    children: r.children,
    rooms: r.rooms,
    notes: r.notes,
  };

  try {
    if (action === 'confirmed') {
      if (r.status !== 'confirmed') {
        return NextResponse.json({ ok: false, skipped: `status ${r.status}` });
      }
      // Idempotente: si el aviso se repite, no duplica el evento del calendario.
      await findAndDeleteCalendarEventsByFolio(r.folio);
      await Promise.all([
        createCalendarEvent(calPayload, r.folio, '2'),
        sendDirectorioNewReservationEmail(r, guestNotes),
      ]);
    } else {
      await findAndDeleteCalendarEventsByFolio(r.folio);
      await sendDirectorioCancelledEmail(r);
    }
  } catch (err) {
    console.error(`[WEBHOOK/DIRECTORIO] error procesando ${r.folio} (${action}):`, err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  console.log(`[WEBHOOK/DIRECTORIO] ${action} · ${r.folio} · ${r.guest_name}`);
  return NextResponse.json({ ok: true, action, folio: r.folio });
}
