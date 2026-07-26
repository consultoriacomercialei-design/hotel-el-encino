'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveAccountingAction } from './actions';

export default function AccountingForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const valido = email.trim() === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const guardar = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        await saveAccountingAction(email);
        setMsg({ kind: 'ok', text: email.trim()
          ? 'Guardado. El paquete mensual se enviará a ese correo el día 1.'
          : 'Correo borrado. El envío automático queda apagado.' });
      } catch (e) {
        setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar' });
      }
    });
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: 14, padding: '22px 24px' }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47' }}>
        Contabilidad
      </p>
      <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#6b6b6b', lineHeight: 1.6 }}>
        El día 1 de cada mes se le manda a tu contadora el paquete del mes anterior:
        un ZIP con el XML y el PDF de cada factura, más un resumen en Excel.
        Si dejas esto vacío, no se envía nada.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 600, color: 'rgba(15,15,15,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Correo de la contadora
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contadora@despacho.com"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: `1px solid ${valido ? '#ddd' : '#c62828'}`,
              fontSize: '0.86rem', background: '#fafaf8', boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={guardar}
          disabled={isPending || !valido}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: isPending || !valido ? '#ccc' : '#856d47', color: '#fff',
            fontSize: '0.83rem', fontWeight: 700,
            cursor: isPending || !valido ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {!valido && <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#c62828' }}>Ese correo no tiene formato válido.</p>}
      {msg && <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: msg.kind === 'ok' ? '#1e8449' : '#c62828' }}>{msg.text}</p>}

      <p style={{ margin: '14px 0 0', fontSize: '0.78rem' }}>
        <Link href="/admin/facturas" style={{ color: '#856d47', fontWeight: 600 }}>Ver facturas emitidas →</Link>
      </p>
    </div>
  );
}
