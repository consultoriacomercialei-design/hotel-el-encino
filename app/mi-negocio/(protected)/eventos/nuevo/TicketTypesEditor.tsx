'use client';

import { toCents, toPesos } from '../../hospedajes/host';
import { C, card, Field, TextInput, Select, Button, Badge } from '../../hospedajes/ui';
import { localToISO, type TicketTypeInput, type PhaseInput } from '../events';

/** Estado de UI (precios como texto en pesos, fechas como datetime-local). */
export interface PhaseUI {
  name: string;
  price: string;
  trigger_type: 'date' | 'stock';
  ends_at_local: string;
  sold_threshold: string;
}
export interface TicketTypeUI {
  name: string;
  price: string;
  quantity_total: string;
  show_remaining: boolean;
  remaining_note: string;
  phases: PhaseUI[];
}

export const emptyType = (): TicketTypeUI => ({
  name: '', price: '', quantity_total: '', show_remaining: true, remaining_note: '', phases: [],
});

/** Convierte el estado de UI al cuerpo que espera el backend. */
export function toTicketTypeInputs(types: TicketTypeUI[]): TicketTypeInput[] {
  return types.map((t) => {
    const phases: PhaseInput[] = t.phases.map((p) => ({
      name: p.name.trim(),
      price_cents: toCents(p.price),
      trigger_type: p.trigger_type,
      ...(p.trigger_type === 'date'
        ? { ends_at: localToISO(p.ends_at_local) }
        : { sold_threshold: parseInt(p.sold_threshold, 10) || 0 }),
    }));
    return {
      name: t.name.trim(),
      price_cents: toCents(t.price),
      quantity_total: parseInt(t.quantity_total, 10) || 0,
      show_remaining: t.show_remaining,
      remaining_note: t.remaining_note.trim() || undefined,
      phases: phases.length ? phases : undefined,
    };
  });
}

export default function TicketTypesEditor({
  types, onChange,
}: {
  types: TicketTypeUI[];
  onChange: (next: TicketTypeUI[]) => void;
}) {
  const setType = (i: number, patch: Partial<TicketTypeUI>) =>
    onChange(types.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeType = (i: number) => onChange(types.filter((_, idx) => idx !== i));
  const addType = () => onChange([...types, emptyType()]);

  const setPhase = (ti: number, pi: number, patch: Partial<PhaseUI>) =>
    setType(ti, { phases: types[ti].phases.map((p, idx) => (idx === pi ? { ...p, ...patch } : p)) });
  const addPhase = (ti: number) =>
    setType(ti, { phases: [...types[ti].phases, { name: '', price: '', trigger_type: 'date', ends_at_local: '', sold_threshold: '' }] });
  const removePhase = (ti: number, pi: number) =>
    setType(ti, { phases: types[ti].phases.filter((_, idx) => idx !== pi) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {types.map((t, i) => (
        <div key={i} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink }}>Boleto {i + 1}</span>
            {types.length > 1 && (
              <button type="button" onClick={() => removeType(i)} style={{ background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem' }}>Quitar</button>
            )}
          </div>
          <Field label="Nombre"><TextInput value={t.name} onChange={(e) => setType(i, { name: e.target.value })} placeholder="General / VIP" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Precio ($)"><TextInput inputMode="numeric" value={t.price} onChange={(e) => setType(i, { price: e.target.value })} placeholder="350" /></Field>
            <Field label="Cantidad total"><TextInput inputMode="numeric" value={t.quantity_total} onChange={(e) => setType(i, { quantity_total: e.target.value })} placeholder="100" /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: C.sans, fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={t.show_remaining} onChange={(e) => setType(i, { show_remaining: e.target.checked })} />
            Mostrar "quedan N disponibles"
          </label>
          {!t.show_remaining && (
            <Field label="Nota alterna" hint="Ej. «Casi agotado» (opcional)">
              <TextInput value={t.remaining_note} onChange={(e) => setType(i, { remaining_note: e.target.value })} />
            </Field>
          )}

          {/* Fases de precio */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: C.sans, fontSize: '0.78rem', color: 'rgba(0,0,0,0.55)' }}>Fases de precio (opcional)</span>
              <Badge>{t.phases.length}</Badge>
            </div>
            {t.phases.map((p, pi) => (
              <div key={pi} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <TextInput value={p.name} placeholder="Preventa" onChange={(e) => setPhase(i, pi, { name: e.target.value })} style={{ flex: 2 }} />
                  <TextInput inputMode="numeric" value={p.price} placeholder="Precio $" onChange={(e) => setPhase(i, pi, { price: e.target.value })} style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Select value={p.trigger_type} onChange={(e) => setPhase(i, pi, { trigger_type: e.target.value as 'date' | 'stock' })} style={{ width: 'auto', fontSize: '0.8rem' }}>
                    <option value="date">Hasta fecha</option>
                    <option value="stock">Hasta vender N</option>
                  </Select>
                  {p.trigger_type === 'date' ? (
                    <TextInput type="datetime-local" value={p.ends_at_local} onChange={(e) => setPhase(i, pi, { ends_at_local: e.target.value })} style={{ width: 'auto', fontSize: '0.8rem' }} />
                  ) : (
                    <TextInput inputMode="numeric" value={p.sold_threshold} placeholder="N vendidos" onChange={(e) => setPhase(i, pi, { sold_threshold: e.target.value })} style={{ width: 120, fontSize: '0.8rem' }} />
                  )}
                  <button type="button" onClick={() => removePhase(i, pi)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem' }}>Quitar</button>
                </div>
              </div>
            ))}
            {t.phases.length < 5 && (
              <button type="button" onClick={() => addPhase(i)} style={{ background: 'none', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)' }}>+ Fase</button>
            )}
          </div>
        </div>
      ))}
      {types.length < 5 && <Button variant="outline" onClick={addType}>+ Otro tipo de boleto</Button>}
    </div>
  );
}
