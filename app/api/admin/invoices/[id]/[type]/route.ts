/**
 * GET /api/admin/invoices/[id]/[type]
 * Proxy seguro para descargar PDF o XML de Facturapi (mantiene la API key server-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { getInvoiceFileBuffer } from '@/app/lib/facturapi';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, type } = await params;
  if (type !== 'pdf' && type !== 'xml') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  try {
    const buffer = await getInvoiceFileBuffer(id, type);
    const contentType = type === 'pdf' ? 'application/pdf' : 'application/xml';
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="factura-${id}.${type}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
