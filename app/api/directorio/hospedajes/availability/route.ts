/**
 * Proxy: GET /api/directorio/hospedajes/availability?room_id&check_in&check_out
 * Reenvía a santiapp (evita CORS desde el navegador). Sin auth: es lectura.
 */
import { NextRequest, NextResponse } from 'next/server';

const BASE = (process.env.SANTIAPP_API_URL || 'https://santiapp-seven.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get('room_id') ?? '';
  const checkIn = url.searchParams.get('check_in') ?? '';
  const checkOut = url.searchParams.get('check_out') ?? '';
  if (!roomId) return NextResponse.json({ error: 'room_id requerido' }, { status: 400 });

  const target = `${BASE}/api/lodgings/rooms/${encodeURIComponent(roomId)}/availability?check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}`;
  try {
    const res = await fetch(target, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar disponibilidad.' }, { status: 502 });
  }
}
