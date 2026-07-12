/**
 * POST /api/admin/cleanup
 * Hard-deletes reservations matching a guest_name pattern.
 * Requires admin session cookie. Returns list of deleted records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get('hotel_admin_session')?.value;
  return verifyAdminToken(token);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pattern } = await req.json();
  if (!pattern || typeof pattern !== 'string' || pattern.length < 3) {
    return NextResponse.json({ error: 'Pattern demasiado corto (mínimo 3 caracteres)' }, { status: 400 });
  }

  // First: fetch matching records so we can return what was deleted
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?guest_name=ilike.*${encodeURIComponent(pattern)}*&select=id,folio,guest_name,check_in,status`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const records = await getRes.json();

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ deleted: 0, records: [] });
  }

  // Hard delete
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?guest_name=ilike.*${encodeURIComponent(pattern)}*`,
    {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=minimal' },
    }
  );

  if (!delRes.ok) {
    return NextResponse.json({ error: 'Error al borrar en Supabase' }, { status: 500 });
  }

  return NextResponse.json({ deleted: records.length, records });
}
