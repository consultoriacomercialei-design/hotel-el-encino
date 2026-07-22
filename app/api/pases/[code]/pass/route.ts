import { NextRequest } from 'next/server';
import { findByCheckinCode, roomLabel, passServable } from '@/app/lib/wallet/lookup';
import { buildHotelPass, walletConfigured } from '@/app/lib/wallet/apple-pass';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pases/:code/pass — .pkpass de Apple Wallet de una reserva del hotel.
 * El checkin_code opaco es la credencial (igual que el patrón del .ics). Solo
 * reservas vigentes.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  if (!code || code.length < 8) return new Response('Pase no encontrado.', { status: 404 });
  if (!walletConfigured()) return new Response('Apple Wallet no está configurado.', { status: 500 });

  const r = await findByCheckinCode(code);
  if (!r) return new Response('Pase no encontrado.', { status: 404 });
  if (!passServable(r.status)) return new Response('Esta reservación no tiene pase.', { status: 409 });

  try {
    const buffer = await buildHotelPass({
      serial: r.id,
      checkinCode: r.checkin_code,
      folio: r.folio,
      guestName: r.guest_name,
      roomLabel: roomLabel(r.room_type),
      checkIn: r.check_in,
      checkOut: r.check_out,
    });
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="reservacion-${r.folio}.pkpass"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[pases/pass] build failed', err);
    return new Response('No se pudo generar el pase.', { status: 500 });
  }
}
