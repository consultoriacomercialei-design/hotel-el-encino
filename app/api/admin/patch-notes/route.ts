/**
 * PATCH /api/admin/patch-notes
 * Updates the notes field of a reservation by ID.
 * Requires admin session cookie. Does NOT send emails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabasePatch, supabaseGet } from '@/app/lib/supabase';

interface Reservation { id: string; folio: string; guest_name: string; total_mxn: number; notes?: string }

function checkAuth(req: NextRequest): boolean {
  return verifyAdminToken(req.cookies.get('hotel_admin_session')?.value);
}

/** GET ?search=nombre — busca reservaciones por nombre (para encontrar el ID) */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const search = req.nextUrl.searchParams.get('search') || '';
  const rows = await supabaseGet<Reservation>('reservations', {
    select: 'id,folio,guest_name,total_mxn,notes',
    'guest_name': `ilike.*${search}*`,
    order: 'created_at.desc',
    limit: '10',
  }, true);
  return NextResponse.json(rows);
}

/** PATCH { id, notes } — actualiza notes de una reservación */
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, notes } = await req.json();
  if (!id || typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }
  await supabasePatch('reservations', id, { notes });
  return NextResponse.json({ ok: true, id, notes });
}
