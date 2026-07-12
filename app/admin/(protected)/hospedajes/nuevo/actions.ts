'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

/**
 * Crea un listing de hospedaje a nombre de un dueño (por email) vía el API de
 * santiapp (que tiene la DB compartida + Stripe). Autentica al admin del hotel
 * y reenvía con el secreto servidor-a-servidor.
 */
export interface RateInput {
  name: string;
  price_cents: number;
  starts_on?: string;
  ends_on?: string;
  weekdays?: number[];
  priority?: number;
}
export interface RoomInput {
  name: string;
  description?: string;
  max_occupancy: number;
  base_price_cents: number;
  house_rules?: string;
  photos?: string[];
  google_calendar_id?: string;
  rates?: RateInput[];
}
export interface CreateLodgingInput {
  owner_email: string;
  name: string;
  description?: string;
  address?: string;
  amenities?: string[];
  photos?: string[];
  status: 'draft' | 'published';
  rooms: RoomInput[];
}

export async function createLodging(
  input: CreateLodgingInput
): Promise<{ ok: boolean; message: string; slug?: string }> {
  const token = (await cookies()).get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) return { ok: false, message: 'No autorizado' };

  const base = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');
  const secret = process.env.ADMIN_ACTION_SECRET;
  if (!secret) return { ok: false, message: 'ADMIN_ACTION_SECRET no configurado en el hotel' };

  try {
    const res = await fetch(`${base}/api/admin/lodgings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data?.error?.message || `Error ${res.status}` };
    return { ok: true, message: 'Hospedaje creado.', slug: data?.data?.slug };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red' };
  }
}
