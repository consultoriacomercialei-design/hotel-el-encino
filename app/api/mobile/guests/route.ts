import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET /api/mobile/guests?phone=…&email=…&name=… — PERFIL DE HUÉSPED (b2):
// derivado 100% de la base actual (decisión del dueño: "que se sincronice
// con nuestra base OBVIO"): match por teléfono (dígitos) o correo, respaldo
// por nombre exacto. Devuelve historial de estancias, totales y notas.
// PATCH {guest_key, notes} — notas internas del equipo.

interface ReservationRow {
  id: string; folio: string | null; guest_name: string;
  guest_phone: string | null; guest_email: string | null;
  check_in: string; check_out: string; nights: number | null;
  total_mxn: number | null; status: string; room: string | null;
  source: string | null;
}

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

function guestKey(phone: string | null | undefined, email: string | null | undefined): string | null {
  const d = digits(phone);
  if (d.length >= 10) return `tel:${d.slice(-10)}`;
  const e = (email ?? '').trim().toLowerCase();
  if (e.includes('@')) return `mail:${e}`;
  return null;
}

export async function GET(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const qp = req.nextUrl.searchParams;
  const phone = digits(qp.get('phone'));
  const email = (qp.get('email') ?? '').trim().toLowerCase();
  const name = (qp.get('name') ?? '').trim();
  if (!phone && !email && !name) {
    return NextResponse.json({ success: false, error: 'Falta phone, email o name' }, { status: 400 });
  }

  // Traer candidatas y filtrar en memoria (la base es chica y el match por
  // dígitos de teléfono no se expresa bien en PostgREST).
  const all = await supabaseGet<ReservationRow>('reservations', {
    select: 'id,folio,guest_name,guest_phone,guest_email,check_in,check_out,nights,total_mxn,status,room,source',
    status: 'neq.cancelled',
    order: 'check_in.desc',
    limit: '1000',
  });

  const last10 = (p: string) => p.slice(-10);
  const stays = all.filter((r) => {
    if (phone && digits(r.guest_phone).length >= 10 && last10(digits(r.guest_phone)) === last10(phone)) return true;
    if (email && (r.guest_email ?? '').trim().toLowerCase() === email) return true;
    if (!phone && !email && name && r.guest_name.trim().toLowerCase() === name.toLowerCase()) return true;
    return false;
  });

  if (stays.length === 0) {
    return NextResponse.json({ success: true, data: { found: false, stays: [], total_mxn: 0, notes: '' } });
  }

  const key = guestKey(phone || stays[0].guest_phone, email || stays[0].guest_email);
  let notes = '';
  if (key) {
    const noteRows = await supabaseGet<{ notes: string }>('hotel_guest_notes', {
      select: 'notes',
      guest_key: `eq.${key}`,
      limit: '1',
    }).catch(() => []);
    notes = noteRows[0]?.notes ?? '';
  }

  const totalMxn = stays.reduce((s, r) => s + (r.total_mxn ?? 0), 0);
  const totalNights = stays.reduce((s, r) => s + (r.nights ?? 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      found: true,
      guest_key: key,
      name: stays[0].guest_name,
      stays_count: stays.length,
      nights_total: totalNights,
      total_mxn: totalMxn,
      frequent: stays.length >= 2,
      notes,
      stays: stays.slice(0, 15),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Sin base' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { guest_key?: string; notes?: string };
  const key = (body.guest_key ?? '').trim().slice(0, 140);
  if (!/^(tel:\d{10}|mail:.+@.+)$/.test(key)) {
    return NextResponse.json({ success: false, error: 'guest_key inválido' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_guest_notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      guest_key: key,
      notes: (body.notes ?? '').slice(0, 2000),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ success: true, data: { saved: true } });
}
