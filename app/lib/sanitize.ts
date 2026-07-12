/**
 * Input sanitization and validation helpers.
 * All user-facing inputs must pass through these before processing.
 */

/** Strip HTML tags and control characters, trim, limit length */
export function sanitizeString(value: unknown, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/[^\S ]/g, ' ')        // normalize whitespace (keep single spaces)
    .trim();
}

/** Validates email with a proper regex */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.length <= 254;
}

/** Phone: digits, spaces, +, -, () only. 7–20 chars. */
export function isValidPhone(phone: string): boolean {
  return /^[\d\s+\-().]{7,20}$/.test(phone.trim());
}

/** Date must be YYYY-MM-DD and a valid calendar date */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/** Integer within inclusive range */
export function isIntInRange(value: unknown, min: number, max: number): boolean {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  return value >= min && value <= max;
}

/** Validates and sanitizes the reservation body from the booking form */
export interface ReservationInput {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  adults?: number;
  children?: number;
  rooms?: number;
  notes?: string;
  source?: string;
  payment_method?: string;
}

export function validateReservationInput(body: ReservationInput): string | null {
  const name = sanitizeString(body.guest_name, 100);
  if (!name || name.length < 2) return 'Nombre inválido (mínimo 2 caracteres)';

  const email = body.guest_email?.trim() ?? '';
  if (!isValidEmail(email)) return 'Email inválido';

  const phone = body.guest_phone?.trim() ?? '';
  if (!isValidPhone(phone)) return 'Teléfono inválido';

  if (!['doble'].includes(body.room_type)) return 'Tipo de habitación inválido';

  if (!isValidDate(body.check_in) || !isValidDate(body.check_out))
    return 'Fechas inválidas';

  if (new Date(body.check_in) >= new Date(body.check_out))
    return 'Check-out debe ser posterior al check-in';

  // Don't allow bookings more than 2 years in the future
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);
  if (new Date(body.check_in) > maxDate) return 'Fecha demasiado lejana';

  if (!isIntInRange(body.nights, 1, 30)) return 'Número de noches inválido (1-30)';
  if (!isIntInRange(body.total_mxn, 1000, 500_000)) return 'Total inválido';

  if (body.adults !== undefined && !isIntInRange(body.adults, 1, 20))
    return 'Número de adultos inválido';
  if (body.children !== undefined && !isIntInRange(body.children, 0, 20))
    return 'Número de niños inválido';
  if (body.rooms !== undefined && !isIntInRange(body.rooms, 1, 10))
    return 'Número de habitaciones inválido';

  if (body.notes !== undefined) {
    const notes = sanitizeString(body.notes, 500);
    if (body.notes.trim().length > 500) return 'Notas demasiado largas (máximo 500 caracteres)';
    body.notes = notes;
  }

  // Sanitize safe fields back onto body
  body.guest_name  = name;
  body.guest_email = email.toLowerCase();
  body.guest_phone = phone;

  return null;
}
