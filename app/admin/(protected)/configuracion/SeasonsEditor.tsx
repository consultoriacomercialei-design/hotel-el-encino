'use client';

import { useState } from 'react';
import type { Season } from '@/app/lib/pricing';
import { saveSeasonsAction } from './actions';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e4de',
  borderRadius: '14px',
  padding: '22px 24px',
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#856d47',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e8e4de',
  fontSize: '0.9rem',
  color: '#1a1a1a',
  background: '#fafaf8',
};

const smallLabel: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 600,
  color: '#856d47',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function newSeason(): Season {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? `season-${crypto.randomUUID().slice(0, 8)}`
    : `season-${Date.now()}`;
  return { id, label: 'Nueva temporada', active: true, type: 'surcharge', amount: 500, ranges: [{ from: '', to: '' }] };
}

export default function SeasonsEditor({ initialSeasons }: { initialSeasons: Season[] }) {
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [status, setStatus]   = useState('');
  const [busy, setBusy]       = useState(false);

  const patch = (i: number, changes: Partial<Season>) =>
    setSeasons(prev => prev.map((s, idx) => idx === i ? { ...s, ...changes } : s));

  const patchRange = (si: number, ri: number, changes: Partial<Season['ranges'][number]>) =>
    setSeasons(prev => prev.map((s, idx) =>
      idx === si ? { ...s, ranges: s.ranges.map((r, j) => j === ri ? { ...r, ...changes } : r) } : s));

  const addRange = (si: number) =>
    setSeasons(prev => prev.map((s, idx) => idx === si ? { ...s, ranges: [...s.ranges, { from: '', to: '' }] } : s));

  const removeRange = (si: number, ri: number) =>
    setSeasons(prev => prev.map((s, idx) =>
      idx === si ? { ...s, ranges: s.ranges.filter((_, j) => j !== ri) } : s));

  const addSeason    = () => setSeasons(prev => [...prev, newSeason()]);
  const removeSeason = (i: number) => setSeasons(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    // Validación mínima: fechas completas y coherentes por rango
    for (const s of seasons) {
      for (const r of s.ranges) {
        if (!r.from || !r.to) { setStatus('Completa las fechas de cada rango'); setTimeout(() => setStatus(''), 3000); return; }
        if (r.from > r.to)    { setStatus(`Rango inválido en "${s.label}": inicio después del fin`); setTimeout(() => setStatus(''), 3500); return; }
      }
    }
    setBusy(true); setStatus('');
    try {
      await saveSeasonsAction(seasons);
      setStatus('Guardado');
    } catch {
      setStatus('Error al guardar');
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...labelStyle }}>Temporadas</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {status && (
            <span style={{ fontSize: '0.78rem', color: status === 'Guardado' ? '#2e7d32' : '#c62828' }}>{status}</span>
          )}
          <button
            onClick={save}
            disabled={busy}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2e7d32', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Guardando…' : 'Guardar temporadas'}
          </button>
        </div>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#6b6b6b', lineHeight: 1.5 }}>
        <strong>Recargo</strong> suma un monto sobre la tarifa base por noche. <strong>Tarifa plana</strong> reemplaza la tarifa base por noche (ignora entre semana / fin de semana). Solo las temporadas <strong>activas</strong> aplican.
      </p>

      {seasons.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: '#aaa', padding: '10px 0' }}>No hay temporadas. Agrega una abajo.</p>
      )}

      {seasons.map((s, i) => (
        <div key={s.id} style={{ padding: '16px', marginBottom: '12px', background: s.active ? '#fafaf8' : '#f5f3ef', borderRadius: '10px', border: '1px solid #e8e4de', opacity: s.active ? 1 : 0.7 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px', gap: '10px', marginBottom: '12px', alignItems: 'end' }}>
            <div>
              <div style={smallLabel}>Nombre</div>
              <input value={s.label} onChange={e => patch(i, { label: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={smallLabel}>Tipo</div>
              <select value={s.type} onChange={e => patch(i, { type: e.target.value as Season['type'] })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}>
                <option value="surcharge">Recargo (+$)</option>
                <option value="flat">Tarifa plana</option>
              </select>
            </div>
            <div>
              <div style={smallLabel}>{s.type === 'flat' ? 'Precio/noche' : 'Recargo/noche'}</div>
              <input type="number" min={0} step={50} value={s.amount} onChange={e => patch(i, { amount: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Rangos de fecha */}
          <div style={{ marginBottom: '10px' }}>
            <div style={smallLabel}>Fechas (una o varias)</div>
            {s.ranges.map((r, ri) => (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input type="date" value={r.from} onChange={e => patchRange(i, ri, { from: e.target.value })} style={{ ...inputStyle, padding: '6px 10px' }} />
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>→</span>
                <input type="date" value={r.to} onChange={e => patchRange(i, ri, { to: e.target.value })} style={{ ...inputStyle, padding: '6px 10px' }} />
                {s.ranges.length > 1 && (
                  <button onClick={() => removeRange(i, ri)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.75rem', color: '#c62828', cursor: 'pointer' }}>Quitar</button>
                )}
              </div>
            ))}
            <button onClick={() => addRange(i)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px dashed #d8d2c8', background: 'transparent', fontSize: '0.74rem', color: '#856d47', cursor: 'pointer' }}>+ Agregar rango</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => patch(i, { active: !s.active })}
              style={{ padding: '4px 12px', borderRadius: '980px', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: s.active ? '#e8f5e9' : '#f0f0f0', color: s.active ? '#2e7d32' : '#757575' }}
            >
              {s.active ? 'Activa' : 'Inactiva'}
            </button>
            <button
              onClick={() => removeSeason(i)}
              style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid #e0dbd4', background: '#fff', fontSize: '0.75rem', color: '#c62828', cursor: 'pointer' }}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSeason}
        style={{ marginTop: '4px', padding: '10px 16px', borderRadius: '8px', border: '1px dashed #d8d2c8', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#856d47', cursor: 'pointer', width: '100%' }}
      >
        + Agregar temporada
      </button>
    </div>
  );
}
