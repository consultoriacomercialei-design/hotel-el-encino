import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET /api/mobile/rooms — estado de limpieza/bloqueo por cuarto + checklist.
export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const [states, checklistRows, lastCleanings] = await Promise.all([
    supabaseGet<Record<string, unknown>>('hotel_rooms_state', {
      select: 'room,state,note,blocked_until,updated_at',
      order: 'room.asc',
    }),
    supabaseGet<{ value: unknown }>('hotel_settings', {
      select: 'value',
      key: 'eq.housekeeping_checklist',
      limit: '1',
    }),
    // Última limpieza cerrada por cuarto (b9) — 60 filas cubren de sobra 3 cuartos.
    supabaseGet<{ room: string; staff_name: string | null; completed_at: string }>('hotel_cleaning_log', {
      select: 'room,staff_name,completed_at',
      order: 'completed_at.desc',
      limit: '60',
    }).catch(() => [] as { room: string; staff_name: string | null; completed_at: string }[]),
  ]);
  const checklist = Array.isArray(checklistRows[0]?.value)
    ? (checklistRows[0].value as string[])
    : ['Sábanas y camas', 'Baño completo', 'Toallas', 'Agua de cortesía', 'Piso y superficies', 'Basura'];
  const lastByRoom: Record<string, { staff_name: string | null; completed_at: string }> = {};
  for (const l of lastCleanings) {
    if (!lastByRoom[l.room]) lastByRoom[l.room] = { staff_name: l.staff_name, completed_at: l.completed_at };
  }
  return NextResponse.json({ success: true, data: { rooms: states, checklist, last_cleaning: lastByRoom } });
}

// PATCH /api/mobile/rooms — {room, state, note?, blocked_until?} (upsert)
// o {checklist: string[]} para editar la lista.
export async function PATCH(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Sin base' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    room?: string; state?: string; note?: string | null; blocked_until?: string | null;
    checklist?: string[];
    /** b9: al pasar a 'clean' con checklist palomeado, queda en bitácora quién y qué. */
    checked_items?: string[];
  };

  if (Array.isArray(body.checklist)) {
    const clean = body.checklist.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 30);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: 'housekeeping_checklist', value: clean, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) return NextResponse.json({ success: false, error: 'No se pudo guardar checklist' }, { status: 500 });
    return NextResponse.json({ success: true, data: { saved: true } });
  }

  const room = (body.room ?? '').trim().slice(0, 20);
  const state = body.state ?? '';
  if (!room || !['clean', 'dirty', 'blocked'].includes(state)) {
    return NextResponse.json({ success: false, error: 'room/state inválidos' }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_rooms_state`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      room,
      state,
      note: body.note?.slice(0, 200) ?? null,
      blocked_until: state === 'blocked' ? body.blocked_until ?? null : null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });

  // Bitácora de limpieza (b9): quién cerró el checklist y a qué hora.
  if (state === 'clean' && Array.isArray(body.checked_items) && body.checked_items.length > 0) {
    const items = body.checked_items.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 30);
    await fetch(`${SUPABASE_URL}/rest/v1/hotel_cleaning_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        room,
        items,
        staff_name: staff.full_name,
        user_id: staff.user_id,
      }),
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true, data: { saved: true } });
}
