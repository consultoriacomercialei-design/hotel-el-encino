/**
 * Desglose fiscal de una factura de hospedaje — fuente única de verdad.
 *
 * Mismo patrón que `app/lib/pricing.ts`: funciones puras, sin I/O, para poder
 * probarlas y para que el servidor y la UI muestren SIEMPRE el mismo número.
 *
 * Los tres impuestos son bases paralelas sobre el subtotal de hospedaje —
 * ninguno se calcula sobre otro:
 *
 *   subtotal = tarifa_sin_impuestos × noches
 *   IVA      = subtotal × 16%    (federal, trasladado)
 *   ISH      = subtotal × 3%     (estatal NL, va en el complemento implocal)
 *   Ret ISR  = subtotal × 1.25%  (retención, Art. 113-J LISR)
 *   TOTAL    = subtotal + IVA + ISH − Ret ISR
 *
 * La retención SOLO aplica cuando el emisor es RESICO persona física (régimen 626)
 * y el receptor es persona moral. Ver `shouldWithholdIsr`.
 */

export interface FiscalConfig {
  /** IVA trasladado. 0.16 = 16% */
  ivaRate: number;
  /** Impuesto Sobre Hospedaje (estatal). 0.03 = 3% en Nuevo León */
  ishRate: number;
  /** Retención de ISR a RESICO persona física. 0.0125 = 1.25% */
  retIsrRate: number;
}

export const DEFAULT_FISCAL: FiscalConfig = {
  ivaRate: 0.16,
  ishRate: 0.03,
  retIsrRate: 0.0125,
};

export interface CFDIBreakdown {
  subtotal: number;
  iva: number;
  ish: number;
  retIsr: number;
  total: number;
}

export interface QuoteCFDIInput {
  /** Tarifa por noche SIN impuestos */
  baseRate: number;
  nights: number;
  /** Si false, no se calcula retención (receptor persona física o emisor no-RESICO) */
  withholding: boolean;
  config?: FiscalConfig;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Un RFC de 12 caracteres es persona moral; 13 es persona física.
 * Es la regla del SAT y basta para decidir la retención.
 */
export function isPersonaMoral(rfc: string): boolean {
  return rfc.trim().toUpperCase().replace(/[\s-]/g, '').length === 12;
}

/**
 * Art. 113-J LISR: cuando una persona moral paga a un contribuyente RESICO
 * persona física, debe retener 1.25% de ISR sobre el monto del pago sin IVA.
 * El emisor de este hotel es RESICO PF (régimen 626).
 */
export function shouldWithholdIsr(receptorRfc: string, emisorTaxSystem: string): boolean {
  return emisorTaxSystem === '626' && isPersonaMoral(receptorRfc);
}

export function quoteCFDI({
  baseRate,
  nights,
  withholding,
  config = DEFAULT_FISCAL,
}: QuoteCFDIInput): CFDIBreakdown {
  const subtotal = round2(baseRate * nights);
  const iva      = round2(subtotal * config.ivaRate);
  const ish      = round2(subtotal * config.ishRate);
  const retIsr   = withholding ? round2(subtotal * config.retIsrRate) : 0;

  return {
    subtotal,
    iva,
    ish,
    retIsr,
    total: round2(subtotal + iva + ish - retIsr),
  };
}

// La lectura de las tasas desde `hotel_settings` vive en `hotel-config.ts`
// (`fetchFiscalConfig`). Este archivo se queda sin I/O a propósito: lo importa
// también el componente de cliente para pintar el desglose en vivo.

// ── Validación del receptor ──────────────────────────────────────────────────
// Se valida ANTES de llamar al PAC. Cada timbrado rechazado cuesta una llamada
// y devuelve un error críptico; estos mensajes son legibles en español.

const RFC_RE = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
export const RFC_PUBLICO_GENERAL = 'XAXX010101000';

export interface ReceptorInput {
  rfc: string;
  name: string;
  taxSystem: string;
  zip: string;
  email: string;
  usoCfdi: string;
}

/** Devuelve la lista de problemas. Vacía = listo para timbrar. */
export function validateReceptor(r: ReceptorInput): string[] {
  const errors: string[] = [];
  const rfc = r.rfc.trim().toUpperCase();

  if (!RFC_RE.test(rfc)) {
    errors.push('El RFC no tiene formato válido (12 caracteres para empresa, 13 para persona).');
  }
  if (!r.name.trim()) {
    errors.push('Falta la razón social del receptor.');
  }
  if (rfc !== RFC_PUBLICO_GENERAL && !/^\d{5}$/.test(r.zip.trim())) {
    errors.push('El código postal del receptor debe tener 5 dígitos (obligatorio en CFDI 4.0).');
  }
  if (!r.taxSystem.trim()) {
    errors.push('Falta el régimen fiscal del receptor.');
  }
  if (rfc !== RFC_PUBLICO_GENERAL && isPersonaMoral(rfc) && r.taxSystem === '616') {
    errors.push('El régimen 616 (sin obligaciones fiscales) no aplica a una persona moral.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim())) {
    errors.push('El correo del receptor no es válido.');
  }
  if (!r.usoCfdi.trim()) {
    errors.push('Falta el uso de CFDI.');
  }
  return errors;
}
