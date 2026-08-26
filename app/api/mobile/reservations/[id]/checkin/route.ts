import { NextRequest, NextResponse } from 'next/server';
import { requireHotelStaff } from '@/app/lib/mobile-auth';
import { supabaseGet, supabasePatch, supabasePost, logAuditEvent } from '@/app/lib/supabase';
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

  // b22: registro en la BASE DE CLIENTES (`guest_checkins`, la tabla que lee
  // /admin/clientes) y sello de identidad verificada. El escáner del admin lo
  // hace desde siempre; la app no, así que quien se registraba desde el wizard
  // quedaba invisible en clientes y su reserva sin el badge de "verificado"
  // aunque la foto de la identificación sí se hubiera subido.
  const registroDeIdentidad = !!(patch.id_photo_path || patch.id_number || body.id_type);
  if (registroDeIdentidad) {
    const yaRegistrado = await supabaseGet<{ id: string }>('guest_checkins', {
      select: 'id',
      reservation_id: `eq.${id}`,
      full_name: `eq.${r.guest_name}`,
      limit: '1',
    }).catch(() => [] as { id: string }[]);

    if (yaRegistrado.length === 0) {
      try {
        await supabasePost('guest_checkins', {
          reservation_id: id,
          folio: r.folio,
          full_name: r.guest_name,
          email: (patch.guest_email as string) ?? null,
          phone: (patch.guest_phone as string) ?? null,
          id_doc_type: (patch.id_type as string) ?? body.id_type ?? null,
          id_doc_number: (patch.id_number as string) ?? null,
          id_doc_photo_path: (patch.id_photo_path as string) ?? null,
          id_doc_photo_back_path: (patch.id_photo_back_path as string) ?? null,
          checked_in_at: now,
        });
      } catch (err) {
        // La llegada YA quedó registrada: esto no debe tumbar el check-in.
        console.error('[mobile/checkin] no se pudo escribir en guest_checkins', err);
      }
    }

    if (patch.id_photo_path || patch.id_number) {
      await supabasePatch('reservations', id, { id_verified: true, id_verified_at: now });
    }
  }

  logAuditEvent({
    event: 'reservation.checkin',
    status: 'ok',
    reservation_id: id,
    folio: r.folio ?? undefined,
    details: {
      full_name: r.guest_name,
      express: !!body.express,
      photo: Boolean(patch.id_photo_path),
      by: staff.full_name,
    },
  });

  return NextResponse.json({ success: true, data: { already, express: !!body.express } });
}
