/**
 * /admin/reservaciones — Server Component
 * Fetches reservations server-side and passes to client table
 */

import { supabaseGet } from '@/app/lib/supabase';
import ReservationTable from './ReservationTable';
import Link from 'next/link';

interface SearchParams { status?: string; date_from?: string; date_to?: string; sort?: string; payment?: string; q?: string; }

const SORT_OPTIONS = [
  { value: 'created_at.desc', label: 'Más recientes primero' },
  { value: 'check_in.asc',   label: 'Check-in próximo'       },
  { value: 'check_in.desc',  label: 'Check-in lejano'        },
  { value: 'total_mxn.desc', label: 'Total mayor primero'    },
] as const;

const PAYMENT_OPTIONS = [
  { value: '',         label: 'Todas las formas de pago' },
  { value: 'online',   label: 'MercadoPago'              },
  { value: 'cash',     label: 'Efectivo'                 },
  { value: 'transfer', label: 'Transferencia'            },
  { value: 'pending',  label: 'Pago al llegar'           },
];

type SortValue = typeof SORT_OPTIONS[number]['value'];

function toSupabaseOrder(sort: string): string {
  const allowed: SortValue[] = ['created_at.desc', 'check_in.asc', 'check_in.desc', 'total_mxn.desc'];
  return (allowed as string[]).includes(sort) ? sort : 'created_at.desc';
}

export default async function ReservacionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status = '', date_from = '', date_to = '', sort = 'created_at.desc', payment = '', q = '' } = await searchParams;

  const params: Record<string, string> = {
    select: 'id,folio,guest_name,guest_email,guest_phone,room_type,check_in,check_out,nights,total_mxn,adults,children,status,payment_method,notes,created_at',
    order: toSupabaseOrder(sort),
  };

  // When searching by text, ignore status filter to find everything
  if (q) {
    // PostgREST ilike on multiple columns — use OR via or= param
    params['or'] = `folio.ilike.*${q}*,guest_name.ilike.*${q}*,guest_email.ilike.*${q}*`;
  } else if (status === 'all') {
    // sin filtro de status — muestra absolutamente todas
  } else if (status) {
    params['status'] = `eq.${status}`;
  } else {
    // default "Activas": excluye canceladas
    params['status'] = 'not.in.(cancelled)';
  }

  if (!q) {
    if (date_from) params['check_in']       = `gte.${date_from}`;
    if (date_to)   params['check_out']      = `lte.${date_to}`;
    if (payment)   params['payment_method'] = `eq.${payment}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await supabaseGet<any>('reservations', params, true);

  const statusOptions = [
    { value: '',               label: 'Activas (todas)'          },
    { value: 'confirmed',      label: 'Confirmadas'              },
    { value: 'pending',        label: 'Pendientes'               },
    { value: 'pending_payment', label: 'Pago pendiente'          },
    { value: 'waitlist',       label: 'Lista de espera'          },
    { value: 'checked_out',    label: 'Check-out realizados'     },
    { value: 'all',            label: 'Todas (incl. canceladas)' },
    { value: 'cancelled',      label: 'Canceladas'               },
    { value: 'no_show',        label: 'No show'                  },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#040404' }}>Reservaciones</h1>
        <Link href="/admin/nueva" style={{
          padding: '9px 20px', borderRadius: '980px',
          background: '#856d47', color: '#fff', textDecoration: 'none',
          fontSize: '0.82rem', fontWeight: 600,
        }}>
          + Nueva reservación
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar folio, nombre, email…"
          style={{ ...inputStyle, minWidth: '220px' }}
        />
        <select name="status" defaultValue={status} style={selectStyle}>
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select name="payment" defaultValue={payment} style={selectStyle}>
          {PAYMENT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} style={selectStyle}>
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input type="date" name="date_from" defaultValue={date_from} style={inputStyle} />
        <input type="date" name="date_to"   defaultValue={date_to}   style={inputStyle} />
        <button type="submit" style={{
          padding: '9px 18px', borderRadius: '8px', border: 'none',
          background: '#856d47', color: '#fff', fontSize: '0.82rem',
          fontWeight: 600, cursor: 'pointer',
        }}>Filtrar</button>
        {(q || status || payment || date_from || date_to || sort !== 'created_at.desc') && (
          <Link href="/admin/reservaciones" style={{
            padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #e8e4de', background: '#fff',
            color: '#4a4a4a', textDecoration: 'none', fontSize: '0.82rem',
          }}>Limpiar</Link>
        )}
      </form>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
        <ReservationTable initialData={rows} />
      </div>

      <p style={{ color: '#6b6b6b', fontSize: '0.78rem', marginTop: '12px' }}>
        {rows.length} reservación{rows.length !== 1 ? 'es' : ''}
      </p>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #e8e4de', background: '#fff',
  fontSize: '0.82rem', color: '#040404',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #e8e4de', background: '#fff',
  fontSize: '0.82rem', color: '#040404',
};
