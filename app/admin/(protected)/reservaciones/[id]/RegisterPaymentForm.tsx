'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerPartialPaymentAction } from '../../actions';

/** b11: registrar pago manual (anticipo o total) desde el detalle. */
export default function RegisterPaymentForm({ id, balance }: { id: string; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.round(balance)));
  const [method, setMethod] = useState('efectivo');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '0.85rem', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e0dcd4' }}>
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', margin: '0 0 8px' }}>
        Registrar pago recibido
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
        <input type="number" min="1" max={balance} value={amount}
          onChange={e => setAmount(e.target.value)} style={inputStyle} aria-label="Monto MXN" />
        <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
          <option value="efectivo">Efectivo</option>
          <option value="terminal">Tarjeta (terminal)</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <button
          disabled={isPending || !(parseFloat(amount) > 0)}
          onClick={() => {
            setError('');
            startTransition(async () => {
              const res = await registerPartialPaymentAction(id, parseFloat(amount), method);
              if (!res.ok) { setError(res.error ?? 'Error'); return; }
              router.refresh();
            });
          }}
          style={{
            padding: '8px 16px', background: '#856d47', color: '#fff', border: 'none',
            borderRadius: '980px', fontSize: '0.82rem', fontWeight: 600,
            cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
      {error && <p style={{ color: '#c62828', fontSize: '0.78rem', margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}
