import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get('hotel_admin_session')?.value);
}

/* PATCH /api/admin/guia/[id] — change tier, status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const allowed = ['tier', 'status', 'lat', 'lng', 'img_focus'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key] === '' ? null : body[key];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/guia_listings?id=eq.${id}`, {
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
    : NextResponse.json({ error: 'Error' }, { status: 500 });
}
