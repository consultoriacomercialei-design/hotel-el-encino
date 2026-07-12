'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { host, hostJson, type RoomBlock, type RoomReservation } from '../host';
import { C, card, Field, TextInput, Button, Badge, Banner, Spinner } from '../ui';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

type DayStatus = 'free' | 'reserved' | 'block';

function buildStatusMap(blocks: RoomBlock[], reservations: RoomReservation[]): Map<string, DayStatus> {
  const map = new Map<string, DayStatus>();
  const paint = (start: string, end: string, status: DayStatus) => {
    for (let d = start; d < end; ) {
      map.set(d, status);
      const nx = new Date(`${d}T00:00:00Z`);
      nx.setUTCDate(nx.getUTCDate() + 1);
      d = nx.toISOString().slice(0, 10);
    }
  };
  blocks.forEach((b) => paint(b.starts_on, b.ends_on, 'block'));
  reservations.forEach((r) => paint(r.check_in, r.check_out, 'reserved'));
  return map;
}

export default function RoomAvailability({ lodgingId, roomId }: { lodgingId: string; roomId: string }) {
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await host<{ blocks: RoomBlock[]; reservations: RoomReservation[] }>(
        `organizer/lodgings/${lodgingId}/rooms/${roomId}/blocks`
      );
      setBlocks(data.blocks ?? []);
      setReservations(data.reservations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.');
    } finally {
      setLoading(false);
    }
  }, [lodgingId, roomId]);

  useEffect(() => { void load(); }, [load]);

  const statusMap = useMemo(() => buildStatusMap(blocks, reservations), [blocks, reservations]);

  async function addBlock() {
    if (!start || !end) { setError('Elige fecha de inicio y fin.'); return; }
    if (end <= start) { setError('La fecha de fin debe ser posterior al inicio.'); return; }
    setSaving(true);
    setError('');
    try {
      await hostJson(`organizer/lodgings/${lodgingId}/rooms/${roomId}/blocks`, 'POST', {
        starts_on: start, ends_on: end, reason: reason.trim() || undefined,
      });
      setStart(''); setEnd(''); setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo bloquear.');
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    try {
      await host(`organizer/lodgings/${lodgingId}/rooms/${roomId}/blocks?block_id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar el bloqueo.');
    }
  }

  const from = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`;
  const firstDow = new Date(`${from}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${from.slice(0, 8)}${String(d).padStart(2, '0')}`);

  const cellBg: Record<DayStatus, string> = {
    free: 'rgba(42,122,79,0.08)',
    reserved: 'rgba(176,125,62,0.16)',
    block: 'rgba(13,34,30,0.14)',
  };

  const manualBlocks = blocks.filter((b) => b.source === 'manual');

  if (loading) return <Spinner label="Cargando disponibilidad…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && <Banner tone="error">{error}</Banner>}

      {/* Calendario */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Button variant="ghost" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</Button>
          <span style={{ fontFamily: C.serif, fontSize: '1.05rem', color: C.ink }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <Button variant="ghost" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {DOW.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontFamily: C.sans, fontSize: '0.6rem', color: 'rgba(0,0,0,0.35)', padding: '2px 0' }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const st = (statusMap.get(day) ?? 'free') as DayStatus;
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cellBg[st], fontFamily: C.sans, fontSize: '0.72rem', color: st === 'block' ? '#0d221e' : 'rgba(0,0,0,0.55)' }}>
                {parseInt(day.slice(8), 10)}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.9rem', flexWrap: 'wrap', fontFamily: C.sans, fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)' }}>
          <Legend color={cellBg.free} label="Libre" />
          <Legend color={cellBg.reserved} label="Reservada" />
          <Legend color={cellBg.block} label="Bloqueada" />
        </div>
      </div>

      {/* Bloquear fechas */}
      <div style={card}>
        <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 0.85rem' }}>Bloquear fechas</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Desde"><TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Hasta"><TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Motivo" hint="Opcional (mantenimiento, uso personal…)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button onClick={addBlock} disabled={saving}>{saving ? 'Bloqueando…' : 'Bloquear'}</Button>
      </div>

      {/* Bloqueos manuales */}
      {manualBlocks.length > 0 && (
        <div style={card}>
          <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink, margin: '0 0 0.85rem' }}>Bloqueos activos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {manualBlocks.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <span style={{ fontFamily: C.sans, fontSize: '0.82rem', color: C.ink }}>{b.starts_on} → {b.ends_on}</span>
                  {b.reason && <span style={{ fontFamily: C.sans, fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)', marginLeft: 8 }}>{b.reason}</span>}
                </div>
                <button onClick={() => removeBlock(b.id)} style={{ background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem' }}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocks.some((b) => b.source === 'ical') && (
        <Badge bg="rgba(120,80,160,0.12)" color="#6a4a8a">Hay fechas importadas de calendarios externos (iCal)</Badge>
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
