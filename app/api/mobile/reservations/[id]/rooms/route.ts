import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

interface AssignedRow {
  id: string;
  room: string | null;
  assigned_rooms: string[] | null;
}

// PATCH /api/mobile/reservations/[id]/rooms — b13: pre-asignar habitaciones
// físicas (una o varias) ANTES del check-in. {rooms: ["Cuarto 1","Cuarto 3"]}.
// Valida que existan, que no estén tomadas por otra reserva viva que traslapa
// las fechas, y que no se asignen más cuartos de los que tiene la reserva.
// {rooms: []} limpia la asignación.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { rooms?: unknown };
  if (!Array.isArray(body.rooms) || body.rooms.some((r) => typeof r !== 'string')) {
    return NextResponse.json({ success: false, error: 'rooms debe ser una lista de cuartos' }, { status: 400 });
  }
  const wanted = [...new Set((body.rooms as string[]).map((r) => r.trim()).filter(Boolean))];

  const rows = await supabaseGet<{
    id: string; status: string; rooms: number | null;
    check_in: string; check_out: string; checkin_at: string | null;
  }>('reservations', {
    select: 'id,status,rooms,check_in,check_out,checkin_at',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (!['confirmed', 'pending_payment'].includes(r.status)) {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }
  if (r.checkin_at && wanted.length === 0) {
    return NextResponse.json(
      { success: false, error: 'El huésped ya hizo check-in; no se puede quitar su cuarto' },
      { status: 409 }
    );
  }

  const roomCount = Math.max(r.rooms ?? 1, 1);
  if (wanted.length > roomCount) {
    return NextResponse.json(
      { success: false, error: `La reserva es de ${roomCount} habitación(es); no puedes asignar ${wanted.length}` },
      { status: 400 }
    );
  }

  if (wanted.length > 0) {
    // Los cuartos deben existir en la lista que administra la app.
    const known = await supabaseGet<{ room: string }>('hotel_rooms_state', {
      select: 'room',
      limit: '50',
    }).catch(() => [] as { room: string }[]);
    const knownSet = new Set(known.map((k) => k.room));
    const ghost = wanted.find((w) => !knownSet.has(w));
    if (ghost) {
      return NextResponse.json({ success: false, error: `El cuarto "${ghost}" no existe` }, { status: 400 });
    }

    // Conflicto contra reservas vivas que traslapan las fechas.
    const overlapping = await supabaseGet<AssignedRow>('reservations', {
      select: 'id,room,assigned_rooms',
      status: 'in.(confirmed,pending_payment)',
      check_in: `lt.${r.check_out}`,
      check_out: `gt.${r.check_in}`,
      id: `neq.${id}`,
      limit: '50',
    });
    const taken = new Set<string>();
    for (const o of overlapping) {
      if (o.room) taken.add(o.room);
      if (Array.isArray(o.assigned_rooms)) for (const a of o.assigned_rooms) taken.add(a);
    }
    const clash = wanted.find((w) => taken.has(w));
    if (clash) {
      return NextResponse.json(
        { success: false, error: `El ${clash} ya está tomado por otra reserva en esas fechas` },
        { status: 409 }
      );
    }
  }

  const ok = await supabasePatch('reservations', id, {
    assigned_rooms: wanted.length > 0 ? wanted : null,
    // `room` = principal, por compatibilidad con rejilla y check-in.
    room: wanted[0] ?? null,
    edited_at: new Date().toISOString(),
    edited_by: staff.full_name,
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });

  return NextResponse.json({ success: true, data: { assigned_rooms: wanted, room: wanted[0] ?? null } });
}
