import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// PATCH /api/mobile/requests/[id] — {action: "take" | "done" | "reopen"}.
// take → in_progress (el huésped lo ve 'En proceso' en su TV);
// done → resolved; reopen → pending.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const now = new Date().toISOString();

  let patch: Record<string, unknown>;
  switch (body.action) {
    case 'take':
      patch = { status: 'in_progress', taken_at: now, taken_by: staff.user_id };
      break;
    case 'done':
      patch = { status: 'resolved', resolved_at: now };
      break;
    case 'reopen':
      patch = { status: 'pending', taken_at: null, resolved_at: null };
      break;
    default:
      return NextResponse.json({ success: false, error: 'action inválida' }, { status: 400 });
  }

  const updated = await supabasePatch('service_requests', id, patch);
  if (!updated) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });

  const rows = await supabaseGet<Record<string, unknown>>('service_requests', {
    select: 'id,room_number,request_type,note,status,created_at,taken_at,resolved_at',
    id: `eq.${id}`,
    limit: '1',
  });
  return NextResponse.json({ success: true, data: { request: rows[0] ?? null } });
}
