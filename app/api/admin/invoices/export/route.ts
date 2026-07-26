/**
 * GET /api/admin/invoices/export?month=YYYY-MM
 * Descarga el paquete mensual de facturas (ZIP con XML, PDF y resumen en Excel).
 *
 * POST /api/admin/invoices/export  { month }
 * Manda ese mismo paquete al correo de la contadora, ahora.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { buildMonthlyPackage } from '@/app/lib/invoice-export';
import { fetchAccountingConfig } from '@/app/lib/hotel-config';
import { sendAccountingPackage } from '@/app/lib/emails';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function requireAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get('hotel_admin_session')?.value);
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const month = req.nextUrl.searchParams.get('month') ?? '';
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'Mes inválido. Formato esperado: YYYY-MM' }, { status: 400 });
  }

  try {
    const pkg = await buildMonthlyPackage(month);
    return new NextResponse(pkg.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pkg.filename}"`,
        'Content-Length': String(pkg.buffer.length),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al armar el paquete' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { month } = await req.json().catch(() => ({ month: '' })) as { month?: string };
  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'Mes inválido. Formato esperado: YYYY-MM' }, { status: 400 });
  }

  const { email } = await fetchAccountingConfig();
  if (!email) {
    return NextResponse.json(
      { error: 'Falta el correo de la contadora. Configúralo en /admin/configuracion.' },
      { status: 400 }
    );
  }

  try {
    const pkg = await buildMonthlyPackage(month);
    if (pkg.count === 0) {
      return NextResponse.json({ error: `No hay facturas vigentes en ${month}.` }, { status: 400 });
    }
    const result = await sendAccountingPackage({
      to: email,
      month,
      filename: pkg.filename,
      zipBase64: pkg.buffer.toString('base64'),
      count: pkg.count,
      totalMxn: pkg.totalMxn,
      missing: pkg.missing,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'No se pudo enviar' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, to: email, count: pkg.count, total: pkg.totalMxn });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al enviar' },
      { status: 500 }
    );
  }
}
