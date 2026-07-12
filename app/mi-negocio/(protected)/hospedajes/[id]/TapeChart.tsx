'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { host, type CalendarData } from '../host';
import { C, card, Button, Spinner, Banner } from '../ui';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Cuenta la ocupación por día (check_in <= día < check_out). */
function occupancyByDay(cal: CalendarData): Map<string, number> {
  const map = new Map<string, number>();
  const addRange = (start: string, end: string, units: number) => {
    for (let d = start; d < end; ) {
      map.set(d, (map.get(d) ?? 0) + units);
      const nx = new Date(`${d}T00:00:00Z`);
      nx.setUTCDate(nx.getUTCDate() + 1);
      d = nx.toISOString().slice(0, 10);
    }
  };
  cal.hotel_reservations.forEach((r) => addRange(r.check_in, r.check_out, Math.max(1, r.rooms)));
  cal.santiapp_reservations.forEach((r) => addRange(r.check_in, r.check_out, 1));
  cal.blocks.forEach((b) => addRange(b.starts_on, b.ends_on, 1));
  return map;
}

export default function TapeChart({ lodgingId }: { lodgingId: string }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() };
  });
  const [cal, setCal] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const from = useMemo(() => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`, [cursor]);
  const to = useMemo(() => {
    const d = new Date(Date.UTC(cursor.y, cursor.m + 1, 1));
    return d.toISOString().slice(0, 10);
  }, [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCal(await host<CalendarData>(`organizer/lodgings/${lodgingId}/calendar?from=${from}&to=${to}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario.');
    } finally {
      setLoading(false);
    }
  }, [lodgingId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const occ = cal ? occupancyByDay(cal) : new Map();
  const total = cal?.total_units ?? 0;

  // Días del mes con relleno inicial (día de la semana del 1°).
  const firstDow = new Date(`${from}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${from.slice(0, 8)}${String(d).padStart(2, '0')}`);

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <Button variant="ghost" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</Button>
        <span style={{ fontFamily: C.serif, fontSize: '1.05rem', color: C.ink }}>{MONTHS[cursor.m]} {cursor.y}</span>
        <Button variant="ghost" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</Button>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {loading ? (
        <Spinner />
      ) : (
        <>
          <p style={{ fontFamily: C.sans, fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)', margin: '0 0 0.75rem' }}>
            Capacidad total: <strong>{total}</strong> unidad{total === 1 ? '' : 'es'}. Cada celda muestra libres de ese total.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {DOW.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontFamily: C.sans, fontSize: '0.6rem', color: 'rgba(0,0,0,0.35)', letterSpacing: '0.08em', padding: '2px 0' }}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const used = occ.get(day) ?? 0;
              const free = Math.max(0, total - used);
              const full = total > 0 && free === 0;
              const num = parseInt(day.slice(8), 10);
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', fontFamily: C.sans,
                    background: full ? 'rgba(176,57,42,0.1)' : free < total ? 'rgba(176,125,62,0.12)' : 'rgba(42,122,79,0.1)',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)' }}>{num}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, color: full ? '#b0392a' : free < total ? '#8a5a1e' : '#2a7a4f' }}>
                    {total > 0 ? free : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.9rem', flexWrap: 'wrap', fontFamily: C.sans, fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)' }}>
            <Legend color="rgba(42,122,79,0.1)" label="Todo libre" />
            <Legend color="rgba(176,125,62,0.12)" label="Parcial" />
            <Legend color="rgba(176,57,42,0.1)" label="Lleno" />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} /> {label}
    </span>
  );
}
