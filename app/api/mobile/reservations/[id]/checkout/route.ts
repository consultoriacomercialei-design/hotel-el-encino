import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/[id]/checkout — marca la salida.
// (Daños/encuesta llegan en la siguiente iteración; esto libera el cuarto.)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const rows = await supabaseGet<{ id: string; status: string; checkout_at: string | null }>('reservations', {
    select: 'id,status,checkout_at',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (r.checkout_at) return NextResponse.json({ success: true, data: { already: true } });

  const ok = await supabasePatch('reservations', id, { checkout_at: new Date().toISOString() });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { already: false } });
}
