import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { sendConfirmedEmails, type ReservationPayload } from '@/app/lib/emails';
import { paidSumsFor } from '@/app/lib/payments';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/[id]/confirmation — b19: (re)enviar al huésped
// su correo de confirmación (QR de check-in + pase Wallet), la MISMA plantilla
// de las reservas web. Solo al huésped: el staff ya fue avisado al crearla.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const rows = await supabaseGet<ReservationPayload & { id: string; folio: string; status: string; paid_at: string | null }>('reservations', {
    select: '*',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (!r.guest_email) {
    return NextResponse.json({ success: false, error: 'La reserva no tiene correo del huésped' }, { status: 400 });
  }
  if (['cancelled', 'no_show'].includes(r.status)) {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  try {
    // b22: el correo refleja el pago YA registrado (si lo hay), en vez de
    // pedirle el total al huésped que ya pagó en el mostrador.
    const sums = await paidSumsFor([{ id: r.id, total_mxn: r.total_mxn ?? null, paid_at: r.paid_at ?? null }]);
    await sendConfirmedEmails(r, r.id, r.folio, { guestOnly: true, paidMxn: sums[r.id] ?? 0 });
    return NextResponse.json({ success: true, data: { sent: true, to: r.guest_email } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo enviar';
    return NextResponse.json({ success: false, error: msg.slice(0, 200) }, { status: 502 });
  }
}
