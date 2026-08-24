import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { recordManualPartialPayment, paidSumsFor } from '@/app/lib/payments';
import { sendHotelPush } from '@/app/lib/apns-hotel';

export const dynamic = 'force-dynamic';

// POST /api/mobile/reservations/[id]/payment — b11: registrar pago manual
// CON MONTO (anticipo o total) como fila de primera clase en `payments`.
// {method: "efectivo"|"terminal"|"transferencia", amount_mxn: number}
// Sin amount_mxn → se registra el SALDO completo (compatibilidad con b2).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { method?: string; amount_mxn?: number | string };
  const method = body.method ?? '';
  if (!['efectivo', 'terminal', 'transferencia'].includes(method)) {
    return NextResponse.json({ success: false, error: 'Método inválido' }, { status: 400 });
  }

  const rows = await supabaseGet<{
    id: string; folio: string | null; guest_name: string;
    total_mxn: number | null; paid_at: string | null; status: string;
  }>('reservations', {
    select: 'id,folio,guest_name,total_mxn,paid_at,status',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });

  const sums = await paidSumsFor([{ id: r.id, total_mxn: r.total_mxn, paid_at: r.paid_at }]);
  const alreadyPaid = sums[r.id] ?? 0;
  const total = r.total_mxn ?? 0;
  const requested = Number(body.amount_mxn);
  const amount = Number.isFinite(requested) && requested > 0
    ? requested
    : Math.max(total - alreadyPaid, 0);
  if (!(amount > 0)) {
    return NextResponse.json({ success: false, error: 'La reserva ya está pagada por completo' }, { status: 409 });
  }
  if (amount > Math.max(total - alreadyPaid, 0) + 0.01) {
    return NextResponse.json(
      { success: false, error: `El monto excede el saldo (${Math.max(total - alreadyPaid, 0).toFixed(2)})` },
      { status: 400 }
    );
  }

  const result = await recordManualPartialPayment({
    reservationId: id,
    amountMxn: amount,
    method,
    registeredBy: staff.full_name,
  });
  if (!result) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });

  sendHotelPush({
    title: `Pago registrado · ${r.folio ?? ''}`,
    body: `$${Math.round(amount).toLocaleString('es-MX')} (${method}) · ${r.guest_name} — saldo $${Math.round(result.balance).toLocaleString('es-MX')}`,
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    data: {
      paid_mxn: result.paid,
      total_mxn: result.total,
      balance_mxn: result.balance,
      fully_paid: result.balance <= 0,
    },
  });
}
