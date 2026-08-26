/**
 * Ventana del checkout de Mercado Pago — fuente ÚNICA.
 *
 * Cuánto tiempo tiene el huésped para pagar desde que crea la reserva. Vencida,
 * Mercado Pago mata la liga ("Lo que querías pagar ya no se encuentra
 * disponible") y la reserva se cancela para liberar el cuarto.
 *
 * Estaba en 45 minutos y repetido a mano en CUATRO archivos (creación de la
 * preferencia, botón de reintentar, cron de expiración y la cancelación
 * oportunista del admin). Con esa ventana se perdieron ventas reales: RSV-191
 * (Alejandra, $3,000) creó su reserva a las 12:24 y a las 13:09 ya no podía
 * pagar — sin liga, sin recordatorio y sin que nadie en el hotel se enterara.
 *
 * 24 horas (decisión del dueño, 26-ago-2026): reservar un hotel se consulta
 * con la pareja y se busca la tarjeta; 45 minutos era una ventana de comercio
 * electrónico de impulso, no de hospedaje.
 */
export const CHECKOUT_WINDOW_MINUTES = 24 * 60;

export const CHECKOUT_WINDOW_MS = CHECKOUT_WINDOW_MINUTES * 60 * 1000;

/** Momento en que vence el checkout de una reserva creada en `createdAt`. */
export function checkoutExpiresAt(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + CHECKOUT_WINDOW_MS);
}

/** ¿La liga de pago de una reserva creada en `createdAt` sigue viva? */
export function checkoutStillAlive(createdAt: string | Date): boolean {
  const t = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return Date.now() - t.getTime() < CHECKOUT_WINDOW_MS;
}
