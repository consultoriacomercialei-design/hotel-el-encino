import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

/**
 * Espejo Directorio Santiago ↔ Hotel El Encino.
 *
 * Las reservas nacidas en el Directorio se copian a `reservations` con el UUID
 * de la reserva original guardado en las notas. Cuando el hotel registra la
 * llegada, hay que reflejarla en `lodging_reservations` (base compartida) o el
 * pase del huésped en la app del Directorio se queda sin "Check-in hecho".
 *
 * Vivía suelto dentro del escáner del admin web; el check-in de la app móvil
 * no lo hacía, así que a quien registraban desde la app el Directorio nunca se
 * enteraba (b22).
 */
const MIRROR_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Best-effort: nunca lanza y no pisa un check-in previo del anfitrión. */
export async function propagateDirectorioCheckin(notes: string | null, at: string): Promise<void> {
  const dirId = notes?.match(MIRROR_UUID_RE)?.[0];
  if (!dirId) return;
  try {
    const rows = await supabaseGet<{ id: string; checked_in_at: string | null }>(
      'lodging_reservations',
      { id: `eq.${dirId}`, select: 'id,checked_in_at', limit: '1' }
    );
    if (rows[0] && !rows[0].checked_in_at) {
      await supabasePatch('lodging_reservations', dirId, { checked_in_at: at });
    }
  } catch (err) {
    console.error('[mirror] propagación de check-in al Directorio falló', err);
  }
}
