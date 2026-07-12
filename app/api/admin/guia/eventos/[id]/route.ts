import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get('hotel_admin_session')?.value);
}

const EDITABLE_FIELDS = [
  'status', 'title', 'category', 'start_date', 'end_date',
  'time_start', 'location', 'short_desc', 'price',
  'organizer_name', 'organizer_phone', 'photo_url',
] as const;

/* PATCH /api/admin/guia/eventos/[id] — update status and/or edit fields */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  // Only allow whitelisted fields
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });

  if (patch.status !== undefined && !['active', 'hidden'].includes(patch.status as string))
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/guia_events?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });

  return res.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
}
