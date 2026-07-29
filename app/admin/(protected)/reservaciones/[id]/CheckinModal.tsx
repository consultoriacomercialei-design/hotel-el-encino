'use client';

/**
 * CheckinModal — Registro de entrada y verificación de identidad del huésped.
 * Se abre desde el detalle de la reservación cuando el huésped llega al hotel.
 * Captura: tipo y número de documento, nacionalidad, fecha de nacimiento (opcional)
 * y registra la hora exacta de entrada.
 */

import { useState, useTransition } from 'react';

const ID_TYPES = [
  { value: 'ine',       label: 'INE / IFE (México)' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'licencia',  label: 'Licencia de conducir' },
  { value: 'cedula',    label: 'Cédula profesional' },
  { value: 'residente', label: 'Tarjeta de residente' },
  { value: 'otro',      label: 'Otro documento' },
];

/** Normaliza valores previos ('INE', 'Cédula'…) al slug del selector. */
function normalizeIdType(v?: string): string {
  const slug = (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ID_TYPES.some(t => t.value === slug) ? slug : 'ine';
}

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
  const [photo, setPhoto] = useState<File | null>(null);

  const [form, setForm] = useState({
    id_type:       normalizeIdType(currentIdType),
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
    if (photo && photo.size > 8 * 1024 * 1024) { setError('La foto excede 8 MB.'); return; }
    setError('');

    startTransition(async () => {
      // Mismo endpoint que el escáner de check-in: un solo camino de registro
      // (guest_checkins + espejo en la reserva + foto al bucket privado).
      const fd = new FormData();
      fd.set('reservation_id', reservationId);
      fd.set('full_name', guestName);
      fd.set('id_doc_type', form.id_type);
      fd.set('id_doc_number', form.id_number);
      fd.set('nationality', form.nationality);
      if (form.date_of_birth) fd.set('date_of_birth', form.date_of_birth);
      fd.set('checkin_at', new Date(`${todayIso()}T${form.checkin_time}:00`).toISOString());
      if (photo) fd.set('photo', photo);
      try {
        const res = await fetch('/api/admin/checkin', { method: 'POST', body: fd });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          onSuccess();
        } else {
          setError(data.error ?? 'Error al registrar la entrada');
        }
      } catch {
        setError('Error de conexión. Intenta de nuevo.');
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

          {/* Foto del documento (opcional) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Foto del documento <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
              style={{ ...inputStyle, padding: '8px 10px' }}
            />
            {photo && (
              <div style={{ fontSize: '0.72rem', color: '#6b6b6b', marginTop: '4px' }}>
                {photo.name} · {(photo.size / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
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
