import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/invoices — facturas CFDI del hotel para la app (b13: panel
// completo — desglose fiscal + folio de la reserva para buscar por RSV-###).
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const rows = await supabaseGet<Record<string, unknown>>('invoices', {
    select:
      'id,facturapi_id,series,folio_number,folio_fiscal,status,customer_name,customer_rfc,' +
      'customer_email,customer_tax_system,customer_zip,uso_cfdi,payment_form,payment_method_sat,' +
      'subtotal_mxn,iva_mxn,ish_mxn,ret_isr_mxn,total_mxn,base_rate_mxn,nights,period_start,' +
      'period_end,error_message,cancellation_motive,created_at,cancelled_at,reservation_id,test_mode',
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '300',
  });
  const invoices = rows.filter((r) => r.test_mode !== true);

  // Folio de reserva por lote (para búsqueda "RSV-###" y contexto en la lista).
  const resIds = [...new Set(invoices.map((r) => r.reservation_id).filter(Boolean))] as string[];
  const folioById: Record<string, { folio: string | null; guest_name: string | null }> = {};
  if (resIds.length > 0) {
    const res = await supabaseGet<{ id: string; folio: string | null; guest_name: string | null }>('reservations', {
      select: 'id,folio,guest_name',
      id: `in.(${resIds.join(',')})`,
      limit: String(resIds.length),
    }).catch(() => [] as { id: string; folio: string | null; guest_name: string | null }[]);
    for (const r of res) folioById[r.id] = { folio: r.folio, guest_name: r.guest_name };
  }

  return NextResponse.json({
    success: true,
    data: {
      invoices: invoices.map((r) => ({
        ...r,
        reservation_folio: r.reservation_id ? folioById[r.reservation_id as string]?.folio ?? null : null,
        reservation_guest: r.reservation_id ? folioById[r.reservation_id as string]?.guest_name ?? null : null,
      })),
    },
  });
}
