/**
 * Facturapi — PAC para emisión de CFDI 4.0
 * Docs: https://docs.facturapi.io
 */

const FACTURAPI_KEY = process.env.FACTURAPI_SECRET_KEY;
const BASE_URL = 'https://www.facturapi.io/v2';

function authHeaders() {
  if (!FACTURAPI_KEY) throw new Error('FACTURAPI_SECRET_KEY no configurado');
  const encoded = Buffer.from(`${FACTURAPI_KEY}:`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

export interface InvoiceCustomer {
  legal_name: string;
  tax_id: string;          // RFC
  tax_system: string;      // Régimen fiscal (ej. '626')
  email: string;
  address: { zip: string };
}

export interface InvoiceItem {
  quantity: number;
  product: {
    description: string;
    product_key: string;   // Clave SAT
    unit_key: string;      // Clave unidad SAT
    price: number;
    tax_included: boolean;
    taxes: { type: string; rate: number; factor: string }[];
  };
}

export interface CreateInvoicePayload {
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  payment_form: string;    // Forma de pago (01=efectivo, 03=transferencia…)
  use: string;             // Uso CFDI (G03, S01…)
}

export interface FacturapiInvoice {
  id: string;
  status: string;
  uuid: string;            // Folio fiscal (UUID del SAT)
  folio_number: number;
  total: number;
  subtotal: number;
  created_at: string;
}

export async function createCFDI(payload: CreateInvoicePayload): Promise<FacturapiInvoice> {
  const res = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Facturapi error ${res.status}`);
  }
  return res.json() as Promise<FacturapiInvoice>;
}

export async function getInvoiceFileBuffer(invoiceId: string, type: 'pdf' | 'xml'): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/invoices/${invoiceId}/${type}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Error descargando ${type.toUpperCase()}: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function sendInvoiceByEmail(invoiceId: string, email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/invoices/${invoiceId}/email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`Error enviando factura: ${res.status}`);
}

export function isFacturapiConfigured(): boolean {
  return !!FACTURAPI_KEY;
}

// Catálogos SAT frecuentes
export const USOS_CFDI = [
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales (Público en general)' },
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'I01', label: 'I01 — Construcciones' },
  { value: 'D10', label: 'D10 — Pagos por servicios educativos' },
  { value: 'CP01', label: 'CP01 — Pagos' },
];

export const REGIMENES_FISCALES = [
  { value: '626', label: '626 — Simplificado de Confianza (RESICO)' },
  { value: '612', label: '612 — Persona Física Actividades Empresariales' },
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '605', label: '605 — Sueldos y Salarios' },
  { value: '621', label: '621 — Incorporación Fiscal (RIF)' },
];

export const FORMAS_PAGO: Record<string, string> = {
  cash:     '01', // Efectivo
  transfer: '03', // Transferencia electrónica
  card:     '04', // Tarjeta de crédito
  online:   '28', // Tarjeta de débito (MP)
  pending:  '01',
};
