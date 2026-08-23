import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_CHECKLIST = [
  'Sin daños visibles',
  'Toallas y blancos completos',
  'Controles y llaves entregados',
  'Sin olor a cigarro',
];

// Checklist de la REVISIÓN de salida (b2) — separada de la de limpieza,
// editable desde Configuración de la app. Vive en hotel_settings.

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const rows = await supabaseGet<{ value: unknown }>('hotel_settings', {
    select: 'value',
    key: 'eq.checkout_checklist',
    limit: '1',
  }).catch(() => []);
  const list = Array.isArray(rows[0]?.value) ? (rows[0].value as string[]) : DEFAULT_CHECKLIST;
  return NextResponse.json({ success: true, data: { checkout_checklist: list } });
}

export async function PATCH(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Sin base' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { checklist?: string[] };
  if (!Array.isArray(body.checklist)) {
    return NextResponse.json({ success: false, error: 'checklist inválida' }, { status: 400 });
  }
  const clean = body.checklist.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 30);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key: 'checkout_checklist', value: clean, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { saved: true } });
}
