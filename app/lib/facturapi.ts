/**
 * Facturapi — PAC para emisión de CFDI 4.0
 * Docs: https://docs.facturapi.io
 *
 * Emisor de esta cuenta: HUMBERTO JAIR LEIJA MARROQUIN · LEMH941020J13 · régimen 626 (RESICO PF).
 * El régimen del emisor importa: obliga a la retención de ISR 1.25% cuando el receptor
 * es persona moral (Art. 113-J LISR). Ver `app/lib/cfdi-hospedaje.ts`.
 */

const FACTURAPI_KEY = process.env.FACTURAPI_SECRET_KEY;
const BASE_URL = 'https://www.facturapi.io/v2';

/** Régimen fiscal del emisor de esta cuenta. 626 = RESICO Persona Física. */
export const EMISOR_TAX_SYSTEM = '626';

/**
 * Claves del catálogo SAT para hospedaje.
 * OJO: hasta 2026-07-25 aquí decía 55101500, que es "Publicaciones impresas" — nada
 * que ver con hospedaje. La correcta es 90111501 (Hoteles), familia 9011
 * "Instalaciones hoteleras, alojamientos y centros de encuentros".
 */
export const CLAVE_PROD_HOSPEDAJE = '90111501';
export const CLAVE_UNIDAD_SERVICIO = 'E48';

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
  tax_system: string;      // Régimen fiscal (ej. '601')
  email: string;
  address: { zip: string };
}

/** Impuesto federal. `withholding: true` lo convierte en retención. */
export interface InvoiceTax {
  type: 'IVA' | 'ISR' | 'IEPS';
  rate: number;
  factor: 'Tasa' | 'Cuota' | 'Exento';
  withholding?: boolean;
}

/**
 * Impuesto local (estatal o municipal). Facturapi lo convierte solo en el
 * complemento `implocal:ImpuestosLocales` del SAT y — verificado contra sandbox —
 * SÍ lo suma al Total del comprobante.
 * Aquí se usa para el ISH (Impuesto Sobre Hospedaje) de Nuevo León.
 */
export interface InvoiceLocalTax {
  type: string;            // texto libre: 'ISH'
  rate: number;            // 0.03
  withholding: boolean;
  factor?: 'Tasa' | 'Cuota' | 'Exento';
}

export interface InvoiceItem {
  quantity: number;
  product: {
    description: string;
    product_key: string;   // Clave SAT c_ClaveProdServ
    unit_key: string;      // Clave SAT c_ClaveUnidad
    price: number;
    tax_included: boolean;
    taxability?: string;   // ObjetoImp: '01' no objeto, '02' sí objeto
    taxes: InvoiceTax[];
    local_taxes?: InvoiceLocalTax[];
  };
}

export interface CreateInvoicePayload {
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  payment_form: string;                  // c_FormaPago (01=efectivo, 03=transferencia…)
  payment_method?: 'PUE' | 'PPD';        // PUE = una sola exhibición
  use: string;                           // Uso CFDI (G03, S01…)
  /** Facturapi devuelve la factura ya existente en vez de timbrar otra. */
  idempotency_key?: string;
}

export interface FacturapiInvoice {
  id: string;
  status: string;
  uuid: string;            // Folio fiscal (UUID del SAT)
  series?: string;
  folio_number: number;
  total: number;
  subtotal: number;
  created_at: string;
}

/** Extrae el mensaje legible que manda Facturapi en vez de un HTTP crudo. */
async function facturapiError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({})) as {
    message?: string;
    errors?: { message?: string; path?: string }[];
  };
  const detail = body.errors?.map(e => e.message).filter(Boolean).join(' · ');
  return new Error(body.message ?? detail ?? `${fallback} (HTTP ${res.status})`);
}

export async function createCFDI(payload: CreateInvoicePayload): Promise<FacturapiInvoice> {
  const res = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await facturapiError(res, 'Error al timbrar');
  return res.json() as Promise<FacturapiInvoice>;
}

/** Motivos de cancelación del SAT (c_MotivoCancelacion). */
export const MOTIVOS_CANCELACION = [
  { value: '02', label: '02 — Comprobante emitido con errores, sin relación' },
  { value: '01', label: '01 — Comprobante emitido con errores, con relación (requiere sustituto)' },
  { value: '03', label: '03 — No se llevó a cabo la operación' },
  { value: '04', label: '04 — Operación nominativa relacionada en una factura global' },
] as const;

export interface CancelResult {
  status: string;                 // 'canceled'
  cancellation_status?: string;   // 'accepted', 'pending'…
}

/**
 * Cancela un CFDI ante el SAT. El motivo 01 exige el id del comprobante que lo sustituye.
 * Irreversible: una vez aceptada, no se puede "descancelar".
 */
export async function cancelCFDI(
  invoiceId: string,
  motive: string,
  substitution?: string
): Promise<CancelResult> {
  const qs = new URLSearchParams({ motive });
  if (substitution) qs.set('substitution', substitution);

  const res = await fetch(`${BASE_URL}/invoices/${invoiceId}?${qs}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await facturapiError(res, 'Error al cancelar');
  return res.json() as Promise<CancelResult>;
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
  if (!res.ok) throw await facturapiError(res, 'Error enviando factura');
}

export function isFacturapiConfigured(): boolean {
  return !!FACTURAPI_KEY;
}

/** true si estamos contra el sandbox (`sk_test_…`) y no se timbra de verdad. */
export function isTestMode(): boolean {
  return !!FACTURAPI_KEY?.startsWith('sk_test_');
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

// El régimen del receptor debe coincidir EXACTAMENTE con su Constancia de
// Situación Fiscal. Una empresa puede cambiar de régimen (OSLO pasó a 623 el
// 01/01/2026), así que hay que pedirle la constancia vigente, no suponer 601.
export const REGIMENES_FISCALES = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '623', label: '623 — Opcional para Grupos de Sociedades' },
  { value: '626', label: '626 — Simplificado de Confianza (RESICO)' },
  { value: '612', label: '612 — Persona Física Actividades Empresariales' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '605', label: '605 — Sueldos y Salarios' },
  { value: '621', label: '621 — Incorporación Fiscal (RIF)' },
];

/** Catálogo SAT c_FormaPago — lo que se elige en el formulario. */
export const FORMAS_PAGO_SAT = [
  { value: '03', label: '03 — Transferencia electrónica' },
  { value: '04', label: '04 — Tarjeta de crédito' },
  { value: '28', label: '28 — Tarjeta de débito' },
  { value: '01', label: '01 — Efectivo' },
  { value: '02', label: '02 — Cheque nominativo' },
  { value: '99', label: '99 — Por definir (solo para PPD)' },
];

/**
 * Sugerencia de forma de pago según cómo está marcada la reservación.
 * Es solo un valor inicial: la forma de pago real se elige en el formulario,
 * porque `payment_method` de la reservación no distingue crédito de débito
 * y `pending` no es una forma de pago.
 */
export function suggestPaymentForm(reservationPaymentMethod: string): string {
  switch (reservationPaymentMethod) {
    case 'cash':     return '01';
    case 'transfer': return '03';
    case 'card':     return '04';
    case 'online':   return '04'; // Mercado Pago — casi siempre crédito
    default:         return '03';
  }
}
