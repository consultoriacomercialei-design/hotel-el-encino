/**
 * Proxy autenticado: POST /api/directorio/hospedajes/confirm?reservation_id
 * Reenvía a santiapp para verificar el pago y confirmar la reserva (bloquea
 * el calendario). Usa el mismo token del directorio.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('dir_session')?.value || jar.get('guia_session')?.value;
  if (!token) return NextResponse.json({ error: 'Sesión no encontrada.' }, { status: 401 });

  const reservationId = new URL(req.url).searchParams.get('reservation_id');
  if (!reservationId) return NextResponse.json({ error: 'reservation_id requerido' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/api/lodgings/reservations/${encodeURIComponent(reservationId)}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo confirmar la reserva.' }, { status: 502 });
  }
}
