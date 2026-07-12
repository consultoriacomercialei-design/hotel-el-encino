/**
 * WhatsApp URL builder — pre-filled messages with reservation details
 */

export function buildWhatsAppUrl(
  folio: string,
  checkIn: string,
  checkOut: string,
  guests: string,
  total: number,
  isWaitlist = false
): string {
  const message = isWaitlist
    ? `Hola, me registré en lista de espera (folio ${folio}). Fechas: ${checkIn}→${checkOut}. Huéspedes: ${guests}.`
    : `Hola Hotel El Encino! Mi reservación es ${folio}. Llegada: ${checkIn} / Salida: ${checkOut}. Huéspedes: ${guests}. Total: $${total.toLocaleString('es-MX')} MXN`;

  return `https://wa.me/528123816588?text=${encodeURIComponent(message)}`;
}
