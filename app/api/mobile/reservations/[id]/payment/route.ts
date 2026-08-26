import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { recordManualPartialPayment, paidSumsFor } from '@/app/lib/payments';
import { sendHotelPush } from '@/app/lib/apns-hotel';

export const dynamic = 'force-dynamic';

// GET /api/mobile/reservations/[id]/payment — b22: estado de cuenta con el
// DESGLOSE de cada pago (monto, método, quién lo registró y cuándo). El dato
// vivía en `payments` desde b11 pero la app nunca lo pedía: el detalle decía
// cuánto se pagó y jamás CÓMO — reclamo del dueño con RSV-186.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const rows = await supabaseGet<{
    id: string; total_mxn: number | null; paid_at: string | null; payment_method: string | null;
  }>('reservations', {
    select: 'id,total_mxn,paid_at,payment_method',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });

  const payments = await supabaseGet<{
    payment_id: string; provider: string | null; status: string | null;
    amount_mxn: number | string | null; method: string | null;
    created_at: string; raw: { registered_by?: string } | null;
  }>('payments', {
    reservation_id: `eq.${id}`,
    select: 'payment_id,provider,status,amount_mxn,method,created_at,raw',
    order: 'created_at.asc',
    limit: '100',
  });

  const approved = payments.filter((p) => p.status === 'approved');
  const total = r.total_mxn ?? 0;
  // Sin filas en `payments` pero con paid_at, el pago es anterior a b11: se
  // asume liquidada (misma regla que paidSumsFor, para no contradecirla).
  const paid = approved.length > 0
    ? approved.reduce((s, p) => s + Number(p.amount_mxn ?? 0), 0)
    : (r.paid_at ? total : 0);

  return NextResponse.json({
    success: true,
    data: {
      total_mxn: total,
      paid_mxn: paid,
      balance_mxn: Math.max(total - paid, 0),
      payment_method: r.payment_method,
      payments: approved.map((p) => ({
        amount_mxn: Number(p.amount_mxn ?? 0),
        method: p.method,
        provider: p.provider,
        registered_by: p.raw?.registered_by ?? null,
        created_at: p.created_at,
      })),
    },
  });
}

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

  // Awaited: sin await, Vercel congela la función y el push se pierde.
  await sendHotelPush({
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
