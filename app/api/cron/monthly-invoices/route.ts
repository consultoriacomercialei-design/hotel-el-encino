/**
 * GET /api/cron/monthly-invoices
 *
 * El día 1 de cada mes manda a la contadora el paquete del MES ANTERIOR:
 * ZIP con XML y PDF de cada CFDI más un resumen en Excel.
 *
 * Falla cerrado: si no hay correo configurado en `hotel_settings.accounting`,
 * no manda nada en vez de adivinar destinatario.
 * Protegido con el Bearer que inyecta Vercel (CRON_SECRET), igual que los otros crons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildMonthlyPackage, previousMonth } from '@/app/lib/invoice-export';
import { fetchAccountingConfig } from '@/app/lib/hotel-config';
import { sendAccountingPackage } from '@/app/lib/emails';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // ?month=YYYY-MM permite reenviar un mes viejo a mano
  const month = req.nextUrl.searchParams.get('month') ?? previousMonth(new Date());

  const { email } = await fetchAccountingConfig();
  if (!email) {
    console.warn('[CRON facturas] Sin correo de contadora configurado — no se envía nada.');
    return NextResponse.json({ ok: false, skipped: 'sin_correo_configurado', month });
  }

  try {
    const pkg = await buildMonthlyPackage(month);
    if (pkg.count === 0) {
      console.log(`[CRON facturas] ${month}: sin facturas vigentes, no se envía.`);
      return NextResponse.json({ ok: true, skipped: 'sin_facturas', month });
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

    console.log(`[CRON facturas] ${month}: ${pkg.count} facturas, $${pkg.totalMxn} → ${email} · ok=${result.ok}`);
    return NextResponse.json({
      ok: result.ok, month, to: email,
      count: pkg.count, total: pkg.totalMxn,
      missing: pkg.missing, error: result.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[CRON facturas] Error:', msg);
    return NextResponse.json({ ok: false, month, error: msg }, { status: 500 });
  }
}
