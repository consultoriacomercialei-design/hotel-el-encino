'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

const PRESETS: { id: string; label: string; days?: number; ytd?: boolean; all?: boolean }[] = [
  { id: '7d',  label: '7 días',  days: 7   },
  { id: '30d', label: '30 días', days: 30  },
  { id: '90d', label: '90 días', days: 90  },
  { id: 'ytd', label: 'Año actual', ytd: true },
  { id: 'all', label: 'Todo el historial', all: true },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function yearStartIso(): string {
  return `${new Date().getFullYear()}-01-01`;
}

interface Props {
  from: string;
  to: string;
  presetId: string;
}

export default function DateRangeFilter({ from, to, presetId }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo,   setCustomTo]   = useState(to);

  const apply = (next: { from?: string; to?: string; preset?: string }) => {
    const sp = new URLSearchParams(params.toString());
    if (next.preset) sp.set('preset', next.preset); else sp.delete('preset');
    if (next.from)   sp.set('from', next.from);     else sp.delete('from');
    if (next.to)     sp.set('to',   next.to);       else sp.delete('to');
    startTransition(() => router.push(`?${sp.toString()}`, { scroll: false }));
  };

  const handlePreset = (p: typeof PRESETS[number]) => {
    if (p.all) { apply({ preset: 'all' }); return; }
    if (p.ytd) { apply({ preset: 'ytd', from: yearStartIso(), to: todayIso() }); return; }
    if (p.days) { apply({ preset: p.id, from: daysAgoIso(p.days), to: todayIso() }); return; }
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    apply({ preset: 'custom', from: customFrom, to: customTo });
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e4de', borderRadius: '12px',
      padding: '12px 14px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#856d47' }}>
        Rango
      </span>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => {
          const active = presetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePreset(p)}
              disabled={isPending}
              style={{
                padding: '5px 12px', borderRadius: '999px',
                border: active ? '1px solid #856d47' : '1px solid #e0dbd4',
                background: active ? '#856d47' : '#fff',
                color: active ? '#fff' : '#4a4a4a',
                fontSize: '0.74rem', fontWeight: active ? 700 : 500,
                cursor: isPending ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
        <input
          type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #e0dbd4', fontSize: '0.78rem', color: '#1a1a1a', background: '#fafaf8' }}
        />
        <span style={{ fontSize: '0.75rem', color: '#888' }}>→</span>
        <input
          type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #e0dbd4', fontSize: '0.78rem', color: '#1a1a1a', background: '#fafaf8' }}
        />
        <button
          onClick={applyCustom}
          disabled={isPending || !customFrom || !customTo}
          style={{
            padding: '6px 14px', borderRadius: '6px',
            border: 'none', background: '#856d47', color: '#fff',
            fontSize: '0.74rem', fontWeight: 600,
            cursor: isPending || !customFrom || !customTo ? 'not-allowed' : 'pointer',
            opacity: isPending || !customFrom || !customTo ? 0.5 : 1,
          }}
        >
          Aplicar
        </button>
      </div>

      {presetId !== 'all' && (
        <div style={{ width: '100%', fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>
          Métricas calculadas sobre check-ins entre <strong>{from}</strong> y <strong>{to}</strong>.
          GA4 y &quot;próximas liquidaciones&quot; mantienen su propia ventana.
        </div>
      )}
    </div>
  );
}
