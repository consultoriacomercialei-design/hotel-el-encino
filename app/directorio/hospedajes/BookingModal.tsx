'use client';

import { useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Room, Lodging } from './HospedajesClient';

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100);
}

interface ReserveResp {
  reservation_id: string;
  client_secret: string;
  publishable_key: string;
  amount_cents: number;
  currency: string;
  nights: number;
}

type Phase = 'form' | 'reserving' | 'paying' | 'confirming' | 'done';

export default function BookingModal({
  room,
  lodging,
  onClose,
}: {
  room: Room;
  lodging: Lodging;
  onClose: () => void;
}) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [avail, setAvail] = useState<{ available: boolean; total_cents: number; nights: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [reserve, setReserve] = useState<ReserveResp | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const datesValid = checkIn && checkOut && checkOut > checkIn;

  async function checkAvailability() {
    setError(null);
    setAvail(null);
    if (!datesValid) { setError('Elige fechas válidas (salida después de entrada).'); return; }
    setChecking(true);
    try {
      const res = await fetch(
        `/api/directorio/hospedajes/availability?room_id=${room.id}&check_in=${checkIn}&check_out=${checkOut}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      const d = json?.data;
      if (!res.ok || !d) { setError(json?.error?.message || json?.error || 'No se pudo verificar.'); return; }
      setAvail({ available: d.available, total_cents: d.total_cents, nights: d.nights });
    } catch {
      setError('No se pudo verificar la disponibilidad.');
    } finally {
      setChecking(false);
    }
  }

  async function startReservation() {
    setError(null);
    if (!guestName.trim()) { setError('Escribe el nombre del huésped.'); return; }
    setPhase('reserving');
    try {
      const res = await fetch(`/api/directorio/hospedajes/reserve?room_id=${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          guests,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 401) { setError('Inicia sesión en el directorio para reservar.'); setPhase('form'); return; }
      const d = json?.data;
      if (!res.ok || !d?.client_secret) { setError(json?.error?.message || 'No se pudo iniciar la reserva.'); setPhase('form'); return; }
      setReserve(d);
      setStripePromise(loadStripe(d.publishable_key));
      setPhase('paying');
    } catch {
      setError('No se pudo iniciar la reserva.');
      setPhase('form');
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#283820' }}>{room.name}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{lodging.name}</p>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Cerrar">×</button>
        </div>

        <p style={{ margin: '0.5rem 0 1rem', fontWeight: 600 }}>
          {money(room.base_price_cents, room.currency)} <span style={{ color: '#6b7280', fontWeight: 400 }}>/ noche (base)</span>
        </p>

        {phase === 'done' ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem' }}>✅</div>
            <h3 style={{ fontWeight: 700, color: '#166534', margin: '0.5rem 0' }}>¡Reserva confirmada!</h3>
            <p style={{ color: '#374151', fontSize: '0.9rem' }}>
              Recibirás los detalles por correo. Recuerda: la reserva es final y no reembolsable en línea.
            </p>
            <button onClick={onClose} style={primaryBtn}>Listo</button>
          </div>
        ) : phase === 'paying' && reserve && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret: reserve.client_secret, locale: 'es' }}>
            <PayForm
              amountLabel={money(reserve.amount_cents, reserve.currency)}
              onPaid={async () => {
                setPhase('confirming');
                try {
                  const res = await fetch(`/api/directorio/hospedajes/confirm?reservation_id=${reserve.reservation_id}`, { method: 'POST' });
                  const json = await res.json();
                  if (!res.ok || !json?.data) { setError(json?.error?.message || 'Pago hecho, pero falló la confirmación. Contacta al hotel.'); return; }
                  setPhase('done');
                } catch {
                  setError('Pago hecho, pero falló la confirmación. Contacta al hotel.');
                }
              }}
              onError={(m) => setError(m)}
            />
          </Elements>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={label}>Entrada
                <input type="date" value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setAvail(null); }} style={input} />
              </label>
              <label style={label}>Salida
                <input type="date" value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setAvail(null); }} style={input} />
              </label>
            </div>
            <label style={label}>Huéspedes
              <input type="number" min={1} max={room.max_occupancy} value={guests}
                onChange={(e) => setGuests(Math.max(1, Math.min(room.max_occupancy, Number(e.target.value))))} style={input} />
            </label>

            <button onClick={checkAvailability} disabled={checking || !datesValid} style={secondaryBtn}>
              {checking ? 'Verificando…' : 'Verificar disponibilidad'}
            </button>

            {avail && (
              <div style={{ margin: '0.75rem 0', padding: '0.75rem', borderRadius: 10, background: avail.available ? '#f0fdf4' : '#fef2f2' }}>
                {avail.available ? (
                  <>
                    <div style={{ fontWeight: 700, color: '#166534' }}>Disponible ✓</div>
                    <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                      {avail.nights} noche(s) · Total <strong>{money(avail.total_cents, room.currency)}</strong>
                    </div>
                  </>
                ) : (
                  <div style={{ fontWeight: 700, color: '#b91c1c' }}>No disponible en esas fechas.</div>
                )}
              </div>
            )}

            {avail?.available && (
              <>
                <label style={label}>Nombre del huésped
                  <input value={guestName} onChange={(e) => setGuestName(e.target.value)} style={input} placeholder="Nombre completo" />
                </label>
                <label style={label}>Correo (opcional)
                  <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} style={input} placeholder="tu@correo.com" />
                </label>
                <p style={{ fontSize: '0.78rem', color: '#b45309', margin: '0.5rem 0' }}>
                  ⚠️ La reserva es final y <strong>no reembolsable en línea</strong>.
                </p>
                <button onClick={startReservation} disabled={phase === 'reserving'} style={primaryBtn}>
                  {phase === 'reserving' ? 'Preparando pago…' : 'Continuar al pago'}
                </button>
              </>
            )}
          </>
        )}

        {error && <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
      </div>
    </div>
  );
}

function PayForm({ amountLabel, onPaid, onError }: { amountLabel: string; onPaid: () => void; onError: (m: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    setBusy(false);
    if (error) { onError(error.message || 'No se pudo procesar el pago.'); return; }
    if (paymentIntent?.status === 'succeeded') onPaid();
    else onError('El pago no se completó.');
  }

  return (
    <div>
      <PaymentElement />
      <button onClick={pay} disabled={!stripe || busy} style={{ ...primaryBtn, marginTop: '1rem' }}>
        {busy ? 'Procesando…' : `Pagar ${amountLabel}`}
      </button>
    </div>
  );
}

// estilos
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 };
const modal: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: '1.6rem', lineHeight: 1, cursor: 'pointer', color: '#6b7280' };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#374151', marginTop: 8 };
const input: React.CSSProperties = { padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem' };
const primaryBtn: React.CSSProperties = { width: '100%', padding: '0.7rem', background: '#283820', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', marginTop: 12 };
const secondaryBtn: React.CSSProperties = { width: '100%', padding: '0.6rem', background: 'white', color: '#283820', border: '1px solid #283820', borderRadius: 10, fontWeight: 600, cursor: 'pointer', marginTop: 12 };
