'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabasePatch } from '@/app/lib/supabase';
import { cancelCFDI, sendInvoiceByEmail } from '@/app/lib/facturapi';
import {
  emitHospedajeCFDI,
  type EmitInvoiceInput,
  type EmitInvoiceResult,
} from '@/app/lib/invoice-emit';
import { addToBlacklist, removeFromBlacklist } from '@/app/lib/blacklist';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) throw new Error('No autorizado');
}

// ── Facturas ─────────────────────────────────────────────────────────────────

export interface StoredInvoice {
  id: string;
  facturapi_id: string | null;
  folio_fiscal: string | null;
  series: string | null;
  folio_number: number | null;
  status: string;
  subtotal_mxn: number;
  iva_mxn: number;
  ish_mxn: number;
  ret_isr_mxn: number;
  total_mxn: number;
  nights: number | null;
  period_start: string | null;
  period_end: string | null;
  customer_rfc: string;
  customer_name: string;
  customer_email: string | null;
  uso_cfdi: string;
  payment_form: string | null;
  error_message: string | null;
  cancelled_at: string | null;
  test_mode: boolean;
  created_at: string;
}

const INVOICE_FIELDS =
  'id,facturapi_id,folio_fiscal,series,folio_number,status,subtotal_mxn,iva_mxn,ish_mxn,' +
  'ret_isr_mxn,total_mxn,nights,period_start,period_end,customer_rfc,customer_name,' +
  'customer_email,uso_cfdi,payment_form,error_message,cancelled_at,test_mode,created_at';

/**
 * Lectura directa en vez de `supabaseGet`: ese helper devuelve [] ante cualquier
 * error, y aquí un fallo silencioso se leería como "no hay facturas" — justo lo
 * que enmascaró durante meses que la tabla `invoices` ni siquiera existía.
 */
export async function getInvoicesForReservation(reservation_id: string): Promise<StoredInvoice[]> {
  await requireAuth();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase no configurado');

  const res = await fetch(
    `${url}/rest/v1/invoices?reservation_id=eq.${reservation_id}` +
      `&select=${INVOICE_FIELDS}&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(`No se pudieron leer las facturas (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

export type CreateInvoiceInput = EmitInvoiceInput;
export type CreateInvoiceResult = EmitInvoiceResult;

/**
 * Emite un CFDI de hospedaje. La lógica vive en `lib/invoice-emit.ts`
 * (compartida con la app móvil); aquí solo se exige la sesión de admin.
 */
export async function createInvoiceAction(data: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  await requireAuth();
  return emitHospedajeCFDI(data);
}

export async function cancelInvoiceAction(data: {
  invoice_id: string;
  facturapi_id: string;
  motive: string;
  substitution?: string;
}) {
  await requireAuth();

  if (data.motive === '01' && !data.substitution?.trim()) {
    throw new Error('El motivo 01 requiere el folio del CFDI que sustituye a este.');
  }

  const result = await cancelCFDI(data.facturapi_id, data.motive, data.substitution?.trim() || undefined);

  await supabasePatch('invoices', data.invoice_id, {
    status:              result.status ?? 'canceled',
    cancelled_at:        new Date().toISOString(),
    cancellation_motive: data.motive,
    updated_at:          new Date().toISOString(),
  });

  return { ok: true, status: result.status, cancellation_status: result.cancellation_status };
}

export async function sendInvoiceEmailAction(facturapi_id: string, email: string) {
  await requireAuth();
  await sendInvoiceByEmail(facturapi_id, email);
  return { ok: true };
}

// ── Lista negra ───────────────────────────────────────────────────────────────

export async function addToBlacklistAction(data: {
  reservation_id: string;
  guest_email: string;
  guest_phone?: string;
  guest_name: string;
  reason: string;
}) {
  await requireAuth();
  await addToBlacklist({
    email:          data.guest_email,
    phone:          data.guest_phone,
    guest_name:     data.guest_name,
    reason:         data.reason,
    reservation_id: data.reservation_id,
  });
  return { ok: true };
}

export async function removeFromBlacklistAction(email: string) {
  await requireAuth();
  await removeFromBlacklist(email);
  return { ok: true };
}
