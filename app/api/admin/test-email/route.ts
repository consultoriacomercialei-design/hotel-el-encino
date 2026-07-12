/**
 * POST /api/admin/test-email
 * Sends preview emails to a target address — no DB records created.
 * Requires admin session cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import {
  sendConfirmedEmails,
  sendPendingPaymentEmails,
  sendCancelledTimeoutEmail,
  sendCancelledByRequestEmail,
  sendCancelledRefundPendingEmail,
} from '@/app/lib/emails';

function checkAuth(req: NextRequest): boolean {
  return verifyAdminToken(req.cookies.get('hotel_admin_session')?.value);
}

const SAMPLE_BASE = {
  guest_name:  'Humberto Leija (PRUEBA)',
  guest_email: '',
  guest_phone: '+52 81 1234 5678',
  room_type:   'doble',
  check_in:    '2025-04-14',
  check_out:   '2025-04-16',
  nights:      2,
  total_mxn:   6_000,
  adults:      2,
  children:    0,
  rooms:       1,
};

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, types } = await req.json();
  if (!to || typeof to !== 'string') return NextResponse.json({ error: 'Falta campo to' }, { status: 400 });

  // Safety: only send to the requester — never to real reservation emails
  const base    = { ...SAMPLE_BASE, guest_email: to };
  const folio   = 'RSV-TEST';
  const id      = 'test-id-000';
  const results: string[] = [];

  const noNotes     = { ...base, notes: 'Llegada tarde aprox. 8pm. Correo de prueba.' };
  const withAnticipo = { ...base, notes: 'Llegada tarde aprox. 8pm. anticipo $1,500. Correo de prueba.' };

  const all: string[] = types?.length ? types
    : ['confirmed', 'confirmed_anticipo', 'pending_payment', 'cancel_timeout', 'cancel_client', 'cancel_refund'];

  await Promise.allSettled([
    all.includes('confirmed')          && sendConfirmedEmails(noNotes,      id, folio).then(() => results.push('confirmed')),
    all.includes('confirmed_anticipo') && sendConfirmedEmails(withAnticipo, id, `${folio}-ANTICIPO`).then(() => results.push('confirmed_anticipo')),
    all.includes('pending_payment')    && sendPendingPaymentEmails(noNotes, folio, 'https://hotelelencino.com/#reservar').then(() => results.push('pending_payment')),
    all.includes('cancel_timeout')     && sendCancelledTimeoutEmail(noNotes,  folio).then(() => results.push('cancel_timeout')),
    all.includes('cancel_client')      && sendCancelledByRequestEmail(noNotes, folio).then(() => results.push('cancel_client')),
    all.includes('cancel_refund')      && sendCancelledRefundPendingEmail(noNotes, folio).then(() => results.push('cancel_refund')),
  ]);

  return NextResponse.json({ sent: results, to });
}
