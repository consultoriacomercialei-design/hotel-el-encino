/**
 * PATCH /api/admin/reservations/[id]
 *   Body: { action: 'confirm' | 'mark_paid' | 'cancel' | 'no_show' }
 *
 * DELETE /api/admin/reservations/[id]  — soft delete (status='cancelled')
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabasePatch, supabaseGet, supabaseDelete } from '@/app/lib/supabase';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';
import { createCalendarEvent, type CalendarPayload } from '@/app/lib/google-calendar';
import { sendConfirmedEmails, sendPaymentConfirmedEmails, type FullReservation, type LineItem } from '@/app/lib/emails';
import { propagateDirectorioCancel } from '@/app/lib/directorio-cancel';

type Params = { params: Promise<{ id: string }> };

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get('hotel_admin_session')?.value;
  return verifyAdminToken(token);
}

async function fetchReservation(id: string): Promise<FullReservation | null> {
  const rows = await supabaseGet<FullReservation>(
    'reservations',
    {
      'id': `eq.${id}`,
      select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at',
    },
    true
  );
  return rows[0] || null;
}

const ALLOWED_ACTIONS = ['confirm', 'mark_paid', 'cancel', 'no_show', 'edit'] as const;

const VALID_ROOM_TYPES = ['suite', 'doble', 'grupal'] as const;
const VALID_PAYMENT_METHODS = ['online', 'pending', 'cash', 'transfer', 'card'] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!limiters.admin(getClientIP(req))) return tooManyRequests();
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  // Validate ID format
  if (!id || !/^[a-zA-Z0-9\-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === 'string' ? body.action : '';

  // Whitelist action values
  if (!ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const reservation = await fetchReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
  }

  if (action === 'confirm' as string) {
    await supabasePatch('reservations', id, { status: 'confirmed' });

    const calPayload: CalendarPayload = {
      guest_name:  reservation.guest_name,
      guest_phone: reservation.guest_phone,
      guest_email: reservation.guest_email,
      room_type:   reservation.room_type,
      check_in:    reservation.check_in,
      check_out:   reservation.check_out,
      total_mxn:   reservation.total_mxn,
      adults:      reservation.adults,
      children:    reservation.children,
      rooms:       reservation.rooms,
      notes:       reservation.notes,
    };

    // Si el método es 'online' (MP), siempre mandar email de "pago recibido"
    // aunque el webhook no haya guardado el payment_id todavía
    const paidByMP = reservation.payment_method === 'online';
    if (paidByMP && !reservation.paid_at) {
      // Webhook no procesó — registrar paid_at manualmente
      await supabasePatch('reservations', id, { paid_at: new Date().toISOString() });
    }
    await Promise.all([
      createCalendarEvent(calPayload, reservation.folio, '2'),
      paidByMP
        ? sendPaymentConfirmedEmails({ ...reservation, paid_at: reservation.paid_at ?? new Date().toISOString() })
        : sendConfirmedEmails(reservation, reservation.id, reservation.folio),
    ]);

    return NextResponse.json({ ok: true, status: 'confirmed' });
  }

  if (action === 'mark_paid') {
    await supabasePatch('reservations', id, {
      status: 'confirmed',
      payment_method: 'cash',
      paid_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, status: 'confirmed' });
  }

  if (action === 'cancel') {
    await supabasePatch('reservations', id, { status: 'cancelled' });
    // Si es un espejo del Directorio, liberar también su reserva en la app iOS.
    await propagateDirectorioCancel(reservation.notes);
    return NextResponse.json({ ok: true, status: 'cancelled' });
  }

  if (action === 'no_show') {
    await supabasePatch('reservations', id, { status: 'no_show' });
    return NextResponse.json({ ok: true, status: 'no_show' });
  }

  if (action === 'edit') {
    const update: Record<string, unknown> = {
      edited_at: new Date().toISOString(),
      edited_by: 'admin',
    };

    const { check_in, check_out, nights, total_mxn, rooms, notes, room_type, payment_method, line_items } = body as Record<string, unknown>;

    if (typeof check_in === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(check_in)) update.check_in = check_in;
    if (typeof check_out === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(check_out)) update.check_out = check_out;
    if (typeof nights === 'number' && nights > 0 && nights < 365) update.nights = Math.floor(nights);
    if (typeof total_mxn === 'number' && total_mxn >= 0) update.total_mxn = Math.round(total_mxn);
    if (typeof rooms === 'number' && rooms > 0 && rooms < 100) update.rooms = Math.floor(rooms);
    if (typeof notes === 'string') update.notes = notes.slice(0, 1000);
    if (typeof room_type === 'string' && (VALID_ROOM_TYPES as readonly string[]).includes(room_type)) update.room_type = room_type;
    if (typeof payment_method === 'string' && (VALID_PAYMENT_METHODS as readonly string[]).includes(payment_method)) update.payment_method = payment_method;

    if (Array.isArray(line_items)) {
      const validated: LineItem[] = (line_items as unknown[])
        .filter((item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null &&
          typeof (item as Record<string, unknown>).description === 'string' &&
          typeof (item as Record<string, unknown>).amount === 'number' &&
          Number((item as Record<string, unknown>).amount) >= 0
        )
        .map(item => ({
          description: String(item.description).slice(0, 200),
          amount: Math.round(Number(item.amount) * 100) / 100,
          ...(typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? { date: item.date } : {}),
          ...(typeof item.nights === 'number' && item.nights > 0 ? { nights: Math.floor(item.nights) } : {}),
        }));
      update.line_items = validated;
    }

    if (Object.keys(update).length <= 2) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
    }

    await supabasePatch('reservations', id, update);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!limiters.admin(getClientIP(req))) return tooManyRequests();
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;
  if (!id || !/^[a-zA-Z0-9\-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  // Leer notes ANTES de borrar para poder propagar al Directorio si es espejo.
  const reservation = await fetchReservation(id);
  await supabaseDelete('reservations', id);
  if (reservation) await propagateDirectorioCancel(reservation.notes);
  return NextResponse.json({ ok: true });
}
