import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch } from '@/app/lib/supabase';
import { propagateDirectorioCheckin } from '@/app/lib/directorio-mirror';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'guest-ids';

// POST /api/mobile/reservations/[id]/checkin — check-in b2 (23-ago):
// wizard completo (datos del huésped + fotos de ID + firma + consentimiento
// de daños + cuarto) o EXPRÉS (solo cuarto; lo demás queda pendiente visible).
// Compatible con el flujo QR: {code} valida el checkin_code escaneado.

interface Body {
  code?: string;
  express?: boolean;
  room?: string;
  guest_phone?: string;
  guest_email?: string;
  id_type?: string;
  id_number?: string;
  id_photo_b64?: string;       // JPEG base64 (frente)
  id_photo_back_b64?: string;  // JPEG base64 (reverso)
  signature_b64?: string;      // PNG base64 (firma)
  damage_consent?: boolean;
  /** b10: el staff confirmó asignar un cuarto que está POR LIMPIAR. */
  force_dirty?: boolean;
}

async function uploadB64(path: string, b64: string, contentType: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 100 || buf.length > 4_000_000) return null;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buf,
  });
  return res.ok ? path : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireHotelStaff(req);
  if (!staff) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  const rows = await supabaseGet<{
    id: string; status: string; checkin_at: string | null; checkin_code: string | null;
    guest_name: string; folio: string | null; notes: string | null;
  }>('reservations', {
    select: 'id,status,checkin_at,checkin_code,guest_name,folio,notes',
    id: `eq.${id}`,
    limit: '1',
  });
  const r = rows[0];
  if (!r) return NextResponse.json({ success: false, error: 'Reserva no encontrada' }, { status: 404 });
  if (body.code && r.checkin_code && body.code !== r.checkin_code) {
    return NextResponse.json({ success: false, error: 'El código no corresponde a esta reserva' }, { status: 409 });
  }
  if (r.status !== 'confirmed') {
    return NextResponse.json({ success: false, error: `La reserva está ${r.status}` }, { status: 409 });
  }

  const patch: Record<string, unknown> = {};
  const now = new Date().toISOString();
  const ts = Date.now();

  const room = (body.room ?? '').trim().slice(0, 20);
  // b10: validar estado del cuarto — bloqueado JAMÁS; sucio solo con confirmación.
  if (room) {
    const states = await supabaseGet<{ state: string; note: string | null }>('hotel_rooms_state', {
      select: 'state,note',
      room: `eq.${room}`,
      limit: '1',
    }).catch(() => [] as { state: string; note: string | null }[]);
    const st = states[0]?.state;
    if (st === 'blocked') {
      return NextResponse.json(
        { success: false, error: `El cuarto ${room} está bloqueado${states[0]?.note ? ` (${states[0].note})` : ''}` },
        { status: 409 }
      );
    }
    if (st === 'dirty' && body.force_dirty !== true) {
      return NextResponse.json(
        { success: false, error: `El cuarto ${room} está por limpiar` },
        { status: 409 }
      );
    }
    patch.room = room;
  }
  if (body.guest_phone?.trim()) patch.guest_phone = body.guest_phone.trim().slice(0, 30);
  if (body.guest_email?.trim()) patch.guest_email = body.guest_email.trim().slice(0, 120);
  if (body.id_type?.trim()) patch.id_type = body.id_type.trim().slice(0, 30);
  if (body.id_number?.trim()) patch.id_number = body.id_number.trim().slice(0, 60);
  if (body.damage_consent) patch.damage_consent_at = now;

  // Expediente: fotos de ID y firma al bucket privado guest-ids.
  if (body.id_photo_b64) {
    const p = await uploadB64(`manager/${id}/${ts}-id-front.jpg`, body.id_photo_b64, 'image/jpeg');
    if (p) patch.id_photo_path = p;
  }
  if (body.id_photo_back_b64) {
    const p = await uploadB64(`manager/${id}/${ts}-id-back.jpg`, body.id_photo_back_b64, 'image/jpeg');
    if (p) patch.id_photo_back_path = p;
  }
  if (body.signature_b64) {
    const p = await uploadB64(`manager/${id}/${ts}-firma.png`, body.signature_b64, 'image/png');
    if (p) patch.signature_path = p;
  }

  const already = !!r.checkin_at;
  if (!already) patch.checkin_at = now;

  if (Object.keys(patch).length > 0) {
    const ok = await supabasePatch('reservations', id, patch);
    if (!ok) return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 });
  }

  // b22: si la reserva nació en el Directorio, reflejar la llegada allá — el
  // escáner del admin web lo hace desde siempre y la app no, así que al
  // huésped registrado desde la app su pase le seguía diciendo "sin check-in".
  if (!already) await propagateDirectorioCheckin(r.notes, now);

  return NextResponse.json({ success: true, data: { already, express: !!body.express } });
}
