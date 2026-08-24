import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { sendReservationUpdatedEmail } from '@/app/lib/emails';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Aforo real: cuartos registrados en la app (cero hardcode; 3 = red de seguridad). */
async function totalRoomCount(): Promise<number> {
  const rows = await supabaseGet<{ room: string }>('hotel_rooms_state', {
    select: 'room',
    limit: '50',
  }).catch(() => [] as { room: string }[]);
  return Math.max(rows.length, 3);
}

interface LineItem { amount_mxn?: number }

// PATCH /api/mobile/reservations/[id]/dates — edición completa de fechas (b9).
// {check_in, check_out} en YYYY-MM-DD. Valida traslape (mismo cuarto / aforo 3)
// y recalcula el total conservando la tarifa nocturna original + extras.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { check_in?: string; check_out?: string };
  const checkIn = body.check_in ?? '';
  const checkOut = body.check_out ?? '';
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) {
    return NextResponse.json({ success: false, error: 'Fechas inválidas (YYYY-MM-DD)' }, { status: 400 });
  }
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  if (!Number.isFinite(nights) || nights < 1 || nights > 365) {
    return NextResponse.json({ success: false, error: 'La salida debe ser después de la llegada' }, { status: 400 });
  }

  const rows = await supabaseGet<{
    id: string; status: string; room: string | null; rooms: number | null;
    check_in: string; check_out: string; nights: number | null;
    total_mxn: number | null; line_items: LineItem[] | null;
    folio: string | null; guest_name: string; guest_email: string | null;
  }>('reservations', {
    select: 'id,status,room,rooms,check_in,check_out,nights,total_mxn,line_items,folio,guest_name,guest_email',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (!['confirmed', 'pending_payment'].includes(r.status)) {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  // Traslape contra otras reservas vivas en el rango NUEVO (patrón de extend).
  const overlapping = await supabaseGet<{ id: string; room: string | null; rooms: number | null }>('reservations', {
    select: 'id,room,rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `lt.${checkOut}`,
    check_out: `gt.${checkIn}`,
    id: `neq.${id}`,
    limit: '50',
  });
  if (r.room && overlapping.some((o) => o.room === r.room)) {
    return NextResponse.json(
      { success: false, error: `El cuarto ${r.room} ya está reservado en esas fechas` },
      { status: 409 }
    );
  }
  const occupied = overlapping.reduce((s, o) => s + Math.max(o.rooms ?? 1, 1), 0);
  if (occupied + Math.max(r.rooms ?? 1, 1) > await totalRoomCount()) {
    return NextResponse.json(
      { success: false, error: 'El hotel está lleno en esas fechas' },
      { status: 409 }
    );
  }

  // Recalcular: tarifa nocturna base = (total − extras) / noches originales.
  // La nocturna NO se redondea (tarifas negociadas como $2,119.50 se
  // preservan al centavo); solo el total final se redondea a centavos.
  const extras = (Array.isArray(r.line_items) ? r.line_items : [])
    .reduce((s, li) => s + (typeof li.amount_mxn === 'number' ? li.amount_mxn : 0), 0);
  const oldNights = r.nights && r.nights > 0 ? r.nights : 1;
  const base = Math.max((r.total_mxn ?? 0) - extras, 0);
  const nightly = base / oldNights;
  const newTotal = Math.round((nightly * nights + extras) * 100) / 100;

  const ok = await supabasePatch('reservations', id, {
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total_mxn: newTotal,
    edited_at: new Date().toISOString(),
    edited_by: staff.full_name,
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });

  // b13: avisar al huésped del cambio (queda en email_log con tracking).
  if (r.guest_email) {
    sendReservationUpdatedEmail({
      reservationId: r.id,
      folio: r.folio ?? '',
      guestName: r.guest_name,
      guestEmail: r.guest_email,
      lines: [
        `📅 Nuevas fechas: llegada <strong>${checkIn}</strong> · salida <strong>${checkOut}</strong> (${nights} noche${nights === 1 ? '' : 's'})`,
        `💰 Total: <strong>$${newTotal.toLocaleString('es-MX')} MXN</strong>`,
      ],
    }).catch((e: unknown) => console.error('[dates] update email failed', e));
  }

  return NextResponse.json({
    success: true,
    data: { check_in: checkIn, check_out: checkOut, nights, total_mxn: newTotal, nightly_mxn: Math.round(nightly * 100) / 100 },
  });
}
