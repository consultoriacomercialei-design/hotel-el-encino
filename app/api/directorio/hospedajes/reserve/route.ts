/**
 * Proxy autenticado: POST /api/directorio/hospedajes/reserve?room_id
 * Reenvía a santiapp con el access_token del directorio (cookie dir_session,
 * misma identidad Supabase que santiapp). Crea el PaymentIntent (Stripe split).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('dir_session')?.value || jar.get('guia_session')?.value;
  if (!token) return NextResponse.json({ error: 'Inicia sesión para reservar.' }, { status: 401 });

  const roomId = new URL(req.url).searchParams.get('room_id');
  if (!roomId) return NextResponse.json({ error: 'room_id requerido' }, { status: 400 });

  const body = await req.text();
  try {
    const res = await fetch(`${BASE}/api/lodgings/rooms/${encodeURIComponent(roomId)}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo iniciar la reserva.' }, { status: 502 });
  }
}
