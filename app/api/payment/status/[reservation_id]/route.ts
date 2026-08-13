/**
 * GET /api/payment/status/[reservation_id]
 * Polling endpoint for the /reservacion/confirmada page (ConfirmadaClient).
 * Devuelve el estado de la reserva Y el último intento de pago registrado,
 * para que la página pueda decir la verdad ("tu pago fue rechazado, reintenta")
 * en vez de girar en silencio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet } from '@/app/lib/supabase';
import { lastPaymentFor } from '@/app/lib/payments';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';

// Ventana del checkout de MP (alineada con payment/create y el cron)
const CHECKOUT_WINDOW_MS = 45 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reservation_id: string }> }
) {
  // Rate limit: 30 polls por minuto por IP
  if (!limiters.paymentStatus(getClientIP(req))) {
    return tooManyRequests();
  }

  const { reservation_id } = await params;

  // Basic UUID format validation to avoid passing arbitrary strings to Supabase
  if (!reservation_id || !/^[a-zA-Z0-9\-]{8,64}$/.test(reservation_id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const rows = await supabaseGet<{ status: string; folio: string; created_at: string; init_point: string | null }>(
    'reservations',
    { 'id': `eq.${reservation_id}`, select: 'status,folio,created_at,init_point' },
    true
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
  }

  const r = rows[0];
  const lastPayment = await lastPaymentFor(reservation_id);

  // Liga de reintento: solo mientras la reserva siga pendiente y el checkout
  // de MP no haya expirado (45 min desde la creación).
  const windowAlive = Date.now() - new Date(r.created_at).getTime() < CHECKOUT_WINDOW_MS;
  const retryUrl = r.status === 'pending_payment' && windowAlive ? r.init_point : null;

  return NextResponse.json(
    {
      status: r.status,
      folio: r.folio,
      last_payment: lastPayment ? { status: lastPayment.status, detail: lastPayment.status_detail } : null,
      retry_url: retryUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
