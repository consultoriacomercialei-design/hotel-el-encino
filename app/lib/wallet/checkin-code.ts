/**
 * Código opaco del pase/QR de una reserva del hotel. Es la credencial que valida
 * el escáner del admin al hacer check-in (128 bits, no adivinable).
 */
import crypto from 'crypto';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export function newCheckinCode(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Devuelve el checkin_code de la reserva; si aún no tiene, genera uno y lo
 * guarda. Best-effort: devuelve null si no se pudo (nunca lanza).
 */
export async function ensureCheckinCode(reservationId: string): Promise<string | null> {
  try {
    const rows = await supabaseGet<{ checkin_code: string | null }>('reservations', {
      id: `eq.${reservationId}`,
      select: 'checkin_code',
      limit: '1',
    });
    const existing = rows[0]?.checkin_code;
    if (existing) return existing;

    const code = newCheckinCode();
    const ok = await supabasePatch('reservations', reservationId, { checkin_code: code });
    return ok ? code : null;
  } catch (err) {
    console.error('[checkin-code] ensure failed', err);
    return null;
  }
}
