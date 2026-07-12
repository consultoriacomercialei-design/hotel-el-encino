import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get('hotel_admin_session')?.value);
}

/* GET — all events for admin (no date filter) */
export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_events?order=start_date.desc&limit=200`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  );
  return NextResponse.json(res.ok ? await res.json() : []);
}
