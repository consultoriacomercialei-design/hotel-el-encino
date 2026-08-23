import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabasePost, getNextFolio } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/create — reserva EXPRÉS (walk-in) desde la
// app: nombre+tel+correo+personas, cuarto/fechas/precio editables. Nace
// confirmada (el pago se registra aparte con /payment).
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    guest_name?: string; guest_phone?: string; guest_email?: string;
    adults?: number; room_type?: string; rooms?: number;
    check_in?: string; check_out?: string; total_mxn?: number; notes?: string;
  };

  const name = (b.guest_name ?? '').trim().slice(0, 120);
  const checkIn = b.check_in ?? '';
  const checkOut = b.check_out ?? '';
  const total = Number(b.total_mxn);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ success: false, error: 'Faltan nombre o fechas válidas' }, { status: 400 });
  }
  if (!Number.isFinite(total) || total < 0 || total > 500_000) {
    return NextResponse.json({ success: false, error: 'Total inválido' }, { status: 400 });
  }
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);

  const folio = await getNextFolio();
  const row = await supabasePost<{ id: string; folio: string }>('reservations', {
    folio,
    guest_name: name,
    guest_phone: (b.guest_phone ?? '').trim().slice(0, 30) || null,
    guest_email: (b.guest_email ?? '').trim().slice(0, 120) || null,
    adults: Math.min(Math.max(Number(b.adults) || 2, 1), 12),
    room_type: (b.room_type ?? 'doble').slice(0, 40),
    room: (typeof (b as { room?: string }).room === 'string' ? (b as { room?: string }).room!.trim().slice(0, 20) : '') || null,
    rooms: Math.min(Math.max(Number(b.rooms) || 1, 1), 6),
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total_mxn: total,
    status: 'confirmed',
    source: 'walk-in-app',
    notes: (b.notes ?? '').slice(0, 500) || null,
  });
  if (!row) return NextResponse.json({ success: false, error: 'No se pudo crear' }, { status: 500 });
  return NextResponse.json({ success: true, data: { id: row.id, folio: row.folio } });
}
