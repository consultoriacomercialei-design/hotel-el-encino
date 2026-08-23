import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/mobile/requests — bandeja de solicitudes del Apple TV.
// Abiertos (pending/in_progress) + los resueltos de HOY; ?history=1 da 30 días.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const history = req.nextUrl.searchParams.get('history') === '1';
  const since = new Date(Date.now() - (history ? 30 : 1) * 86_400_000).toISOString();

  const rows = await supabaseGet<{
    id: string;
    room_number: string;
    request_type: string;
    note: string | null;
    status: string;
    created_at: string;
    taken_at: string | null;
    resolved_at: string | null;
  }>('service_requests', {
    select: 'id,room_number,request_type,note,status,created_at,taken_at,resolved_at',
    or: `(status.in.(pending,in_progress),created_at.gte.${since})`,
    order: 'created_at.desc',
    limit: '200',
  });

  return NextResponse.json({ success: true, data: { requests: rows } });
}
