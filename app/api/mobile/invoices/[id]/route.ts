import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { cancelCFDI, sendInvoiceByEmail } from '@/app/lib/facturapi';

export const dynamic = 'force-dynamic';

// POST /api/mobile/invoices/[id] — acciones sobre una factura emitida:
// {action:"resend", email?} → reenvía XML+PDF por correo (Facturapi).
// {action:"cancel", motive:"01".."04"} → cancela ante el SAT (irreversible;
// la app pide doble confirmación con Face ID antes de llamar aquí).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string; email?: string; motive?: string;
  };

  const rows = await supabaseGet<{
    id: string; facturapi_id: string | null; customer_email: string | null;
    status: string; cancelled_at: string | null;
  }>('invoices', {
    select: 'id,facturapi_id,customer_email,status,cancelled_at',
    id: `eq.${id}`,
    limit: '1',
  });
  const inv = rows[0];
  if (!inv?.facturapi_id) {
    return NextResponse.json({ success: false, error: 'Factura no encontrada' }, { status: 404 });
  }

  try {
    if (body.action === 'resend') {
      const email = (body.email ?? inv.customer_email ?? '').trim();
      if (!email) return NextResponse.json({ success: false, error: 'Sin correo destino' }, { status: 400 });
      await sendInvoiceByEmail(inv.facturapi_id, email);
      return NextResponse.json({ success: true, data: { resent: true, to: email } });
    }
    if (body.action === 'cancel') {
      if (inv.cancelled_at) {
        return NextResponse.json({ success: true, data: { already: true } });
      }
      const motive = ['01', '02', '03', '04'].includes(body.motive ?? '') ? body.motive! : '02';
      await cancelCFDI(inv.facturapi_id, motive);
      await supabasePatch('invoices', id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_motive: motive,
      });
      return NextResponse.json({ success: true, data: { cancelled: true } });
    }
    return NextResponse.json({ success: false, error: 'action inválida' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error de Facturapi';
    return NextResponse.json({ success: false, error: msg.slice(0, 300) }, { status: 502 });
  }
}
