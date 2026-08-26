import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { sendCheckoutEmail, type FullReservation } from '@/app/lib/emails';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST /api/mobile/reservations/[id]/checkout — check-out b2 (23-ago):
// REQUIERE la revisión del cuarto (decisión del dueño: obligatoria):
// checklist de salida + ¿daños? (nota y foto opcionales). Al confirmar:
// guarda checkout_review, marca checkout_at y pone el cuarto "por limpiar".

interface Body {
  review?: {
    items?: Record<string, boolean>;
    damages?: boolean;
    damage_note?: string;
    damage_photo_b64?: string;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  const rows = await supabaseGet<FullReservation & { checkout_at: string | null; room: string | null }>('reservations', {
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,rooms,notes,status,payment_method,payment_id,paid_at,line_items,checkout_at,room',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (r.checkout_at) return NextResponse.json({ success: true, data: { already: true } });

  if (!body.review || typeof body.review.damages !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'Falta la revisión del cuarto (obligatoria al check-out)' },
      { status: 400 }
    );
  }

  const review: Record<string, unknown> = {
    items: body.review.items ?? {},
    damages: body.review.damages,
    damage_note: body.review.damage_note?.slice(0, 500) ?? null,
    by: staff.full_name,
    at: new Date().toISOString(),
  };

  // Foto de daño al bucket privado (opcional).
  if (body.review.damage_photo_b64 && SUPABASE_URL && SERVICE_KEY) {
    const buf = Buffer.from(body.review.damage_photo_b64, 'base64');
    if (buf.length >= 100 && buf.length <= 4_000_000) {
      const path = `manager/${id}/${Date.now()}-dano.jpg`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/guest-ids/${path}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        body: buf,
      });
      if (up.ok) review.damage_photo_path = path;
    }
  }

  const ok = await supabasePatch('reservations', id, {
    checkout_at: new Date().toISOString(),
    checkout_review: review,
    status: 'checked_out',
  });
  if (!ok) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });

  // El cuarto pasa SOLO a "por limpiar" (si la reserva tiene cuarto asignado).
  if (r.room && SUPABASE_URL && SERVICE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/hotel_rooms_state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        room: r.room,
        state: 'dirty',
        note: review.damages ? 'Revisar daño reportado al check-out' : null,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => null);
  }

  // b22: correo de salida al huésped — el admin web lo manda desde siempre y
  // el check-out de la app no, así que a quien salía por la app nunca se le
  // despedía. Awaited (Vercel congela la función al responder).
  let emailSent = false;
  if (r.guest_email) {
    emailSent = await sendCheckoutEmail(r)
      .then(() => true)
      .catch((err: unknown) => {
        console.error('[mobile/checkout] correo de salida falló', err);
        return false;
      });
  }

  return NextResponse.json({ success: true, data: { already: false, email_sent: emailSent } });
}
