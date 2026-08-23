import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/invoices — facturas CFDI del hotel para la app (90 días).
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const rows = await supabaseGet<Record<string, unknown>>('invoices', {
    select:
      'id,facturapi_id,series,folio_number,folio_fiscal,status,customer_name,customer_rfc,customer_email,total_mxn,nights,period_start,period_end,created_at,cancelled_at,reservation_id,test_mode',
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '200',
  });
  return NextResponse.json({
    success: true,
    data: { invoices: rows.filter((r) => r.test_mode !== true) },
  });
}
