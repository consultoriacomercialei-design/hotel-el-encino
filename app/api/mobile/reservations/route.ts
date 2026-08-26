import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { paidSumsFor } from '@/app/lib/payments';

export const dynamic = 'force-dynamic';

interface ReservationRow { id: string; total_mxn: number | null; paid_at?: string | null }

/**
 * b22: el estado de cuenta viaja con la reserva, igual que en /summary y
 * /calendar. Sin esto la app recibía `paid_mxn` nulo desde el buscador y el
 * detalle — que se refresca por aquí — perdía "Pagado" y "Saldo" justo
 * después de registrar un pago.
 */
async function withPaid<T extends ReservationRow>(rows: T[]): Promise<Array<T & { paid_mxn: number }>> {
  const sums = await paidSumsFor(
    rows.map((r) => ({ id: r.id, total_mxn: r.total_mxn, paid_at: r.paid_at ?? null }))
  );
  return rows.map((r) => ({ ...r, paid_mxn: sums[r.id] ?? 0 }));
}

// GET /api/mobile/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD | ?q=texto
// Alimenta la rejilla del calendario (rango) y el buscador global (q:
// nombre/teléfono/folio). Sin parámetros: 30 días desde hoy.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const select =
    'id,folio,guest_name,guest_email,guest_phone,room_type,rooms,room,assigned_rooms,adults,children,occupancy,check_in,check_out,nights,total_mxn,status,source,checkin_at,checkout_at,checkin_code,paid_at,payment_method,notes,created_at,late_checkout_until,damage_consent_at,id_photo_path,signature_path';

  const q = sp.get('q')?.trim();
  if (q) {
    const safe = q.replace(/[(),%]/g, '').slice(0, 60);
    const rows = await supabaseGet<ReservationRow>('reservations', {
      select,
      or: `(guest_name.ilike.*${safe}*,guest_phone.ilike.*${safe}*,folio.ilike.*${safe}*)`,
      order: 'check_in.desc',
      limit: '50',
    });
    return NextResponse.json({ success: true, data: { reservations: await withPaid(rows) } });
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const from = sp.get('from') ?? today;
  const to = sp.get('to') ?? new Date(Date.now() + 30 * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });

  // Solapamiento con el rango: check_in < to Y check_out > from.
  const rows = await supabaseGet<ReservationRow>('reservations', {
    select,
    check_in: `lt.${to}`,
    check_out: `gt.${from}`,
    status: 'in.(confirmed,pending_payment,checked_out)',
    order: 'check_in.asc',
    limit: '300',
  });
  return NextResponse.json({ success: true, data: { reservations: await withPaid(rows) } });
}
