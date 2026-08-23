/**
 * Auth de El Encino Manager (app iOS del dueño y su hermano).
 * Bearer = access token de Supabase (mismo GoTrue que el Directorio — el
 * dueño entra con su cuenta existente). Autorización real: fila en
 * `hotel_staff` (whitelist por user_id, deny-all). Sin fila → 401.
 */

import { supabaseGet } from './supabase';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface HotelStaff {
  user_id: string;
  full_name: string;
  role: string;
}

export async function requireHotelStaff(req: Request): Promise<HotelStaff | null> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    if (!user.id) return null;

    const rows = await supabaseGet<HotelStaff>('hotel_staff', {
      select: 'user_id,full_name,role',
      user_id: `eq.${user.id}`,
      limit: '1',
    });
    return rows[0] ?? null;
  } catch {
    return null; // falla cerrado
  }
}
