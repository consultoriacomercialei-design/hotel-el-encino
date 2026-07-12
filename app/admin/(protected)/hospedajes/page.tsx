/**
 * /admin/hospedajes — Super-admin de reservas de hospedaje del directorio.
 * Server Component: lee lodging_reservations (DB compartida) y las pasa a la
 * tabla cliente. La "Acción Forzada" (cancelar + reembolsar) va contra el API
 * de santiapp (que tiene Stripe) vía server action con secreto.
 */

import Link from 'next/link';
import { supabaseGet } from '@/app/lib/supabase';
import HospedajesTable from './HospedajesTable';

export const dynamic = 'force-dynamic';

interface SearchParams { status?: string; sort?: string }

export interface LodgingReservationRow {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  amount_cents: number;
  application_fee_cents: number;
  currency: string;
  status: string;
  created_at: string;
  payment_ref: string | null;
  lodgings: { name: string; slug: string } | null;
  lodging_rooms: { name: string } | null;
}

const STATUS_OPTIONS = [
  { value: '',                label: 'Todas' },
  { value: 'confirmed',       label: 'Confirmadas' },
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'cancelled',       label: 'Canceladas' },
  { value: 'refunded',        label: 'Reembolsadas' },
];

export default async function HospedajesAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status = '', sort = 'created_at.desc' } = await searchParams;

  const params: Record<string, string> = {
    select:
      'id,guest_name,guest_email,guest_phone,check_in,check_out,nights,guests,amount_cents,application_fee_cents,currency,status,created_at,payment_ref,lodgings(name,slug),lodging_rooms(name)',
    order: sort === 'check_in.asc' ? 'check_in.asc' : 'created_at.desc',
  };
  if (status) params.status = `eq.${status}`;

  const rows = await supabaseGet<LodgingReservationRow>('lodging_reservations', params, true);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#283820', marginBottom: '0.25rem' }}>
            Hospedajes — Reservas
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Reservas de hospedaje del directorio. La cancelación reembolsa vía Stripe y libera el calendario.
          </p>
        </div>
        <Link href="/admin/hospedajes/nuevo"
          style={{ padding: '0.5rem 1rem', background: '#283820', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Nuevo hospedaje
        </Link>
      </div>

      <form style={{ marginBottom: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select name="status" defaultValue={status}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8 }}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8 }}>
          <option value="created_at.desc">Más recientes</option>
          <option value="check_in.asc">Check-in próximo</option>
        </select>
        <button type="submit"
          style={{ padding: '0.4rem 1rem', background: '#283820', color: 'white', border: 'none', borderRadius: 8 }}>
          Filtrar
        </button>
      </form>

      <HospedajesTable rows={rows} />
    </div>
  );
}
