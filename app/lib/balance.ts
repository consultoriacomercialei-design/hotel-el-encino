/**
 * Cálculo de anticipo y saldo pendiente de una reservación.
 *
 * Hoy el anticipo vive en el campo `notes` como texto libre
 * (`"anticipo $1500 transferencia"`), parseado con regex.
 * Eso causaba que muchas reservaciones no detectaran el anticipo y mostraran
 * el total completo como pendiente. Esta función es la ÚNICA fuente de verdad —
 * importarla desde cualquier lugar que necesite mostrar saldo.
 *
 * Roadmap R1: cuando la migración `deposit_mxn` esté en producción,
 * `getAnticipo` leerá directo de la columna estructurada y dejará la regex como
 * fallback de transición. Cero cambios en los call-sites.
 */

const ANTICIPO_REGEX = /(?:anticipo|dep[oó]sito|adelanto)[:\s]*\$?\s*([\d,]+)/i;
const ANTICIPO_STRIP_REGEX = /(?:anticipo|dep[oó]sito|adelanto)[:\s]*\$?\s*[\d,]+\s*[·\-]?\s*/gi;

/** Extrae anticipo de las notas. Devuelve null si no hay match o es 0. */
export function parseAnticipoFromNotes(notes?: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(ANTICIPO_REGEX);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

/** Limpia la mención del anticipo de las notas (para edición sin duplicar). */
export function stripAnticipoFromNotes(notes: string): string {
  return notes.replace(ANTICIPO_STRIP_REGEX, '').trim();
}

interface ReservationLike {
  total_mxn: number;
  notes?: string | null;
  // Forward-compat: cuando R1 esté en prod estos campos llegan poblados.
  deposit_mxn?: number | null;
}

/** Devuelve el anticipo real de la reservación (columna nueva con fallback a notas). */
export function getAnticipo(r: ReservationLike): number | null {
  if (typeof r.deposit_mxn === 'number' && r.deposit_mxn > 0) return r.deposit_mxn;
  return parseAnticipoFromNotes(r.notes);
}

/** Saldo a cobrar al llegar = total − anticipo. Nunca negativo. */
export function getBalanceDue(r: ReservationLike): number {
  const anticipo = getAnticipo(r) ?? 0;
  return Math.max(0, r.total_mxn - anticipo);
}
