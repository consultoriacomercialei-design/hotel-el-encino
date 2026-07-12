'use client';

/**
 * CheckinModal — Registro de entrada y verificación de identidad del huésped.
 * Se abre desde el detalle de la reservación cuando el huésped llega al hotel.
 * Captura: tipo y número de documento, nacionalidad, fecha de nacimiento (opcional)
 * y registra la hora exacta de entrada.
 */

import { useState, useTransition } from 'react';
import { registerCheckinAction } from '../../actions';

const ID_TYPES = [
  { value: 'INE',       label: 'INE / IFE (México)' },
  { value: 'Pasaporte', label: 'Pasaporte' },
  { value: 'Licencia',  label: 'Licencia de conducir' },
  { value: 'Cédula',    label: 'Cédula profesional' },
  { value: 'Residente', label: 'Tarjeta de residente' },
  { value: 'Otro',      label: 'Otro documento' },
];

interface Props {
  reservationId: string;
  folio: string;
  guestName: string;
  checkIn: string;
  onClose: () => void;
  onSuccess: () => void;
  // Datos previos (si ya se capturaron al crear la reservación)
  currentIdType?: string;
  currentIdNumber?: string;
  currentNationality?: string;
}

function todayAtNow(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckinModal({
  reservationId, folio, guestName, checkIn,
  onClose, onSuccess,
  currentIdType, currentIdNumber, currentNationality,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    id_type:       currentIdType    || 'INE',
    id_number:     currentIdNumber  || '',
    nationality:   currentNationality || 'Mexicana',
    date_of_birth: '',
    checkin_time:  todayAtNow(),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_number.trim()) { setError('El número de documento es requerido.'); return; }
    if (!form.nationality.trim()) { setError('La nacionalidad es requerida.'); return; }
    setError('');

    startTransition(async () => {
      const checkinAt = new Date(`${todayIso()}T${form.checkin_time}:00`).toISOString();
      const result = await registerCheckinAction(reservationId, {
        id_type:       form.id_type,
        id_number:     form.id_number,
        nationality:   form.nationality,
        date_of_birth: form.date_of_birth || undefined,
        checkin_at:    checkinAt,
      });
      if (result.ok) {
        onSuccess();
      } else {
        setError(result.error ?? 'Error al registrar la entrada');
      }
    });
  };

  const fmtCheckIn = new Date(checkIn + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '9px',
    border: '1px solid #ddd', fontSize: '0.88rem', outline: 'none',
    boxSizing: 'border-box', background: '#fafaf8', fontFamily: 'system-ui, sans-serif',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    color: 'rgba(4,4,4,0.5)', letterSpacing: '0.09em',
    textTransform: 'uppercase', marginBottom: '5px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#040404', padding: '22px 24px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#856d47', marginBottom: '4px' }}>
            Registro de entrada
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
            {guestName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
            {folio} · Check-in: {fmtCheckIn}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>

          {/* Identificación */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#856d47', marginBottom: '14px' }}>
              Identificación oficial
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo de documento</label>
                <select value={form.id_type} onChange={e => set('id_type', e.target.value)} style={inputStyle}>
                  {ID_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Número del documento</label>
                <input
                  required
                  value={form.id_number}
                  onChange={e => set('id_number', e.target.value.toUpperCase())}
                  placeholder="LOAM850812HDFPNN09"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nacionalidad</label>
                <input
                  required
                  value={form.nationality}
                  onChange={e => set('nationality', e.target.value)}
                  placeholder="Mexicana"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha de nacimiento <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  max={todayIso()}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Hora de entrada */}
          <div style={{
            background: '#f5f3ef', borderRadius: '10px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...labelStyle, color: '#856d47' }}>Hora real de entrada</label>
              <input
                type="time"
                value={form.checkin_time}
                onChange={e => set('checkin_time', e.target.value)}
                style={{ ...inputStyle, background: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b6b6b', lineHeight: 1.5, maxWidth: '180px' }}>
              Se registra el timestamp exacto de llegada. Útil para cargos de early check-in.
            </div>
          </div>

          {/* Aviso legal */}
          <div style={{
            background: '#fff8e1', border: '1px solid #f0d070', borderRadius: '8px',
            padding: '10px 14px', fontSize: '0.73rem', color: '#856d47', lineHeight: 1.5,
            marginBottom: '20px',
          }}>
            Los datos de identificación se almacenan de forma segura y se usan exclusivamente para el registro interno del hotel. No se comparten con terceros.
          </div>

          {error && (
            <div style={{ background: '#ffebee', border: '1px solid #c6282830', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#c62828', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                flex: 1, padding: '12px 0', borderRadius: '9px', border: 'none',
                background: isPending ? '#ccc' : '#040404', color: '#fff',
                fontSize: '0.88rem', fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Registrando…' : '✓ Confirmar entrada'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '12px 18px', borderRadius: '9px',
                border: '1px solid #e0dbd4', background: '#fff',
                color: '#6b6b6b', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
