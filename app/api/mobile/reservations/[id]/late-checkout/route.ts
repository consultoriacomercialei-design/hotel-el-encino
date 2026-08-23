import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const TOTAL_ROOMS = 3;

// LATE CHECKOUT (upsell b2). Regla del dueño (23-ago): si el cuarto está
// REMATADO ese día (llega alguien que lo necesita), máximo +2/3 horas sobre
// la salida normal (12:00 → tope 15:00). Si nadie llega, horario libre.
//
// GET  → { room_resold, options: ["13:00","14:00","15:00"...] }
// POST { until: "HH:MM", charge_mxn? } → guarda late_checkout_until (+cargo).

interface ResRow {
  id: string; status: string; room: string | null; check_out: string;
  total_mxn: number | null; line_items: unknown[] | null;
}

async function resoldInfo(r: ResRow): Promise<boolean> {
  // Llegadas del día de SU salida.
  const arrivals = await supabaseGet<{ id: string; room: string | null; rooms: number | null }>('reservations', {
    select: 'id,room,rooms',
    status: 'in.(confirmed,pending_payment)',
    check_in: `eq.${r.check_out}`,
    id: `neq.${r.id}`,
    limit: '20',
  });
  if (arrivals.length === 0) return false;
  // Su cuarto específico llega alguien → rematado.
  if (r.room && arrivals.some((a) => a.room === r.room)) return true;
  // Llegadas sin cuarto asignado: rematado si el aforo se llena.
  const needed = arrivals.reduce((s, a) => s + Math.max(a.rooms ?? 1, 1), 0);
  return needed >= TOTAL_ROOMS;
}

async function loadReservation(id: string): Promise<ResRow | null> {
  const rows = await supabaseGet<ResRow>('reservations', {
    select: 'id,status,room,check_out,total_mxn,line_items',
    id: `eq.${id}`,
    limit: '1',
  });
  return rows[0] ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const r = await loadReservation(id);
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });

  const resold = await resoldInfo(r);
  const options = resold
    ? ['13:00', '14:00', '15:00']
    : ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  return NextResponse.json({ success: true, data: { room_resold: resold, options } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { until?: string; charge_mxn?: number };
  const until = (body.until ?? '').trim();
  if (!/^\d{2}:\d{2}$/.test(until)) {
    return NextResponse.json({ success: false, error: 'Hora inválida' }, { status: 400 });
  }

  const r = await loadReservation(id);
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });

  const resold = await resoldInfo(r);
  if (resold && until > '15:00') {
    return NextResponse.json(
      { success: false, error: 'El cuarto está rematado ese día: máximo 15:00' },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = { late_checkout_until: until };
  const charge = Math.max(Number(body.charge_mxn) || 0, 0);
  if (charge > 0) {
    const lineItems = Array.isArray(r.line_items) ? [...r.line_items] : [];
    lineItems.push({
      concept: `Late checkout hasta ${until}`,
      amount_mxn: charge,
      added_by: staff.full_name,
      at: new Date().toISOString(),
    });
    patch.line_items = lineItems;
    patch.total_mxn = (r.total_mxn ?? 0) + charge;
  }

  const ok = await supabasePatch('reservations', id, patch);
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { until, charge_mxn: charge } });
}
