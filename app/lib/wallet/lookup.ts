import { supabaseGet } from '@/app/lib/supabase';

export const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino',
  doble: 'Habitación Doble',
  grupal: 'Habitación Grupal',
};

export function roomLabel(roomType: string): string {
  return ROOM_LABELS[roomType] || roomType;
}

export interface PassReservation {
  id: string;
  folio: string;
  guest_name: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  checkin_code: string;
}

/** Reserva por su checkin_code opaco (credencial del pase/QR). */
export async function findByCheckinCode(code: string): Promise<PassReservation | null> {
  const rows = await supabaseGet<PassReservation>('reservations', {
    checkin_code: `eq.${code}`,
    select: 'id,folio,guest_name,room_type,check_in,check_out,status,checkin_code',
    limit: '1',
  });
  return rows[0] ?? null;
}

/** Un pase es servible salvo que la reserva esté muerta. */
export function passServable(status: string): boolean {
  return status !== 'cancelled' && status !== 'no_show' && status !== 'pending_payment';
}
