'use client';

import { useState } from 'react';
import BookingModal from './BookingModal';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  max_occupancy: number;
  base_price_cents: number;
  currency: string;
  photos: string[];
}

export interface Lodging {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  amenities: string[];
  photos: string[];
  rooms: Room[];
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function HospedajesClient({ lodgings }: { lodgings: Lodging[] }) {
  const [selected, setSelected] = useState<{ room: Room; lodging: Lodging } | null>(null);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#283820' }}>Hospedajes</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Reserva tu estancia en Santiago al instante. Pago seguro con tarjeta.
      </p>

      {lodgings.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Pronto habrá hospedajes disponibles.</p>
      ) : (
        lodgings.map((l) => (
          <section key={l.id} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>{l.name}</h2>
              {l.address && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{l.address}</span>}
            </div>
            {l.description && <p style={{ color: '#4b5563', fontSize: '0.9rem', margin: '0.25rem 0 0.75rem' }}>{l.description}</p>}
            {l.amenities.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {l.amenities.map((a) => (
                  <span key={a} style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 999 }}>{a}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {l.rooms.map((r) => (
                <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {r.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photos[0]} alt={r.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: 140, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Sin foto</div>
                  )}
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Hasta {r.max_occupancy} huéspedes</div>
                    {r.description && <div style={{ color: '#4b5563', fontSize: '0.82rem' }}>{r.description}</div>}
                    <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#283820' }}>{money(r.base_price_cents, r.currency)}<span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.8rem' }}> /noche</span></span>
                      <button onClick={() => setSelected({ room: r, lodging: l })}
                        style={{ padding: '0.4rem 0.9rem', background: '#283820', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {selected && <BookingModal room={selected.room} lodging={selected.lodging} onClose={() => setSelected(null)} />}
    </div>
  );
}
