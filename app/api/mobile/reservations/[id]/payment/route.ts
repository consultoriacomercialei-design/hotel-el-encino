import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/[id]/payment — registrar pago en sitio
// {method: "efectivo"|"terminal"|"transferencia"}. Marca paid_at + método.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { method?: string };
  const method = body.method ?? '';
  if (!['efectivo', 'terminal', 'transferencia'].includes(method)) {
    return NextResponse.json({ success: false, error: 'Método inválido' }, { status: 400 });
  }

  const rows = await supabaseGet<{ id: string; paid_at: string | null; status: string }>('reservations', {
    select: 'id,paid_at,status',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (r.paid_at) return NextResponse.json({ success: true, data: { already: true } });

  const patch: Record<string, unknown> = {
    paid_at: new Date().toISOString(),
    payment_method: method,
  };
  if (r.status === 'pending_payment') patch.status = 'confirmed';
  const ok = await supabasePatch('reservations', id, patch);
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { already: false } });
}
