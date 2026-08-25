import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { sendReservationUpdatedEmail } from '@/app/lib/emails';
import { parseOccupancy, quoteExpress, roomAvailability } from '@/app/lib/express-quote';

export const dynamic = 'force-dynamic';

// PATCH /api/mobile/reservations/[id] — b19: EDITOR UNIFICADO. La app manda el
// estado COMPLETO deseado (huésped, fechas, ocupación por habitación, cuartos
// asignados, total negociable y notas) y el servidor valida todo junto:
// fechas, topes por habitación, aforo real, choques de cuartos físicos.
// Una sola escritura; correo de cambios al huésped si algo suyo cambió.
// Los endpoints viejos (/dates, /occupancy, /rooms) quedan por compat b13-b18.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as {
    guest_name?: string; guest_phone?: string; guest_email?: string; notes?: string;
    check_in?: string; check_out?: string;
    occupancy?: unknown; assigned_rooms?: unknown; total_mxn?: number;
  };

  const rows = await supabaseGet<{
    id: string; folio: string | null; status: string;
    guest_name: string; guest_email: string | null; room: string | null;
    check_in: string; check_out: string; nights: number | null;
    rooms: number | null; total_mxn: number | null; checkin_at: string | null;
  }>('reservations', {
    select: 'id,folio,status,guest_name,guest_email,room,check_in,check_out,nights,rooms,total_mxn,checkin_at',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (!['confirmed', 'pending_payment'].includes(r.status)) {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  const name = (b.guest_name ?? r.guest_name).trim().slice(0, 120);
  if (!name) return NextResponse.json({ success: false, error: 'Falta el nombre del huésped' }, { status: 400 });

  const checkIn = b.check_in ?? r.check_in;
  const checkOut = b.check_out ?? r.check_out;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ success: false, error: 'Fechas inválidas (la salida debe ser después de la llegada)' }, { status: 400 });
  }
  const total = Number(b.total_mxn ?? r.total_mxn);
  if (!Number.isFinite(total) || total < 0 || total > 500_000) {
    return NextResponse.json({ success: false, error: 'Total inválido' }, { status: 400 });
  }

  let occupancy;
  try {
    occupancy = parseOccupancy(b.occupancy);
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Ocupación inválida' }, { status: 400 });
  }

  let quote;
  let availability;
  try {
    [quote, availability] = await Promise.all([
      quoteExpress({ checkIn, checkOut, occupancy }),
      roomAvailability({ checkIn, checkOut, excludeId: id }),
    ]);
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'No se pudo validar' }, { status: 400 });
  }

  const roomsLeft = availability.totalRooms - availability.occupiedCount;
  if (occupancy.length > roomsLeft) {
    return NextResponse.json(
      { success: false, error: `Solo quedan ${Math.max(roomsLeft, 0)} habitación(es) libres en esas fechas` },
      { status: 409 }
    );
  }

  const wanted = [...new Set(
    (Array.isArray(b.assigned_rooms) ? b.assigned_rooms : [])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
  )];
  if (wanted.length > occupancy.length) {
    return NextResponse.json(
      { success: false, error: `La reserva es de ${occupancy.length} habitación(es); no puedes asignar ${wanted.length}` },
      { status: 400 }
    );
  }
  const freeSet = new Set(availability.freeRooms);
  const clash = wanted.find((w) => !freeSet.has(w));
  if (clash) {
    return NextResponse.json(
      { success: false, error: availability.taken.has(clash)
          ? `El ${clash} ya está tomado por otra reserva en esas fechas`
          : `El cuarto "${clash}" no existe` },
      { status: 409 }
    );
  }
  // Con check-in hecho no se le quita el cuarto al huésped en casa.
  const room = wanted[0] ?? (r.checkin_at ? r.room : null);

  const adults = occupancy.reduce((s, o) => s + o.adults, 0);
  const children = occupancy.reduce((s, o) => s + o.children, 0);

  const ok = await supabasePatch('reservations', id, {
    guest_name: name,
    guest_phone: (b.guest_phone ?? '').trim().slice(0, 30) || null,
    guest_email: (b.guest_email ?? '').trim().slice(0, 120) || null,
    notes: (b.notes ?? '').trim().slice(0, 500) || null,
    check_in: checkIn,
    check_out: checkOut,
    nights: quote.nights,
    adults,
    children,
    occupancy,
    rooms: occupancy.length,
    assigned_rooms: wanted.length > 0 ? wanted : null,
    room,
    total_mxn: total,
    occupancy_surcharge_mxn: quote.surcharge_mxn,
    edited_at: new Date().toISOString(),
    edited_by: staff.full_name,
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });

  // Aviso al huésped SOLO si cambió algo que le afecta (fechas/gente/total).
  const guestEmail = (b.guest_email ?? '').trim() || r.guest_email;
  const datesChanged = checkIn !== r.check_in || checkOut !== r.check_out;
  const peopleChanged = occupancy.length !== (r.rooms ?? 1);
  const totalChanged = Math.round(total) !== Math.round(r.total_mxn ?? 0);
  if (guestEmail && (datesChanged || peopleChanged || totalChanged)) {
    const lines: string[] = [];
    if (datesChanged) {
      lines.push(`📅 Nuevas fechas: llegada <strong>${checkIn}</strong> · salida <strong>${checkOut}</strong> (${quote.nights} noche${quote.nights === 1 ? '' : 's'})`);
    }
    if (peopleChanged || datesChanged) {
      lines.push(`🛏️ <strong>${occupancy.length} habitación${occupancy.length === 1 ? '' : 'es'}</strong> · ${adults} adulto(s)${children > 0 ? ` y ${children} niño(s)` : ''}`);
    }
    lines.push(`💰 Total: <strong>$${total.toLocaleString('es-MX')} MXN</strong>`);
    sendReservationUpdatedEmail({
      reservationId: r.id,
      folio: r.folio ?? '',
      guestName: name,
      guestEmail,
      lines,
    }).catch((e: unknown) => console.error('[edit] update email failed', e));
  }

  return NextResponse.json({
    success: true,
    data: {
      nights: quote.nights,
      total_mxn: total,
      suggested_total: quote.total_mxn,
      rooms: occupancy.length,
      adults,
      children,
      assigned_rooms: wanted,
    },
  });
}
