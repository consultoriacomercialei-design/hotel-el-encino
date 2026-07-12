'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { supabaseGet, supabasePost } from '@/app/lib/supabase';
import { createCFDI, sendInvoiceByEmail, FORMAS_PAGO } from '@/app/lib/facturapi';
import { addToBlacklist, removeFromBlacklist } from '@/app/lib/blacklist';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) throw new Error('No autorizado');
}

// ── Facturas ─────────────────────────────────────────────────────────────────

export interface StoredInvoice {
  id: string;
  facturapi_id: string;
  folio_fiscal: string;
  status: string;
  total_mxn: number;
  customer_rfc: string;
  customer_name: string;
  uso_cfdi: string;
  created_at: string;
}

interface LineItemInput {
  description: string;
  amount: number;
  date?: string;
  nights?: number;
}

export async function createInvoiceAction(data: {
  reservation_id: string;
  folio: string;
  check_in: string;
  nights: number;
  total_mxn: number;
  payment_method: string;
  guest_email: string;
  // Datos del receptor
  customer_rfc: string;
  customer_name: string;
  customer_tax_system: string;
  customer_zip: string;
  customer_email: string;
  uso_cfdi: string;
  // Partidas detalladas (opcional — si no se pasan se usa una línea genérica)
  line_items?: LineItemInput[];
}) {
  await requireAuth();

  const paymentForm = FORMAS_PAGO[data.payment_method] ?? '01';

  // Construir ítems del CFDI — usar partidas detalladas si existen
  const cfdiItems: import('@/app/lib/facturapi').InvoiceItem[] =
    data.line_items && data.line_items.length > 0
      ? data.line_items.map(item => ({
          quantity: 1,
          product: {
            description: item.description,
            product_key: '55101500', // Alojamiento y hospedaje (clave SAT)
            unit_key:    'E48',      // Unidad de servicio
            price:       item.amount,
            tax_included: true,
            taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
          },
        }))
      : [{
          quantity: 1,
          product: {
            description: `Hospedaje — ${data.nights} noche${data.nights !== 1 ? 's' : ''} · ${data.folio}`,
            product_key: '55101500',
            unit_key:    'E48',
            price:       data.total_mxn,
            tax_included: true,
            taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
          },
        }];

  const invoice = await createCFDI({
    customer: {
      legal_name: data.customer_name.toUpperCase(),
      tax_id:     data.customer_rfc.toUpperCase(),
      tax_system: data.customer_tax_system,
      email:      data.customer_email,
      address:    { zip: data.customer_zip },
    },
    items: cfdiItems,
    payment_form: paymentForm,
    use: data.uso_cfdi,
  });

  await supabasePost('invoices', {
    reservation_id: data.reservation_id,
    facturapi_id:   invoice.id,
    folio_fiscal:   invoice.uuid ?? null,
    status:         invoice.status,
    total_mxn:      invoice.total,
    customer_rfc:   data.customer_rfc.toUpperCase(),
    customer_name:  data.customer_name.toUpperCase(),
    uso_cfdi:       data.uso_cfdi,
  });

  return { ok: true, facturapi_id: invoice.id, folio_fiscal: invoice.uuid, total: invoice.total };
}

export async function getInvoicesForReservation(reservation_id: string): Promise<StoredInvoice[]> {
  await requireAuth();
  return supabaseGet<StoredInvoice>('invoices', {
    reservation_id: `eq.${reservation_id}`,
    select: 'id,facturapi_id,folio_fiscal,status,total_mxn,customer_rfc,customer_name,uso_cfdi,created_at',
    order: 'created_at.desc',
  }, true);
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
