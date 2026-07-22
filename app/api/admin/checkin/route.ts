import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet, supabasePost, supabasePatch, logAuditEvent } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'guest-ids';

const DOC_TYPES = new Set(['ine', 'pasaporte', 'licencia', 'otro']);

/**
 * POST /api/admin/checkin — registra el check-in de un huésped (multipart):
 * nombre completo + documento de ID (tipo/número/foto). Alimenta la base de
 * clientes (guest_checkins) y espeja al titular en `reservations`.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('hotel_admin_session')?.value)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
  }

  const reservationId = String(form.get('reservation_id') || '').trim();
  const fullName = String(form.get('full_name') || '').trim();
  const docType = String(form.get('id_doc_type') || '').trim().toLowerCase();
  const docNumber = String(form.get('id_doc_number') || '').trim().toUpperCase();
  const photo = form.get('photo');

  if (!reservationId || !fullName || !DOC_TYPES.has(docType)) {
    return NextResponse.json({ error: 'Faltan datos (nombre, tipo de documento).' }, { status: 400 });
  }

  // La reserva debe existir (y no estar cancelada).
  const rows = await supabaseGet<{ id: string; folio: string; status: string; checkin_at: string | null }>(
    'reservations',
    { id: `eq.${reservationId}`, select: 'id,folio,status,checkin_at', limit: '1' }
  );
  const reservation = rows[0];
  if (!reservation) return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 });
  if (reservation.status === 'cancelled' || reservation.status === 'no_show') {
    return NextResponse.json({ error: 'La reservación está cancelada.' }, { status: 409 });
  }

  // Foto del documento → bucket PRIVADO (guardamos el path, nunca URL pública).
  let photoPath: string | null = null;
  if (photo && typeof photo === 'object' && 'arrayBuffer' in photo && (photo as File).size > 0) {
    const file = photo as File;
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'La foto excede 8 MB.' }, { status: 413 });
    }
    if (SUPABASE_URL && SERVICE_KEY) {
      const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = `${reservationId}/${crypto.randomUUID()}.${ext}`;
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': file.type || 'image/jpeg',
          },
          body: new Uint8Array(buf),
        });
        if (up.ok) photoPath = path;
        else console.error('[checkin] photo upload failed', up.status, await up.text().catch(() => ''));
      } catch (err) {
        console.error('[checkin] photo error', err);
      }
    }
  }

  // Registro en la base de clientes.
  try {
    await supabasePost('guest_checkins', {
      reservation_id: reservationId,
      folio: reservation.folio,
      full_name: fullName,
      id_doc_type: docType,
      id_doc_number: docNumber || null,
      id_doc_photo_path: photoPath,
    });
  } catch (err) {
    return NextResponse.json({ error: `No se pudo guardar el registro: ${String(err).slice(0, 120)}` }, { status: 500 });
  }

  // Espejar al titular en la reserva (reusa columnas de identidad existentes).
  // Solo fija checkin_at en el PRIMER check-in (no se sobrescribe por acompañantes).
  const patch: Record<string, unknown> = {
    id_type: docType,
    id_number: docNumber || null,
    id_verified: true,
    id_verified_at: new Date().toISOString(),
  };
  if (!reservation.checkin_at) patch.checkin_at = new Date().toISOString();
  await supabasePatch('reservations', reservationId, patch);

  logAuditEvent({
    event: 'reservation.checkin',
    status: 'ok',
    reservation_id: reservationId,
    folio: reservation.folio,
    details: { full_name: fullName, id_doc_type: docType, photo: Boolean(photoPath) },
  });

  return NextResponse.json({ ok: true, folio: reservation.folio, full_name: fullName });
}
