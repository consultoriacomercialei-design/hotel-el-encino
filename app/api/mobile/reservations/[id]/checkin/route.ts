import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/[id]/checkin — check-in desde la app.
// Acepta id de reserva directamente (lista de llegadas) o valida un
// checkin_code escaneado ({code}) contra ESTA reserva.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { code?: string };

  const rows = await supabaseGet<{
    id: string; status: string; checkin_at: string | null; checkin_code: string | null;
    guest_name: string; folio: string | null;
  }>('reservations', {
    select: 'id,status,checkin_at,checkin_code,guest_name,folio',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (body.code && r.checkin_code && body.code !== r.checkin_code) {
    return NextResponse.json({ success: false, error: 'El código no corresponde a esta reserva' }, { status: 409 });
  }
  if (r.status !== 'confirmed') {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }
  if (r.checkin_at) {
    return NextResponse.json({ success: true, data: { already: true, reservation: r } });
  }

  const ok = await supabasePatch('reservations', id, { checkin_at: new Date().toISOString() });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { already: false, reservation: { ...r, checkin_at: new Date().toISOString() } } });
}
