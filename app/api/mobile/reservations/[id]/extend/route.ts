import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const TOTAL_ROOMS = 3;

// POST /api/mobile/reservations/[id]/extend — NOCHE EXTRA (upsell b2).
// Regla del dueño: solo si el cuarto NO está rematado — se valida contra las
// reservas que tocan las noches nuevas (mismo cuarto, o aforo total de 3).

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { nights?: number };
  const extra = Math.min(Math.max(Number(body.nights) || 1, 1), 7);

  const rows = await supabaseGet<{
    id: string; status: string; room: string | null; check_in: string; check_out: string;
    nights: number | null; total_mxn: number | null; line_items: unknown[] | null;
  }>('reservations', {
    select: 'id,status,room,check_in,check_out,nights,total_mxn,line_items',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (r.status !== 'confirmed') {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  const newCheckOut = new Date(Date.parse(r.check_out) + extra * 86_400_000)
    .toISOString().slice(0, 10);

  // Reservas ajenas que tocan las noches nuevas [check_out, newCheckOut).
  const overlapping = await supabaseGet<{ id: string; room: string | null; rooms: number | null }>('reservations', {
    select: 'id,room,rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `lt.${newCheckOut}`,
    check_out: `gt.${r.check_out}`,
    id: `neq.${id}`,
    limit: '50',
  });

  if (r.room && overlapping.some((o) => o.room === r.room)) {
    return NextResponse.json(
      { success: false, error: `El cuarto ${r.room} ya está reservado esas noches` },
      { status: 409 }
    );
  }
  const occupied = overlapping.reduce((s, o) => s + Math.max(o.rooms ?? 1, 1), 0);
  if (occupied >= TOTAL_ROOMS) {
    return NextResponse.json(
      { success: false, error: 'El hotel está lleno esas noches' },
      { status: 409 }
    );
  }

  // Precio: misma tarifa nocturna de la reserva (total/noches).
  const nightly = r.nights && r.nights > 0 && r.total_mxn
    ? Math.round(r.total_mxn / r.nights)
    : 0;
  const charge = nightly * extra;
  const lineItems = Array.isArray(r.line_items) ? [...r.line_items] : [];
  lineItems.push({
    concept: `Noche extra ×${extra}`,
    amount_mxn: charge,
    added_by: staff.full_name,
    at: new Date().toISOString(),
  });

  const ok = await supabasePatch('reservations', id, {
    check_out: newCheckOut,
    nights: (r.nights ?? 0) + extra,
    total_mxn: (r.total_mxn ?? 0) + charge,
    line_items: lineItems,
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo extender' }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: { new_check_out: newCheckOut, charge_mxn: charge },
  });
}
