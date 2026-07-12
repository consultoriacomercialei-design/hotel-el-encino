'use client';

import { useState, useTransition } from 'react';
import { forceCancelReservation } from './actions';
import type { LodgingReservationRow } from './page';

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 })
    .format(cents / 100);
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  confirmed:       { bg: '#dcfce7', fg: '#166534', label: 'Confirmada' },
  pending_payment: { bg: '#fef9c3', fg: '#854d0e', label: 'Pago pendiente' },
  cancelled:       { bg: '#f3f4f6', fg: '#4b5563', label: 'Cancelada' },
  refunded:        { bg: '#e0e7ff', fg: '#3730a3', label: 'Reembolsada' },
};

export default function HospedajesTable({ rows }: { rows: LodgingReservationRow[] }) {
  if (rows.length === 0) {
    return <p style={{ color: '#6b7280' }}>No hay reservas con estos filtros.</p>;
  }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
            {['Huésped', 'Propiedad / Habitación', 'Fechas', 'Noches', 'Total', 'Comisión', 'Estado', 'Acción'].map((h) => (
              <th key={h} style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ r }: { r: LodgingReservationRow }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const st = STATUS_STYLE[r.status] ?? { bg: '#f3f4f6', fg: '#4b5563', label: r.status };
  const cancellable = r.status === 'confirmed' || r.status === 'pending_payment';

  function doCancel() {
    startTransition(async () => {
      const res = await forceCancelReservation(r.id);
      setResult(res.message);
      setConfirming(false);
    });
  }

  return (
    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.6rem 0.75rem' }}>
        <div style={{ fontWeight: 600 }}>{r.guest_name}</div>
        <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.guest_email ?? r.guest_phone ?? ''}</div>
      </td>
      <td style={{ padding: '0.6rem 0.75rem' }}>
        <div>{r.lodgings?.name ?? '—'}</div>
        <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.lodging_rooms?.name ?? ''}</div>
      </td>
      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>{r.check_in} → {r.check_out}</td>
      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{r.nights}</td>
      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>{money(r.amount_cents, r.currency)}</td>
      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: '#6b7280' }}>{money(r.application_fee_cents, r.currency)}</td>
      <td style={{ padding: '0.6rem 0.75rem' }}>
        <span style={{ background: st.bg, color: st.fg, padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
          {st.label}
        </span>
      </td>
      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
        {result ? (
          <span style={{ color: '#166534', fontSize: '0.78rem' }}>{result}</span>
        ) : !cancellable ? (
          <span style={{ color: '#9ca3af' }}>—</span>
        ) : confirming ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <button onClick={doCancel} disabled={pending}
              style={{ padding: '0.3rem 0.6rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
              {pending ? 'Cancelando…' : 'Sí, cancelar y reembolsar'}
            </button>
            <button onClick={() => setConfirming(false)} disabled={pending}
              style={{ padding: '0.3rem 0.6rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
              No
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)}
            style={{ padding: '0.3rem 0.7rem', background: 'white', color: '#b91c1c', border: '1px solid #b91c1c', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
            Acción Forzada
          </button>
        )}
      </td>
    </tr>
  );
}
