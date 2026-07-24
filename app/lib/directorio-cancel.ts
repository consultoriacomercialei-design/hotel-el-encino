/**
 * Propaga la cancelación de una reservación ESPEJO del Directorio Santiago de
 * vuelta a la app (libera el cuarto en iOS). El espejo trae en `notes` el
 * marcador "Reserva Directorio Santiago <uuid>". Best-effort: nunca lanza, no
 * reembolsa (refund:false) — el reembolso lo decide el anfitrión aparte.
 *
 * Compartido por TODOS los flujos de cancelación del admin (API route + server
 * actions), para que ninguno se olvide de propagar.
 */
const DIRECTORIO_ID_RE =
  /Reserva Directorio Santiago\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export async function propagateDirectorioCancel(notes: string | null | undefined): Promise<void> {
  const directorioId = notes?.match(DIRECTORIO_ID_RE)?.[1];
  if (!directorioId) return;

  const secret = process.env.ADMIN_ACTION_SECRET;
  if (!secret) {
    console.error('[directorio-cancel] ADMIN_ACTION_SECRET ausente — no se propagó al Directorio');
    return;
  }
  const base = (process.env.SANTIAPP_API_URL || 'https://directoriosantiago.com').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/admin/lodgings/reservations/${directorioId}/cancel`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'content-type': 'application/json' },
      body: JSON.stringify({ refund: false }),
      cache: 'no-store',
    });
    if (!res.ok) console.error(`[directorio-cancel] santiapp → HTTP ${res.status}`);
  } catch (e: unknown) {
    console.error('[directorio-cancel] propagación falló', e);
  }
}
