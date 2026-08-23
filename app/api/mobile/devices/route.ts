import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePost } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST /api/mobile/devices — registra el device token APNs (upsert por token).
export async function POST(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (token.length < 16 || token.length > 400) {
    return NextResponse.json({ success: false, error: 'token inválido' }, { status: 400 });
  }

  const existing = await supabaseGet<{ id: string }>('hotel_devices', {
    select: 'id',
    device_token: `eq.${token}`,
    limit: '1',
  });
  if (existing.length > 0) {
    if (SUPABASE_URL && SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/hotel_devices?device_token=eq.${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ user_id: staff.user_id, updated_at: new Date().toISOString() }),
      }).catch(() => undefined);
    }
  } else {
    await supabasePost('hotel_devices', {
      user_id: staff.user_id,
      device_token: token,
      platform: 'ios',
    }).catch(() => null);
  }
  return NextResponse.json({ success: true, data: { registered: true } });
}
