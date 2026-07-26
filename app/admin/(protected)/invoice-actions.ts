'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabasePost, supabasePatch } from '@/app/lib/supabase';
import {
  createCFDI,
  cancelCFDI,
  sendInvoiceByEmail,
  CLAVE_PROD_HOSPEDAJE,
  CLAVE_UNIDAD_SERVICIO,
  EMISOR_TAX_SYSTEM,
  isTestMode,
  type InvoiceTax,
} from '@/app/lib/facturapi';
import {
  quoteCFDI,
  shouldWithholdIsr,
  validateReceptor,
  type CFDIBreakdown,
} from '@/app/lib/cfdi-hospedaje';
import { fetchFiscalConfig } from '@/app/lib/hotel-config';
import { addToBlacklist, removeFromBlacklist } from '@/app/lib/blacklist';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) throw new Error('No autorizado');
}

// ── Facturas ─────────────────────────────────────────────────────────────────

export interface StoredInvoice {
  id: string;
  facturapi_id: string | null;
  folio_fiscal: string | null;
  series: string | null;
  folio_number: number | null;
  status: string;
  subtotal_mxn: number;
  iva_mxn: number;
  ish_mxn: number;
  ret_isr_mxn: number;
  total_mxn: number;
  nights: number | null;
  period_start: string | null;
  period_end: string | null;
  customer_rfc: string;
  customer_name: string;
  customer_email: string | null;
  uso_cfdi: string;
  payment_form: string | null;
  error_message: string | null;
  cancelled_at: string | null;
  test_mode: boolean;
  created_at: string;
}

const INVOICE_FIELDS =
  'id,facturapi_id,folio_fiscal,series,folio_number,status,subtotal_mxn,iva_mxn,ish_mxn,' +
  'ret_isr_mxn,total_mxn,nights,period_start,period_end,customer_rfc,customer_name,' +
  'customer_email,uso_cfdi,payment_form,error_message,cancelled_at,test_mode,created_at';

/**
 * Lectura directa en vez de `supabaseGet`: ese helper devuelve [] ante cualquier
 * error, y aquí un fallo silencioso se leería como "no hay facturas" — justo lo
 * que enmascaró durante meses que la tabla `invoices` ni siquiera existía.
 */
export async function getInvoicesForReservation(reservation_id: string): Promise<StoredInvoice[]> {
  await requireAuth();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase no configurado');

  const res = await fetch(
    `${url}/rest/v1/invoices?reservation_id=eq.${reservation_id}` +
      `&select=${INVOICE_FIELDS}&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(`No se pudieron leer las facturas (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

export interface CreateInvoiceInput {
  reservation_id: string;
  folio: string;
  /** Tramo a facturar — permite partir una estancia larga en parcialidades */
  period_start: string;
  period_end: string;
  nights: number;
  /** Tarifa por noche SIN impuestos */
  base_rate: number;
  // Receptor
  customer_rfc: string;
  customer_name: string;
  customer_tax_system: string;
  customer_zip: string;
  customer_email: string;
  uso_cfdi: string;
  payment_form: string;
  payment_method_sat: 'PUE' | 'PPD';
}

export interface CreateInvoiceResult {
  ok: true;
  facturapi_id: string;
  folio_fiscal: string;
  series?: string;
  folio_number: number;
  breakdown: CFDIBreakdown;
  /** true si el guardado en base falló DESPUÉS de timbrar — el CFDI existe y hay que rescatarlo */
  orphaned?: boolean;
}

/**
 * Emite un CFDI de hospedaje.
 *
 * Orden deliberado — un timbre es irreversible y se cobra:
 *   1. valida el receptor localmente (barato)
 *   2. calcula el desglose EN EL SERVIDOR (nunca confía en montos del navegador)
 *   3. inserta la fila con status='pending' → el UNIQUE de idempotency_key mata el doble clic
 *   4. timbra
 *   5. actualiza la fila con el UUID del SAT
 *
 * Si el paso 4 falla, la fila queda 'failed' con el motivo. Si falla el 5,
 * se devuelve `orphaned: true` con el id de Facturapi para no perder el CFDI.
 */
export async function createInvoiceAction(data: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  await requireAuth();

  // 1 ── Validación local, antes de gastar un timbre
  const problems = validateReceptor({
    rfc: data.customer_rfc,
    name: data.customer_name,
    taxSystem: data.customer_tax_system,
    zip: data.customer_zip,
    email: data.customer_email,
    usoCfdi: data.uso_cfdi,
  });
  if (data.nights < 1) problems.push('El número de noches debe ser al menos 1.');
  if (data.base_rate <= 0) problems.push('La tarifa por noche debe ser mayor a cero.');
  if (!data.period_start || !data.period_end) problems.push('Falta el periodo a facturar.');
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const rfc = data.customer_rfc.trim().toUpperCase();

  // 2 ── Desglose calculado aquí, no en el navegador
  const fiscal = await fetchFiscalConfig();
  const withholding = shouldWithholdIsr(rfc, EMISOR_TAX_SYSTEM);
  const b = quoteCFDI({ baseRate: data.base_rate, nights: data.nights, withholding, config: fiscal });

  // El prefijo de modo es indispensable: sin él, una factura de ENSAYO para este
  // mismo tramo choca contra el UNIQUE y bloquearía la emisión real.
  const testMode = isTestMode();
  const idempotencyKey =
    `${testMode ? 'test' : 'live'}:${data.reservation_id}:${data.period_start}:${data.period_end}:${b.total}`;

  // 3 ── Reservar el lugar ANTES de timbrar
  let row: { id: string } | null;
  try {
    row = await supabasePost<{ id: string }>('invoices', {
      reservation_id:      data.reservation_id,
      idempotency_key:     idempotencyKey,
      status:              'pending',
      test_mode:           testMode,
      customer_rfc:        rfc,
      customer_name:       data.customer_name.trim().toUpperCase(),
      customer_tax_system: data.customer_tax_system,
      customer_zip:        data.customer_zip.trim(),
      customer_email:      data.customer_email.trim(),
      uso_cfdi:            data.uso_cfdi,
      payment_form:        data.payment_form,
      payment_method_sat:  data.payment_method_sat,
      period_start:        data.period_start,
      period_end:          data.period_end,
      nights:              data.nights,
      base_rate_mxn:       data.base_rate,
      subtotal_mxn:        b.subtotal,
      iva_mxn:             b.iva,
      ish_mxn:             b.ish,
      ret_isr_mxn:         b.retIsr,
      total_mxn:           b.total,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('duplicate key') || msg.includes('23505')) {
      throw new Error(
        'Ya existe una factura para ese mismo periodo y monto. ' +
        'Revisa la lista de arriba antes de volver a emitir.'
      );
    }
    throw err;
  }
  if (!row) throw new Error('No se pudo registrar la factura antes de timbrar.');

  // 4 ── Timbrar
  const taxes: InvoiceTax[] = [{ type: 'IVA', rate: fiscal.ivaRate, factor: 'Tasa' }];
  if (withholding) {
    taxes.push({ type: 'ISR', rate: fiscal.retIsrRate, factor: 'Tasa', withholding: true });
  }

  const nightsLabel = `${data.nights} noche${data.nights !== 1 ? 's' : ''}`;
  const description =
    `Hospedaje — ${nightsLabel} (${data.period_start} al ${data.period_end}) · Reservación ${data.folio}`;

  let invoice;
  try {
    invoice = await createCFDI({
      customer: {
        legal_name: data.customer_name.trim().toUpperCase(),
        tax_id:     rfc,
        tax_system: data.customer_tax_system,
        email:      data.customer_email.trim(),
        address:    { zip: data.customer_zip.trim() },
      },
      items: [{
        quantity: data.nights,
        product: {
          description,
          product_key:  CLAVE_PROD_HOSPEDAJE,
          unit_key:     CLAVE_UNIDAD_SERVICIO,
          price:        data.base_rate,
          tax_included: false,
          taxability:   '02',
          taxes,
          // El ISH viaja como impuesto local: Facturapi genera el complemento
          // implocal del SAT y lo suma al Total (verificado contra sandbox).
          local_taxes: fiscal.ishRate > 0
            ? [{ type: 'ISH', rate: fiscal.ishRate, withholding: false, factor: 'Tasa' as const }]
            : undefined,
        },
      }],
      payment_form:    data.payment_form,
      payment_method:  data.payment_method_sat,
      use:             data.uso_cfdi,
      idempotency_key: idempotencyKey,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al timbrar';
    await supabasePatch('invoices', row.id, { status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
      .catch(() => {});
    throw new Error(`El SAT rechazó la factura: ${msg}`);
  }

  // 5 ── Guardar el resultado. Si esto falla, el CFDI ya existe: no perderlo.
  let orphaned = false;
  try {
    const saved = await supabasePatch('invoices', row.id, {
      status:       invoice.status ?? 'valid',
      facturapi_id: invoice.id,
      folio_fiscal: invoice.uuid ?? null,
      series:       invoice.series ?? null,
      folio_number: invoice.folio_number ?? null,
      total_mxn:    invoice.total ?? b.total,
      updated_at:   new Date().toISOString(),
    });
    if (!saved) orphaned = true;
  } catch {
    orphaned = true;
  }

  if (orphaned) {
    await supabasePost('audit_log', {
      event:          'invoice_orphaned',
      status:         'error',
      reservation_id: data.reservation_id,
      folio:          data.folio,
      details: {
        facturapi_id: invoice.id,
        folio_fiscal: invoice.uuid,
        total:        invoice.total,
        invoice_row:  row.id,
        nota: 'CFDI timbrado ante el SAT pero no se pudo guardar el resultado en la tabla invoices.',
      },
    }).catch(() => {});
  }

  return {
    ok: true,
    facturapi_id: invoice.id,
    folio_fiscal: invoice.uuid,
    series:       invoice.series,
    folio_number: invoice.folio_number,
    breakdown:    b,
    orphaned,
  };
}

export async function cancelInvoiceAction(data: {
  invoice_id: string;
  facturapi_id: string;
  motive: string;
  substitution?: string;
}) {
  await requireAuth();

  if (data.motive === '01' && !data.substitution?.trim()) {
    throw new Error('El motivo 01 requiere el folio del CFDI que sustituye a este.');
  }

  const result = await cancelCFDI(data.facturapi_id, data.motive, data.substitution?.trim() || undefined);

  await supabasePatch('invoices', data.invoice_id, {
    status:              result.status ?? 'canceled',
    cancelled_at:        new Date().toISOString(),
    cancellation_motive: data.motive,
    updated_at:          new Date().toISOString(),
  });

  return { ok: true, status: result.status, cancellation_status: result.cancellation_status };
}

export async function sendInvoiceEmailAction(facturapi_id: string, email: string) {
  await requireAuth();
  await sendInvoiceByEmail(facturapi_id, email);
  return { ok: true };
}

// ── Lista negra ───────────────────────────────────────────────────────────────

export async function addToBlacklistAction(data: {
  reservation_id: string;
  guest_email: string;
  guest_phone?: string;
  guest_name: string;
  reason: string;
}) {
  await requireAuth();
  await addToBlacklist({
    email:          data.guest_email,
    phone:          data.guest_phone,
    guest_name:     data.guest_name,
    reason:         data.reason,
    reservation_id: data.reservation_id,
  });
  return { ok: true };
}

export async function removeFromBlacklistAction(email: string) {
  await requireAuth();
  await removeFromBlacklist(email);
  return { ok: true };
}
