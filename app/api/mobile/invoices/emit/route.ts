import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import {
  emitHospedajeCFDI,
  quoteEmit,
  validateEmitInput,
  type EmitInvoiceInput,
} from '@/app/lib/invoice-emit';

export const dynamic = 'force-dynamic';

// POST /api/mobile/invoices/emit — b13: facturar desde la app.
// {quote:true, ...} → solo el desglose oficial (server-side), sin timbrar.
// {...} completo → emite el CFDI (misma lógica que el admin web; un timbre
// es irreversible, así que la app confirma dos veces antes de llamar aquí).
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<EmitInvoiceInput> & { quote?: boolean };

  const nights = Math.floor(Number(body.nights));
  const baseRate = Number(body.base_rate);
  if (!Number.isFinite(nights) || !Number.isFinite(baseRate)) {
    return NextResponse.json({ success: false, error: 'Faltan noches o tarifa' }, { status: 400 });
  }

  if (body.quote === true) {
    const breakdown = await quoteEmit({
      base_rate: baseRate,
      nights,
      customer_rfc: body.customer_rfc ?? 'XAXX010101000',
    });
    return NextResponse.json({ success: true, data: { breakdown } });
  }

  const input: EmitInvoiceInput = {
    reservation_id:      body.reservation_id ?? '',
    folio:               body.folio ?? '',
    period_start:        body.period_start ?? '',
    period_end:          body.period_end ?? '',
    nights,
    base_rate:           baseRate,
    customer_rfc:        body.customer_rfc ?? '',
    customer_name:       body.customer_name ?? '',
    customer_tax_system: body.customer_tax_system ?? '',
    customer_zip:        body.customer_zip ?? '',
    customer_email:      body.customer_email ?? '',
    uso_cfdi:            body.uso_cfdi ?? 'G03',
    payment_form:        body.payment_form ?? '03',
    payment_method_sat:  body.payment_method_sat === 'PPD' ? 'PPD' : 'PUE',
  };
  if (!input.reservation_id || !input.folio) {
    return NextResponse.json({ success: false, error: 'Falta la reservación a facturar' }, { status: 400 });
  }
  const problems = validateEmitInput(input);
  if (problems.length > 0) {
    return NextResponse.json({ success: false, error: problems.join('\n') }, { status: 400 });
  }

  try {
    const result = await emitHospedajeCFDI(input);
    return NextResponse.json({ success: true, data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al timbrar';
    return NextResponse.json({ success: false, error: msg.slice(0, 400) }, { status: 502 });
  }
}
