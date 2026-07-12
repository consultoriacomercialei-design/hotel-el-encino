'use client';

import { useState } from 'react';
import { hostJson, pesos, type RoomSummary } from '../host';
import { C, card, Field, TextInput, Button, Badge, Banner } from '../ui';
import RoomManager from './RoomManager';

export default function RoomsList({
  lodgingId, rooms, onChanged,
}: {
  lodgingId: string;
  rooms: RoomSummary[];
  onChanged: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [maxOcc, setMaxOcc] = useState('2');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addRoom() {
    if (name.trim().length < 1 || !price) { setError('Nombre y precio son obligatorios.'); return; }
    setSaving(true);
    setError('');
    try {
      await hostJson(`organizer/lodgings/${lodgingId}/rooms`, 'POST', {
        name: name.trim(),
        base_price_cents: Math.round(parseFloat(price) * 100),
        max_occupancy: parseInt(maxOcc, 10) || 1,
      });
      setName(''); setPrice(''); setMaxOcc('2'); setAdding(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p style={{ fontFamily: C.sans, fontSize: '0.78rem', color: 'rgba(0,0,0,0.45)', margin: '0 0 1rem' }}>
        Toca una habitación para editar sus datos, precio, disponibilidad y calendarios.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {rooms.map((r) => {
          const open = expandedId === r.id;
          return (
            <div key={r.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {/* Encabezado (toca para desplegar) */}
              <div
                onClick={() => setExpandedId(open ? null : r.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1.1rem 1.25rem' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink }}>{r.name}</span>
                    <Badge
                      color={r.status === 'published' ? '#2a7a4f' : 'rgba(0,0,0,0.5)'}
                      bg={r.status === 'published' ? 'rgba(42,122,79,0.1)' : 'rgba(0,0,0,0.06)'}
                    >
                      {r.status === 'published' ? 'Publicada' : r.status === 'hidden' ? 'Oculta' : 'Borrador'}
                    </Badge>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: '0.76rem', color: 'rgba(0,0,0,0.5)', margin: 0 }}>
                    {pesos(r.base_price_cents)} / noche · hasta {r.max_occupancy} huésped{r.max_occupancy > 1 ? 'es' : ''}
                    {r.total_units > 1 ? ` · ${r.total_units} unidades` : ''}
                    {r.google_calendar_id ? ' · Google Calendar ✓' : ''}
                  </p>
                </div>
                <span style={{ fontFamily: C.sans, fontSize: '0.72rem', letterSpacing: '0.04em', color: 'rgba(0,0,0,0.4)', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  {open ? 'Cerrar' : 'Editar'}
                  <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                </span>
              </div>

              {/* Contenido desplegado en el mismo lugar */}
              {open && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: '1.25rem', background: 'rgba(0,0,0,0.015)' }}>
                  <RoomManager lodgingId={lodgingId} roomId={r.id} onChanged={onChanged} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div style={card}>
          {error && <Banner tone="error">{error}</Banner>}
          <Field label="Nombre de la habitación">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Habitación doble" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Precio por noche ($)">
              <TextInput inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1800" />
            </Field>
            <Field label="Ocupación máxima">
              <TextInput inputMode="numeric" value={maxOcc} onChange={(e) => setMaxOcc(e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button onClick={addRoom} disabled={saving}>{saving ? 'Agregando…' : 'Agregar'}</Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setError(''); }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>+ Agregar habitación</Button>
      )}
    </div>
  );
}
