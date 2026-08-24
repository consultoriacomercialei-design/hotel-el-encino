import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST /api/mobile/live-activity — registra tokens de ActivityKit.
// {kind: 'requests_start'|'requests_update', token} (upsert) o
// {remove: token} cuando la activity termina en el dispositivo.
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Sin base' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string; token?: string; remove?: string;
  };

  const headers = {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  if (typeof body.remove === 'string' && body.remove) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/hotel_live_activity_tokens?token=eq.${encodeURIComponent(body.remove.slice(0, 200))}`,
      { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } }
    );
    return NextResponse.json({ success: true, data: { removed: true } });
  }

  const kind = body.kind ?? '';
  const token = (body.token ?? '').trim().slice(0, 200);
  if (!token || !['requests_start', 'requests_update'].includes(kind)) {
    return NextResponse.json({ success: false, error: 'kind/token inválidos' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_live_activity_tokens`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      token,
      kind,
      user_id: staff.user_id,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { saved: true } });
}
