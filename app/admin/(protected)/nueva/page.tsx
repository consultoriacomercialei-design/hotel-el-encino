'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createReservationAction } from '../actions';
import { quoteRoom, type RoomPrices, type Season } from '@/app/lib/pricing';
import { DEFAULT_PRICES, DEFAULT_SEASONS } from '@/app/lib/hotel-config-defaults';

export default function NuevaReservacionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const [form, setForm] = useState({
    guest_name: '', guest_email: '', guest_phone: '',
    room_type: 'doble', check_in: '', check_out: '',
    adults: '2', children: '0', rooms: '1',
    total_mxn: '', notes: '',
    status: 'confirmed', payment_method: 'pending',
    // Identidad (opcional al crear — se completa en check-in)
    id_type: 'INE', id_number: '', nationality: 'Mexicana',
  });
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState('');

  // Config viva (tarifas + ocupación + temporadas) para estimar igual que el modal
  const [cfg, setCfg] = useState<{ prices: RoomPrices; seasons: Season[] }>({ prices: DEFAULT_PRICES, seasons: DEFAULT_SEASONS });
  useEffect(() => {
    fetch('/api/public/hotel-config')
      .then(r => r.json())
      .then(c => setCfg({ prices: c.prices ?? DEFAULT_PRICES, seasons: c.seasons ?? DEFAULT_SEASONS }))
      .catch(() => {});
  }, []);

  const quote     = quoteRoom({
    checkIn:  form.check_in,
    checkOut: form.check_out,
    adults:   parseInt(form.adults) || 2,
    children: parseInt(form.children) || 0,
    prices:   cfg.prices,
    seasons:  cfg.seasons,
  });
  const nights    = quote.nights;
  const autoTotal = quote.total;
  const totalMxn  = form.total_mxn ? parseFloat(form.total_mxn) : autoTotal;

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guest_name || !form.guest_email || !form.check_in || !form.check_out) {
      setError('Completa todos los campos requeridos.'); return;
    }
    // Guard against double-submit (race condition before isPending kicks in)
    if (submittingRef.current || isPending) return;
    submittingRef.current = true;
    setError('');

    startTransition(async () => {
      try {
        await createReservationAction({
          guest_name:     form.guest_name,
          guest_email:    form.guest_email,
          guest_phone:    form.guest_phone,
          room_type:      form.room_type,
          check_in:       form.check_in,
          check_out:      form.check_out,
          nights,
          adults:         parseInt(form.adults) || 2,
          children:       parseInt(form.children) || 0,
          rooms:          parseInt(form.rooms) || 1,
          total_mxn:      totalMxn,
          notes:          form.notes,
          status:         form.status,
          payment_method: form.payment_method,
          notify,
          id_type:        form.id_number ? form.id_type : undefined,
          id_number:      form.id_number || undefined,
          nationality:    form.id_number ? form.nationality : undefined,
        });
        router.push('/admin/reservaciones');
      } catch (err: unknown) {
        submittingRef.current = false; // allow retry on error
        setError(err instanceof Error ? err.message : 'Error al crear reservación');
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/admin/reservaciones" style={{ color: '#6b6b6b', textDecoration: 'none', fontSize: '0.85rem' }}>← Volver</Link>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#040404' }}>Nueva reservación</h1>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #e8e4de', padding: '28px', maxWidth: '640px',
      }}>
        <section>
          <SectionTitle>Datos del huésped</SectionTitle>
          <div style={{ display: 'grid', gap: '14px' }}>
            <Field label="Nombre completo *">
              <input required value={form.guest_name} onChange={e => set('guest_name', e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Email *">
                <input required type="email" value={form.guest_email} onChange={e => set('guest_email', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Teléfono">
                <input type="tel" value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </div>
        </section>

        <Divider />

        <section>
          <SectionTitle>Reservación</SectionTitle>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px' }}>
              <Field label="Llegada *">
                <input required type="date" value={form.check_in}
                  onChange={e => { set('check_in', e.target.value); if (form.check_out && e.target.value >= form.check_out) set('check_out', ''); }}
                  style={{ ...inputStyle, width: '100%' }} />
              </Field>
              <Field label="Salida *">
                <input required type="date" min={form.check_in || undefined} value={form.check_out}
                  onChange={e => set('check_out', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </Field>
            </div>
            {nights > 0 && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b6b6b' }}>
                {nights} noche{nights !== 1 ? 's' : ''} · Total estimado: <strong>${autoTotal.toLocaleString('es-MX')} MXN</strong>
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Field label="Adultos">
                <input type="number" min="1" max="8" value={form.adults} onChange={e => set('adults', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Niños">
                <input type="number" min="0" max="6" value={form.children} onChange={e => set('children', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Habitaciones">
                <input type="number" min="1" max="2" value={form.rooms} onChange={e => set('rooms', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label={`Total MXN (vacío = $${autoTotal.toLocaleString('es-MX')} auto)`}>
              <input type="number" min="0" value={form.total_mxn}
                onChange={e => set('total_mxn', e.target.value)}
                placeholder={String(autoTotal)} style={inputStyle} />
            </Field>
            <Field label="Notas">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} />
            </Field>
          </div>
        </section>

        <Divider />

        <section>
          <SectionTitle>Identificación del huésped <span style={{ fontSize: '0.68rem', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#aaa' }}>(opcional — se puede completar al llegar)</span></SectionTitle>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Tipo de documento">
                <select value={form.id_type} onChange={e => set('id_type', e.target.value)} style={inputStyle}>
                  <option value="INE">INE / IFE</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Licencia">Licencia de conducir</option>
                  <option value="Cédula">Cédula profesional</option>
                  <option value="Residente">Tarjeta de residente</option>
                  <option value="Otro">Otro</option>
                </select>
              </Field>
              <Field label="Número del documento">
                <input
                  value={form.id_number}
                  onChange={e => set('id_number', e.target.value.toUpperCase())}
                  placeholder="LOAM850812HDFPNN09"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Nacionalidad">
              <input
                value={form.nationality}
                onChange={e => set('nationality', e.target.value)}
                placeholder="Mexicana"
                style={inputStyle}
              />
            </Field>
          </div>
        </section>

        <Divider />

        <section>
          <SectionTitle>Estado y pago</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Estado">
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                <option value="confirmed">Confirmada</option>
                <option value="pending">Pendiente</option>
                <option value="waitlist">Lista de espera</option>
              </select>
            </Field>
            <Field label="Método de pago">
              <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} style={inputStyle}>
                <option value="pending">Pendiente</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="online">En línea (MP)</option>
              </select>
            </Field>
          </div>
        </section>

        <Divider />

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#856d47', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#4a4a4a' }}>
            Notificar al huésped (correo de confirmación + evento en calendario)
          </span>
        </label>
        <p style={{ margin: '6px 0 0 26px', fontSize: '0.75rem', color: '#999' }}>
          Desactiva para registros históricos o reservas ya comunicadas por WhatsApp.
        </p>

        {error && <p style={{ color: '#c0392b', fontSize: '0.82rem', marginTop: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={isPending} style={{
            padding: '12px 28px', borderRadius: '980px', border: 'none',
            background: isPending ? 'rgba(133,109,71,0.4)' : '#856d47',
            color: '#fff', fontSize: '0.85rem', fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}>
            {isPending ? 'Guardando…' : 'Crear reservación'}
          </button>
          <Link href="/admin/reservaciones" style={{
            padding: '12px 20px', borderRadius: '980px',
            border: '1px solid #e8e4de', color: '#4a4a4a',
            textDecoration: 'none', fontSize: '0.85rem',
          }}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#856d47' }}>{children}</p>;
}
function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #e8e4de', margin: '22px 0' }} />;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(15,15,15,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid #ddd', fontSize: '0.88rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', background: '#fafaf8',
};
