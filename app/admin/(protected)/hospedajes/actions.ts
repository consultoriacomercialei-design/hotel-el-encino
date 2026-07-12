'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyAdminToken } from '@/app/lib/admin-auth';

/**
 * Acción Forzada del super-admin: cancela + reembolsa una reserva de hospedaje.
 * El reembolso (Stripe) y la liberación del calendario los hace santiapp; aquí
 * solo autenticamos al admin y llamamos su endpoint con el secreto compartido.
 */
export async function forceCancelReservation(
  id: string
): Promise<{ ok: boolean; message: string }> {
  const token = (await cookies()).get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) return { ok: false, message: 'No autorizado' };

  const base = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');
  const secret = process.env.ADMIN_ACTION_SECRET;
  if (!secret) return { ok: false, message: 'ADMIN_ACTION_SECRET no configurado en el hotel' };

  try {
    const res = await fetch(`${base}/api/admin/lodgings/reservations/${id}/cancel`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: data?.error?.message || `Error ${res.status}` };
    }
    revalidatePath('/admin/hospedajes');
    return {
      ok: true,
      message: data?.data?.refunded ? 'Reserva cancelada y reembolsada.' : 'Reserva cancelada.',
    };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red' };
  }
}
