'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  month: string;
  /** Correo de la contadora. Vacío = no se puede enviar. */
  contadora: string;
  hayFacturas: boolean;
}

export default function MonthPicker({ month, contadora, hayFacturas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const handleSend = async () => {
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/invoices/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      setMsg(res.ok
        ? { kind: 'ok', text: `Enviado a ${data.to} — ${data.count} factura(s), $${Number(data.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` }
        : { kind: 'error', text: data.error ?? 'No se pudo enviar' });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Error de red' });
    } finally {
      setSending(false);
    }
  };

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8e4de', borderRadius: 14, padding: '18px 24px' };
  const btn = (bg: string, disabled: boolean): React.CSSProperties => ({
    padding: '9px 18px', borderRadius: 8, border: 'none', background: disabled ? '#ccc' : bg,
    color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none', display: 'inline-block',
  });

  const puedeEnviar = !!contadora && hayFacturas && !sending;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.55)', marginBottom: 5 }}>
            Mes
          </label>
          <input
            type="month"
            value={month}
            disabled={isPending}
            onChange={e => {
              const v = e.target.value;
              if (v) startTransition(() => router.push(`/admin/facturas?month=${v}`));
            }}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.86rem', background: '#fafaf8' }}
          />
        </div>

        <a
          href={hayFacturas ? `/api/admin/invoices/export?month=${month}` : undefined}
          style={btn('#856d47', !hayFacturas)}
          onClick={e => { if (!hayFacturas) e.preventDefault(); }}
        >
          Descargar paquete (ZIP + Excel)
        </a>

        <button onClick={handleSend} disabled={!puedeEnviar} style={btn('#27ae60', !puedeEnviar)}>
          {sending ? 'Enviando…' : 'Enviar a la contadora'}
        </button>
      </div>

      {!contadora && (
        <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#856d47' }}>
          Falta el correo de la contadora. Configúralo en{' '}
          <a href="/admin/configuracion" style={{ color: '#856d47', fontWeight: 600 }}>Configuración</a>{' '}
          para poder enviar y para que el envío automático del día 1 funcione.
        </p>
      )}
      {contadora && (
        <p style={{ margin: '12px 0 0', fontSize: '0.76rem', color: '#6b6b6b' }}>
          Se envía a <strong>{contadora}</strong> · automático el día 1 de cada mes con el mes anterior.
        </p>
      )}
      {msg && (
        <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: msg.kind === 'ok' ? '#1e8449' : '#c62828' }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
