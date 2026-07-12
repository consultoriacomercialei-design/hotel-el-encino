'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLodging, type CreateLodgingInput, type RoomInput, type RateInput } from './actions';

// ── estado local del formulario (precios en pesos, se convierten a centavos al enviar) ──
interface RateForm { name: string; price: string; starts_on: string; ends_on: string; weekdays: number[]; }
interface RoomForm {
  name: string; description: string; maxOccupancy: number; basePrice: string;
  houseRules: string; photos: string[]; calendarId: string; rates: RateForm[];
}

const emptyRoom = (): RoomForm => ({
  name: '', description: '', maxOccupancy: 2, basePrice: '', houseRules: '',
  photos: [], calendarId: '', rates: [],
});

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function toCents(pesos: string): number {
  const n = Number(pesos.replace(/,/g, '.').trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function NuevoHospedajeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [ownerEmail, setOwnerEmail] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [amenities, setAmenities] = useState('');
  const [photos, setPhotos] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [rooms, setRooms] = useState<RoomForm[]>([emptyRoom()]);

  function updateRoom(i: number, patch: Partial<RoomForm>) {
    setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRoom() { setRooms((rs) => [...rs, emptyRoom()]); }
  function removeRoom(i: number) { setRooms((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)); }

  function addRate(ri: number) {
    updateRoom(ri, { rates: [...rooms[ri].rates, { name: '', price: '', starts_on: '', ends_on: '', weekdays: [] }] });
  }
  function updateRate(ri: number, ti: number, patch: Partial<RateForm>) {
    updateRoom(ri, { rates: rooms[ri].rates.map((t, idx) => (idx === ti ? { ...t, ...patch } : t)) });
  }
  function removeRate(ri: number, ti: number) {
    updateRoom(ri, { rates: rooms[ri].rates.filter((_, idx) => idx !== ti) });
  }
  function toggleWeekday(ri: number, ti: number, day: number) {
    const cur = rooms[ri].rates[ti].weekdays;
    updateRate(ri, ti, { weekdays: cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day] });
  }

  function submit() {
    setMsg(null);
    const valid = ownerEmail.trim() && name.trim() && rooms.every((r) => r.name.trim() && toCents(r.basePrice) >= 0 && r.basePrice.trim());
    if (!valid) { setMsg({ ok: false, text: 'Completa email del dueño, nombre y el precio base de cada habitación.' }); return; }

    const payload: CreateLodgingInput = {
      owner_email: ownerEmail.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      amenities: amenities.split(',').map((a) => a.trim()).filter(Boolean),
      photos: photos.split(/[\n,]/).map((p) => p.trim()).filter(Boolean),
      status,
      rooms: rooms.map<RoomInput>((r) => ({
        name: r.name.trim(),
        description: r.description.trim() || undefined,
        max_occupancy: r.maxOccupancy,
        base_price_cents: toCents(r.basePrice),
        house_rules: r.houseRules.trim() || undefined,
        photos: r.photos.filter(Boolean),
        google_calendar_id: r.calendarId.trim() || undefined,
        rates: r.rates
          .filter((t) => t.name.trim() && t.price.trim())
          .map<RateInput>((t) => ({
            name: t.name.trim(),
            price_cents: toCents(t.price),
            starts_on: t.starts_on || undefined,
            ends_on: t.ends_on || undefined,
            weekdays: t.weekdays.length ? t.weekdays : undefined,
            priority: 1,
          })),
      })),
    };

    startTransition(async () => {
      const res = await createLodging(payload);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) setTimeout(() => router.push('/admin/hospedajes'), 900);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <fieldset style={fs}>
        <legend style={lg}>Propiedad</legend>
        <label style={lbl}>Correo del dueño (cuenta Stripe verificada)
          <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} style={inp} placeholder="dueno@correo.com" />
        </label>
        <label style={lbl}>Nombre<input value={name} onChange={(e) => setName(e.target.value)} style={inp} /></label>
        <label style={lbl}>Descripción<textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inp, minHeight: 60 }} /></label>
        <label style={lbl}>Dirección<input value={address} onChange={(e) => setAddress(e.target.value)} style={inp} /></label>
        <label style={lbl}>Amenidades (separadas por coma)<input value={amenities} onChange={(e) => setAmenities(e.target.value)} style={inp} placeholder="Wifi, Alberca, Estacionamiento" /></label>
        <label style={lbl}>Fotos (URLs, una por línea)<textarea value={photos} onChange={(e) => setPhotos(e.target.value)} style={{ ...inp, minHeight: 50 }} placeholder="https://…" /></label>
        <label style={lbl}>Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as 'published' | 'draft')} style={inp}>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
        </label>
      </fieldset>

      {rooms.map((room, ri) => (
        <fieldset key={ri} style={fs}>
          <legend style={lg}>Habitación {ri + 1}
            {rooms.length > 1 && (
              <button onClick={() => removeRoom(ri)} style={delBtn} type="button">Eliminar</button>
            )}
          </legend>
          <label style={lbl}>Nombre<input value={room.name} onChange={(e) => updateRoom(ri, { name: e.target.value })} style={inp} placeholder="Habitación Doble" /></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...lbl, flex: 1 }}>Cupo máx.
              <input type="number" min={1} value={room.maxOccupancy} onChange={(e) => updateRoom(ri, { maxOccupancy: Math.max(1, Number(e.target.value)) })} style={inp} />
            </label>
            <label style={{ ...lbl, flex: 1 }}>Precio base/noche (MXN)
              <input value={room.basePrice} onChange={(e) => updateRoom(ri, { basePrice: e.target.value })} style={inp} placeholder="1200" />
            </label>
          </div>
          <label style={lbl}>Descripción<input value={room.description} onChange={(e) => updateRoom(ri, { description: e.target.value })} style={inp} /></label>
          <label style={lbl}>Reglas de la casa<input value={room.houseRules} onChange={(e) => updateRoom(ri, { houseRules: e.target.value })} style={inp} /></label>
          <label style={lbl}>Fotos (URLs, una por línea)
            <textarea value={room.photos.join('\n')} onChange={(e) => updateRoom(ri, { photos: e.target.value.split('\n').map((p) => p.trim()).filter(Boolean) })} style={{ ...inp, minHeight: 44 }} />
          </label>
          <label style={lbl}>Google Calendar ID (para evitar sobrecupo)
            <input value={room.calendarId} onChange={(e) => updateRoom(ri, { calendarId: e.target.value })} style={inp} placeholder="xxxxx@group.calendar.google.com" />
          </label>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tarifas estacionales (opcional)</div>
            {room.rates.map((rate, ti) => (
              <div key={ti} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={rate.name} onChange={(e) => updateRate(ri, ti, { name: e.target.value })} style={{ ...inp, flex: 2 }} placeholder="Fin de semana / Temporada alta" />
                  <input value={rate.price} onChange={(e) => updateRate(ri, ti, { price: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Precio MXN" />
                  <button onClick={() => removeRate(ri, ti)} style={delBtn} type="button">×</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <label style={{ ...lbl, flex: 1 }}>Desde<input type="date" value={rate.starts_on} onChange={(e) => updateRate(ri, ti, { starts_on: e.target.value })} style={inp} /></label>
                  <label style={{ ...lbl, flex: 1 }}>Hasta<input type="date" value={rate.ends_on} onChange={(e) => updateRate(ri, ti, { ends_on: e.target.value })} style={inp} /></label>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {WEEKDAYS.map((w, d) => (
                    <button key={d} type="button" onClick={() => toggleWeekday(ri, ti, d)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer',
                        border: '1px solid ' + (rate.weekdays.includes(d) ? '#283820' : '#d1d5db'),
                        background: rate.weekdays.includes(d) ? '#283820' : 'white',
                        color: rate.weekdays.includes(d) ? 'white' : '#374151' }}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => addRate(ri)} type="button" style={ghostBtn}>+ Tarifa</button>
          </div>
        </fieldset>
      ))}

      <button onClick={addRoom} type="button" style={ghostBtn}>+ Agregar habitación</button>

      {msg && <p style={{ color: msg.ok ? '#166534' : '#b91c1c', fontSize: '0.9rem' }}>{msg.text}</p>}

      <button onClick={submit} disabled={pending} style={primaryBtn} type="button">
        {pending ? 'Creando…' : 'Crear hospedaje'}
      </button>
    </div>
  );
}

const fs: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 };
const lg: React.CSSProperties = { fontWeight: 700, color: '#283820', padding: '0 6px', display: 'flex', gap: 10, alignItems: 'center' };
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.8rem', color: '#374151', marginTop: 8 };
const inp: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem' };
const primaryBtn: React.CSSProperties = { padding: '0.7rem', background: '#283820', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { padding: '0.45rem 0.8rem', background: 'white', color: '#283820', border: '1px dashed #283820', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'flex-start' };
const delBtn: React.CSSProperties = { padding: '0.15rem 0.5rem', background: 'white', color: '#b91c1c', border: '1px solid #b91c1c', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer' };
