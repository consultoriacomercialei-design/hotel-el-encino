import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD | ?q=texto
// Alimenta la rejilla del calendario (rango) y el buscador global (q:
// nombre/teléfono/folio). Sin parámetros: 30 días desde hoy.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const select =
    'id,folio,guest_name,guest_email,guest_phone,room_type,rooms,room,check_in,check_out,nights,total_mxn,status,source,checkin_at,checkout_at,checkin_code,paid_at,payment_method,notes,created_at,late_checkout_until,damage_consent_at,id_photo_path,signature_path';

  const q = sp.get('q')?.trim();
  if (q) {
    const safe = q.replace(/[(),%]/g, '').slice(0, 60);
    const rows = await supabaseGet<Record<string, unknown>>('reservations', {
      select,
      or: `(guest_name.ilike.*${safe}*,guest_phone.ilike.*${safe}*,folio.ilike.*${safe}*)`,
      order: 'check_in.desc',
      limit: '50',
    });
    return NextResponse.json({ success: true, data: { reservations: rows } });
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const from = sp.get('from') ?? today;
  const to = sp.get('to') ?? new Date(Date.now() + 30 * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });

  // Solapamiento con el rango: check_in < to Y check_out > from.
  const rows = await supabaseGet<Record<string, unknown>>('reservations', {
    select,
    check_in: `lt.${to}`,
    check_out: `gt.${from}`,
    status: 'in.(confirmed,pending_payment)',
    order: 'check_in.asc',
    limit: '300',
  });
  return NextResponse.json({ success: true, data: { reservations: rows } });
}
