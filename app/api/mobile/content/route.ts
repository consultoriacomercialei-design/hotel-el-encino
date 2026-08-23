import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';
import { HOTEL_SETTINGS_TAG } from '@/app/lib/hotel-config';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET/PATCH /api/mobile/content — FAQ y Políticas del hotel EDITABLES desde
// El Encino Manager (b8, pedido del dueño 23-ago). La página pública lee
// estas mismas llaves de hotel_settings: guardar aquí = actualizar la web.

interface SettingRow { key: string; value: unknown }

async function readSetting<T>(key: string): Promise<T | null> {
  const rows = await supabaseGet<SettingRow>('hotel_settings', {
    select: 'key,value',
    key: `eq.${key}`,
    limit: '1',
  });
  return (rows[0]?.value as T) ?? null;
}

async function writeSetting(key: string, value: unknown): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const [faqs, policies] = await Promise.all([
    readSetting<unknown[]>('faqs'),
    readSetting<unknown[]>('hotel_policies'),
  ]);
  return NextResponse.json({
    success: true,
    data: { faqs: faqs ?? [], policies: policies ?? [] },
  });
}

export async function PATCH(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    faqs?: Array<{ q?: string; a?: string }>;
    policies?: Array<{ text?: string }>;
  };

  if (body.faqs) {
    const clean = body.faqs
      .map((f) => ({
        q: String(f.q ?? '').trim().slice(0, 200),
        a: String(f.a ?? '').trim().slice(0, 1200),
      }))
      .filter((f) => f.q && f.a)
      .slice(0, 30);
    if (!(await writeSetting('faqs', clean))) {
      return NextResponse.json({ success: false, error: 'No se pudo guardar el FAQ' }, { status: 500 });
    }
  }

  if (body.policies) {
    const clean = body.policies
      .map((p) => ({ text: String(p.text ?? '').trim().slice(0, 500) }))
      .filter((p) => p.text)
      .slice(0, 30);
    if (!(await writeSetting('hotel_policies', clean))) {
      return NextResponse.json({ success: false, error: 'No se pudieron guardar las políticas' }, { status: 500 });
    }
  }

  revalidateTag(HOTEL_SETTINGS_TAG, { expire: 0 });
  return NextResponse.json({ success: true, data: { saved: true } });
}
