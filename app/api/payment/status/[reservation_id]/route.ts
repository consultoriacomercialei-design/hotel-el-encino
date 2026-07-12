/**
 * GET /api/payment/status/[reservation_id]
 * Polling endpoint for the /reservacion/confirmada page (ConfirmadaClient)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseGet } from '@/app/lib/supabase';
import { limiters, getClientIP, tooManyRequests } from '@/app/lib/rate-limit';

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

  const rows = await supabaseGet<{ status: string; folio: string }>(
    'reservations',
    { 'id': `eq.${reservation_id}`, select: 'status,folio' },
    true
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
  }

  return NextResponse.json(rows[0], {
    headers: { 'Cache-Control': 'no-store' },
  });
}
