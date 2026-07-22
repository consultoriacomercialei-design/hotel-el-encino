import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { roomLabel } from '@/app/lib/wallet/lookup';

export const dynamic = 'force-dynamic';

interface ResRow {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  adults: number | null;
  children: number | null;
  status: string;
  checkin_at: string | null;
}

interface CheckinRow {
  id: string;
  full_name: string;
  id_doc_type: string;
  id_doc_number: string | null;
  checked_in_at: string;
}

/**
 * POST /api/admin/checkin/resolve — el admin escanea el QR (o teclea el folio)
 * y obtiene la reserva + los check-ins ya registrados. Solo lectura.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const folio = typeof body.folio === 'string' ? body.folio.trim().toUpperCase() : '';
  if (!code && !folio) {
    return NextResponse.json({ error: 'Falta código o folio.' }, { status: 400 });
  }

  const where: Record<string, string> = code ? { checkin_code: `eq.${code}` } : { folio: `eq.${folio}` };
  const rows = await supabaseGet<ResRow>('reservations', {
    ...where,
    select:
      'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,status,checkin_at',
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 });

  const checkins = await supabaseGet<CheckinRow>('guest_checkins', {
    reservation_id: `eq.${r.id}`,
    select: 'id,full_name,id_doc_type,id_doc_number,checked_in_at',
    order: 'checked_in_at.asc',
  });

  return NextResponse.json({
    reservation: { ...r, room_label: roomLabel(r.room_type) },
    checkins,
  });
}
