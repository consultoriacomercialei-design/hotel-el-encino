import { NextRequest, NextResponse } from 'next/server';
import { findByCheckinCode, roomLabel, passServable, guestCount } from '@/app/lib/wallet/lookup';
import { buildGoogleHotelSaveUrl, googleWalletConfigured } from '@/app/lib/wallet/google-pass';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pases/:code/gpass — redirige al link "Save to Google Wallet" de la
 * reserva (equivalente Android del .pkpass). Misma credencial: el checkin_code.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  if (!code || code.length < 8) return new Response('Pase no encontrado.', { status: 404 });
  if (!googleWalletConfigured()) return new Response('Google Wallet no está configurado.', { status: 500 });

  const r = await findByCheckinCode(code);
  if (!r) return new Response('Pase no encontrado.', { status: 404 });
  if (!passServable(r.status)) return new Response('Esta reservación no tiene pase.', { status: 409 });

  try {
    const url = buildGoogleHotelSaveUrl({
      reservationId: r.id,
      checkinCode: r.checkin_code,
      folio: r.folio,
      guestName: r.guest_name,
      roomLabel: roomLabel(r.room_type),
      guests: guestCount(r),
      checkIn: r.check_in,
      checkOut: r.check_out,
    });
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error('[pases/gpass] failed', err);
    return new Response('No se pudo generar el pase de Google Wallet.', { status: 500 });
  }
}
