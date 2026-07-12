'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { editReservationAction, type EditReservationData } from '../../actions';
import type { LineItem } from '@/app/lib/emails';
import { parseAnticipoFromNotes, stripAnticipoFromNotes } from '@/app/lib/balance';

interface ReservationSnapshot {
  id: string;
  folio: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  rooms: number;
  adults: number;
  children: number;
  room_type: string;
  payment_method: string;
  notes?: string;
  line_items?: LineItem[];
}

interface Props {
  reservation: ReservationSnapshot;
  onClose: () => void;
}

const ROOM_OPTIONS = [
  { value: 'suite',  label: 'Suite Encino' },
  { value: 'doble',  label: 'Habitación Doble' },
  { value: 'grupal', label: 'Habitación Grupal' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash',     label: '💵 Efectivo' },
  { value: 'transfer', label: '🏦 Transferencia' },
  { value: 'card',     label: '💳 Tarjeta en hotel' },
  { value: 'online',   label: '💳 Mercado Pago' },
  { value: 'pending',  label: '🏨 Pago al llegar' },
];

function calcNights(ci: string, co: string): number {
  const diff = new Date(co).getTime() - new Date(ci).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}

function emptyItem(): LineItem {
  return { description: '', amount: 0 };
}

/** Parses a string amount safely — returns 0 for empty/invalid */
function parseAmt(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100) / 100;
}

function extractAnticipo(notes: string): string {
  const v = parseAnticipoFromNotes(notes);
  return v === null ? '' : String(v);
}

const stripAnticipo = stripAnticipoFromNotes;

export default function EditReservationModal({ reservation: r, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [checkIn, setCheckIn]         = useState(r.check_in);
  const [checkOut, setCheckOut]       = useState(r.check_out);
  const [nights, setNights]           = useState(String(r.nights));
  const [totalMxn, setTotalMxn]       = useState(String(r.total_mxn));
  const [rooms, setRooms]             = useState(String(r.rooms || 1));
  const [adults, setAdults]           = useState(String(r.adults || 1));
  const [children, setChildren]       = useState(String(r.children ?? 0));
  const [roomType, setRoomType]       = useState(r.room_type);
  const [paymentMethod, setPaymentMethod] = useState(r.payment_method);
  const [notes, setNotes]             = useState(stripAnticipo(r.notes || ''));
  const [anticipo, setAnticipo]       = useState(extractAnticipo(r.notes || ''));

  // line items stored as string amounts to avoid iOS leading-zero bug
  const [items, setItems] = useState<Array<{ description: string; amountStr: string; date: string }>>(
    (r.line_items ?? []).map(it => ({
      description: it.description,
      amountStr:   it.amount > 0 ? String(it.amount) : '',
      date:        it.date ?? '',
    }))
  );

  const handleDateChange = (field: 'in' | 'out', val: string) => {
    if (field === 'in') {
      setCheckIn(val);
      if (checkOut) setNights(String(calcNights(val, checkOut)));
    } else {
      setCheckOut(val);
      if (checkIn) setNights(String(calcNights(checkIn, val)));
    }
  };

  const handleItemAmountChange = (idx: number, val: string) => {
    // allow only digits and one decimal point
    const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const next = items.map((it, i) => i === idx ? { ...it, amountStr: clean } : it);
    setItems(next);
    // auto-update total
    const sum = next.reduce((acc, it) => acc + parseAmt(it.amountStr), 0);
    setTotalMxn(String(Math.round(sum)));
  };

  const handleItemChange = (idx: number, field: 'description' | 'date', val: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addItem = () => setItems(prev => [...prev, { description: '', amountStr: '', date: '' }]);

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    const sum = next.reduce((acc, it) => acc + parseAmt(it.amountStr), 0);
    if (next.length > 0) setTotalMxn(String(Math.round(sum)));
  };

  const handleSave = () => {
    setError('');

    const lineItems: LineItem[] = items
      .filter(it => it.description.trim() !== '')
      .map(it => ({
        description: it.description,
        amount:      parseAmt(it.amountStr),
        ...(it.date ? { date: it.date } : {}),
      }));

    // Rebuild notes: anticipo first (if any), then the rest
    const anticipoAmt = parseAmt(anticipo);
    const baseNotes = stripAnticipo(notes);
    const finalNotes = anticipoAmt > 0
      ? `anticipo $${anticipoAmt.toLocaleString('es-MX')}${baseNotes ? ` · ${baseNotes}` : ''}`
      : baseNotes;

    const data: EditReservationData = {
      check_in:       checkIn,
      check_out:      checkOut,
      nights:         parseInt(nights) || r.nights,
      total_mxn:      parseAmt(totalMxn) || r.total_mxn,
      rooms:          parseInt(rooms) || 1,
      adults:         parseInt(adults) || 1,
      children:       parseInt(children) || 0,
      room_type:      roomType,
      payment_method: paymentMethod,
      notes:          finalNotes,
      line_items:     lineItems,
    };

    startTransition(async () => {
      try {
        const result = await editReservationAction(r.id, data);
        if (!result.ok) { setError(result.error ?? 'Error al guardar'); return; }
        router.refresh();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  };

  // Shared input style — no fixed width, fills container
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 10px', borderRadius: '8px',
    border: '1px solid #e0dbd4', fontSize: '0.85rem',
    background: '#fafaf8', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  const lbl: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#999', marginBottom: '4px', display: 'block',
  };

  const row2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px',
  };

  const itemSumLabel = items.length > 0
    ? `Suma: $${items.reduce((a, it) => a + parseAmt(it.amountStr), 0).toLocaleString('es-MX')} MXN`
    : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '16px 12px 40px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px',
        padding: '20px 16px',
        width: '100%', maxWidth: '520px',
        boxShadow: '0 16px 64px rgba(0,0,0,0.22)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Editar reservación</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#856d47', fontFamily: 'monospace' }}>{r.folio}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#aaa', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
        </div>

        {error && (
          <p style={{ color: '#c62828', fontSize: '0.82rem', background: '#ffebee', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' }}>
            {error}
          </p>
        )}

        {/* Check-in / Check-out */}
        <div style={row2}>
          <div>
            <label style={lbl}>Check-in</label>
            <input type="date" value={checkIn} onChange={e => handleDateChange('in', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Check-out</label>
            <input type="date" value={checkOut} onChange={e => handleDateChange('out', e.target.value)} style={inp} />
          </div>
        </div>

        {/* Nights / Rooms */}
        <div style={row2}>
          <div>
            <label style={lbl}>Noches</label>
            <input
              type="text" inputMode="numeric" value={nights}
              onChange={e => setNights(e.target.value.replace(/\D/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Habitaciones</label>
            <input
              type="text" inputMode="numeric" value={rooms}
              onChange={e => setRooms(e.target.value.replace(/\D/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
        </div>

        {/* Adults / Children */}
        <div style={row2}>
          <div>
            <label style={lbl}>Adultos</label>
            <input
              type="text" inputMode="numeric" value={adults}
              onChange={e => setAdults(e.target.value.replace(/\D/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Niños</label>
            <input
              type="text" inputMode="numeric" value={children}
              onChange={e => setChildren(e.target.value.replace(/\D/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
        </div>

        {/* Room type */}
        <div style={{ marginBottom: '12px' }}>
          <label style={lbl}>Tipo de habitación</label>
          <select value={roomType} onChange={e => setRoomType(e.target.value)} style={inp}>
            {ROOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Payment / Total */}
        <div style={row2}>
          <div>
            <label style={lbl}>Forma de pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp}>
              {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Total MXN $</label>
            <input
              type="text" inputMode="decimal" value={totalMxn}
              onChange={e => setTotalMxn(e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
        </div>

        {/* Anticipo */}
        <div style={{ marginBottom: '12px' }}>
          <label style={lbl}>Anticipo recibido $ (opcional)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text" inputMode="decimal" value={anticipo}
              placeholder="0 — si no hay anticipo, dejar vacío"
              onChange={e => setAnticipo(e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={e => e.target.select()}
              style={inp}
            />
          </div>
          {parseAmt(anticipo) > 0 && parseAmt(totalMxn) > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#2e7d32', margin: '4px 0 0' }}>
              Saldo a cobrar al check-in: ${Math.max(0, parseAmt(totalMxn) - parseAmt(anticipo)).toLocaleString('es-MX')} MXN
            </p>
          )}
          <p style={{ fontSize: '0.72rem', color: '#aaa', margin: '3px 0 0' }}>
            Aparecerá en el correo de confirmación como anticipo ya recibido.
          </p>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={lbl}>Notas internas (sin anticipo)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inp, resize: 'vertical' }} />
        </div>

        {/* ── Line items ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ ...lbl, margin: 0 }}>Partidas del comprobante</span>
            <button onClick={addItem} style={{
              padding: '5px 12px', borderRadius: '6px', border: '1.5px solid #856d47',
              background: '#fff', color: '#856d47', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            }}>+ Agregar</button>
          </div>

          {items.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: '#bbb', fontStyle: 'italic', margin: 0 }}>
              Sin partidas — el recibo mostrará el total general.
            </p>
          )}

          {items.map((item, idx) => (
            <div key={idx} style={{
              background: '#fafaf8', border: '1px solid #f0ece5',
              borderRadius: '10px', padding: '10px 12px', marginBottom: '10px',
            }}>
              {/* Row 1: Concepto (full width) */}
              <div style={{ marginBottom: '8px' }}>
                <label style={lbl}>Concepto</label>
                <input
                  type="text"
                  value={item.description}
                  placeholder="ej: Habitación Santiago"
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                  style={inp}
                />
              </div>

              {/* Row 2: Fecha | Importe | ✕ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <div>
                  <label style={lbl}>Fecha</label>
                  <input
                    type="date"
                    value={item.date}
                    onChange={e => handleItemChange(idx, 'date', e.target.value)}
                    style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Importe $</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.amountStr}
                    placeholder="0"
                    onChange={e => handleItemAmountChange(idx, e.target.value)}
                    onFocus={e => e.target.select()}
                    style={inp}
                  />
                </div>
                <div style={{ paddingBottom: '2px' }}>
                  <button onClick={() => removeItem(idx)} style={{
                    background: '#ffebee', border: 'none', color: '#c62828',
                    width: '34px', height: '38px', borderRadius: '8px',
                    fontSize: '1rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              </div>
            </div>
          ))}

          {itemSumLabel && (
            <p style={{ fontSize: '0.8rem', color: '#6b6b6b', margin: '4px 0 0', textAlign: 'right' }}>
              {itemSumLabel} → total actualizado automáticamente
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e0dbd4',
            background: '#fff', color: '#6b6b6b', fontSize: '0.85rem', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending} style={{
            flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
            background: isPending ? '#ccc' : '#856d47', color: '#fff',
            fontSize: '0.85rem', fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
          }}>
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
