/**
 * Paquete mensual de facturas para la contadora.
 *
 * Arma un ZIP con el XML y el PDF de cada CFDI del mes más un resumen en Excel.
 * El XML es lo que ella carga a su sistema contable; el Excel le sirve para
 * conciliar sin abrir uno por uno.
 *
 * Las facturas de prueba (`test_mode`) NUNCA entran al paquete.
 */

import { getInvoiceFileBuffer } from './facturapi';
import { createZip, type ZipEntry } from './zip';
import { createXlsx } from './xlsx';

export interface ExportableInvoice {
  series: string | null;
  folio_number: number | null;
  facturapi_id: string | null;
  folio_fiscal: string | null;
  status: string;
  customer_rfc: string;
  customer_name: string;
  customer_tax_system: string | null;
  uso_cfdi: string;
  payment_form: string | null;
  period_start: string | null;
  period_end: string | null;
  nights: number | null;
  subtotal_mxn: number | string;
  iva_mxn: number | string;
  ish_mxn: number | string;
  ret_isr_mxn: number | string;
  total_mxn: number | string;
  created_at: string;
  cancelled_at: string | null;
}

const n = (v: number | string | null | undefined): number => {
  const x = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

/** Rango [inicio, fin) del mes en formato ISO. `month` es "YYYY-MM". */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Mes anterior al de la fecha dada, como "YYYY-MM". */
export function previousMonth(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function fetchInvoicesForMonth(month: string): Promise<ExportableInvoice[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase no configurado');

  const { from, to } = monthRange(month);
  const qs = new URLSearchParams({
    select: 'series,folio_number,facturapi_id,folio_fiscal,status,customer_rfc,customer_name,' +
            'customer_tax_system,uso_cfdi,payment_form,period_start,period_end,nights,' +
            'subtotal_mxn,iva_mxn,ish_mxn,ret_isr_mxn,total_mxn,created_at,cancelled_at',
    test_mode: 'eq.false',
    'created_at': `gte.${from}`,
    order: 'folio_number.asc',
  });
  // PostgREST necesita el segundo filtro sobre la misma columna aparte
  const res = await fetch(`${url}/rest/v1/invoices?${qs}&created_at=lt.${to}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`No se pudieron leer las facturas (${res.status})`);
  return res.json();
}

const ENCABEZADOS = [
  'Serie', 'Folio', 'Folio fiscal (UUID)', 'Estatus', 'Fecha',
  'RFC receptor', 'Razón social', 'Régimen', 'Uso CFDI', 'Forma de pago',
  'Periodo', 'Noches', 'Subtotal', 'IVA', 'ISH', 'Retención ISR', 'Total',
];

export function buildSummarySheet(month: string, invoices: ExportableInvoice[]): Buffer {
  const vivas = invoices.filter(i => i.status !== 'canceled');
  const rows: (string | number | null)[][] = [ENCABEZADOS];

  for (const i of invoices) {
    rows.push([
      i.series ?? '', i.folio_number ?? '', i.folio_fiscal ?? '',
      i.status === 'canceled' ? 'CANCELADA' : 'Vigente',
      i.created_at.slice(0, 10),
      i.customer_rfc, i.customer_name, i.customer_tax_system ?? '', i.uso_cfdi, i.payment_form ?? '',
      i.period_start && i.period_end ? `${i.period_start} al ${i.period_end}` : '',
      i.nights ?? '',
      n(i.subtotal_mxn), n(i.iva_mxn), n(i.ish_mxn), n(i.ret_isr_mxn), n(i.total_mxn),
    ]);
  }

  // Totales: solo las vigentes — sumar canceladas daría un número que no existe
  rows.push([]);
  rows.push([
    'TOTALES (solo vigentes)', '', '', '', '', '', '', '', '', '', '',
    vivas.reduce((s, i) => s + (i.nights ?? 0), 0),
    vivas.reduce((s, i) => s + n(i.subtotal_mxn), 0),
    vivas.reduce((s, i) => s + n(i.iva_mxn), 0),
    vivas.reduce((s, i) => s + n(i.ish_mxn), 0),
    vivas.reduce((s, i) => s + n(i.ret_isr_mxn), 0),
    vivas.reduce((s, i) => s + n(i.total_mxn), 0),
  ]);

  return createXlsx({
    name: `Facturas ${month}`,
    columnWidths: [7, 7, 40, 11, 12, 15, 34, 9, 10, 13, 24, 8, 13, 12, 11, 14, 14],
    // Solo las 5 columnas de importes llevan formato de dinero; folio y noches
    // son enteros y saldrían como "1.00" / "10.00".
    moneyColumns: [12, 13, 14, 15, 16],
    rows,
  });
}

export interface MonthlyPackage {
  filename: string;
  buffer: Buffer;
  count: number;
  totalMxn: number;
  /** Facturas cuyo PDF o XML no se pudo bajar. El paquete se entrega igual. */
  missing: string[];
}

export async function buildMonthlyPackage(month: string): Promise<MonthlyPackage> {
  const invoices = await fetchInvoicesForMonth(month);
  const entries: ZipEntry[] = [
    { name: `resumen-${month}.xlsx`, data: buildSummarySheet(month, invoices) },
  ];
  const missing: string[] = [];

  for (const inv of invoices) {
    if (!inv.facturapi_id) { missing.push(`${inv.series}${inv.folio_number} (sin id)`); continue; }
    const base = `${inv.series ?? 'F'}${inv.folio_number}-${inv.customer_rfc}`;
    const carpeta = inv.status === 'canceled' ? 'canceladas' : 'vigentes';
    for (const tipo of ['xml', 'pdf'] as const) {
      try {
        entries.push({
          name: `${carpeta}/${base}.${tipo}`,
          data: await getInvoiceFileBuffer(inv.facturapi_id, tipo),
        });
      } catch {
        missing.push(`${base}.${tipo}`);
      }
    }
  }

  const vivas = invoices.filter(i => i.status !== 'canceled');
  return {
    filename: `facturas-hotel-el-encino-${month}.zip`,
    buffer: createZip(entries),
    count: vivas.length,
    totalMxn: vivas.reduce((s, i) => s + n(i.total_mxn), 0),
    missing,
  };
}
