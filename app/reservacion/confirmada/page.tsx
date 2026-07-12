/**
 * /reservacion/confirmada
 * Unified booking confirmation page — Google Ads conversion landing.
 *
 * Reached by:
 *   - Cash/WhatsApp flow: BookingModal redirects here after successful POST
 *   - Mercado Pago flow: back_url set to this page in /api/payment/create
 *
 * Google Ads conversion fires on mount (via gtag, already loaded in layout).
 * Replace AW-XXXXXXXXXX/YYYYYYYYYYYYYYY with your real conversion action values.
 */

import { supabaseGet } from '@/app/lib/supabase';
import { buildWhatsAppUrl } from '@/app/lib/whatsapp';
import ConfirmadaClient from './ConfirmadaClient';
import Link from 'next/link';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  adults?: number;
  children?: number;
  status: string;
  payment_method?: string;
}

const ROOM_LABELS: Record<string, string> = {
  suite: 'Suite Encino',
  doble: 'Habitación Doble',
  grupal: 'Habitación Grupal',
};

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default async function ConfirmadaPage({
  searchParams,
}: {
  searchParams: Promise<{ folio?: string; external_reference?: string; status?: string }>;
}) {
  const params = await searchParams;

  // Resolve folio — MP sends external_reference="reservation_id|folio"
  let folio = params.folio;
  if (!folio && params.external_reference) {
    const parts = params.external_reference.split('|');
    folio = parts.length === 2 ? parts[1] : undefined;
  }

  if (!folio) {
    return (
      <Shell>
        <p className="text-red-600 text-sm text-center">Folio no especificado.</p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#856d47] hover:underline">← Volver al inicio</Link>
        </div>
      </Shell>
    );
  }

  const rows = await supabaseGet<Reservation>(
    'reservations',
    {
      folio: `eq.${folio}`,
      select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,status,payment_method',
    },
    true
  );

  const r = rows[0];

  if (!r) {
    return (
      <Shell>
        <p className="text-red-600 text-sm text-center">No encontramos el folio <strong>{folio}</strong>.</p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#856d47] hover:underline">← Volver al inicio</Link>
        </div>
      </Shell>
    );
  }

  const guests = `${r.adults || 2} adulto${(r.adults || 2) !== 1 ? 's' : ''}${r.children ? ` · ${r.children} niño${r.children !== 1 ? 's' : ''}` : ''}`;
  const waUrl  = buildWhatsAppUrl(r.folio, r.check_in, r.check_out, guests, r.total_mxn);

  const reservation = {
    id:            r.id,
    folio:         r.folio,
    guestName:     r.guest_name,
    guestEmail:    r.guest_email || '',
    guestPhone:    r.guest_phone || '',
    roomLabel:     ROOM_LABELS[r.room_type] || r.room_type,
    checkIn:       formatDate(r.check_in),
    checkOut:      formatDate(r.check_out),
    nights:        r.nights,
    total:         r.total_mxn,
    guests,
    status:        r.status,
    paymentMethod: r.payment_method || 'pending',
    waUrl,
  };

  return <ConfirmadaClient reservation={reservation} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f5f3ef] flex items-center justify-center px-4 py-12">
      <div className="bg-[#fafaf8] border border-[#e8e4de] rounded-3xl p-8 w-full max-w-md shadow-lg">
        {children}
      </div>
    </div>
  );
}
