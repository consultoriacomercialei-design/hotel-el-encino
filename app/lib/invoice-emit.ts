import { supabasePost, supabasePatch } from '@/app/lib/supabase';
import {
  createCFDI,
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

// Núcleo de emisión de CFDI de hospedaje, compartido por el admin web
// (invoice-actions.ts) y la app móvil (/api/mobile/invoices/emit). La
// autorización es responsabilidad del CALLER — aquí solo se factura.

export interface EmitInvoiceInput {
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

export interface EmitInvoiceResult {
  ok: true;
  facturapi_id: string;
  folio_fiscal: string;
  series?: string;
  folio_number: number;
  breakdown: CFDIBreakdown;
  /** true si el guardado en base falló DESPUÉS de timbrar — el CFDI existe y hay que rescatarlo */
  orphaned?: boolean;
}

/** Valida el receptor y los datos del tramo. Devuelve la lista de problemas (vacía = OK). */
export function validateEmitInput(data: EmitInvoiceInput): string[] {
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
  return problems;
}

/** Desglose oficial del tramo, calculado en el servidor (nunca en el cliente). */
export async function quoteEmit(data: Pick<EmitInvoiceInput, 'base_rate' | 'nights' | 'customer_rfc'>): Promise<CFDIBreakdown> {
  const fiscal = await fetchFiscalConfig();
  const withholding = shouldWithholdIsr(data.customer_rfc.trim().toUpperCase(), EMISOR_TAX_SYSTEM);
  return quoteCFDI({ baseRate: data.base_rate, nights: data.nights, withholding, config: fiscal });
}

/**
 * Emite un CFDI de hospedaje.
 *
 * Orden deliberado — un timbre es irreversible y se cobra:
 *   1. valida el receptor localmente (barato)
 *   2. calcula el desglose EN EL SERVIDOR (nunca confía en montos del cliente)
 *   3. inserta la fila con status='pending' → el UNIQUE de idempotency_key mata el doble clic
 *   4. timbra
 *   5. actualiza la fila con el UUID del SAT
 *
 * Si el paso 4 falla, la fila queda 'failed' con el motivo. Si falla el 5,
 * se devuelve `orphaned: true` con el id de Facturapi para no perder el CFDI.
 */
export async function emitHospedajeCFDI(data: EmitInvoiceInput): Promise<EmitInvoiceResult> {
  // 1 ── Validación local, antes de gastar un timbre
  const problems = validateEmitInput(data);
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const rfc = data.customer_rfc.trim().toUpperCase();

  // 2 ── Desglose calculado aquí, no en el cliente
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
        'Revisa la lista antes de volver a emitir.'
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
