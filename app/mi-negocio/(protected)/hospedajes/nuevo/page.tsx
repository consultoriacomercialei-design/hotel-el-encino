'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hostJson, toCents } from '../host';
import { C, card, eyebrow, h1, h2, muted, Button, Field, TextInput, TextArea, Banner, BackLink } from '../ui';
import { PhotoUploader, AmenitiesPicker } from '../widgets';

interface RoomForm {
  name: string;
  base_price: string; // pesos
  max_occupancy: string;
  base_occupancy: string;
  extra_guest_price: string; // pesos
  description: string;
}

const emptyRoom = (): RoomForm => ({
  name: '', base_price: '', max_occupancy: '2', base_occupancy: '2', extra_guest_price: '', description: '',
});

export default function NuevoHospedajePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomForm[]>([emptyRoom()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRoom = (i: number, patch: Partial<RoomForm>) =>
    setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  function validate(): string | null {
    if (name.trim().length < 2) return 'Escribe el nombre del hospedaje.';
    for (const [i, r] of rooms.entries()) {
      if (r.name.trim().length < 1) return `La habitación ${i + 1} necesita un nombre.`;
      if (toCents(r.base_price) <= 0) return `La habitación ${i + 1} necesita un precio por noche.`;
      const max = parseInt(r.max_occupancy, 10);
      const base = parseInt(r.base_occupancy, 10);
      if (!Number.isFinite(max) || max < 1) return `Ocupación máxima inválida en habitación ${i + 1}.`;
      if (Number.isFinite(base) && base > max) return `La ocupación base no puede exceder la máxima (habitación ${i + 1}).`;
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        amenities: amenities.length ? amenities : undefined,
        photos: photos.length ? photos : undefined,
        status: 'published' as const,
        rooms: rooms.map((r) => {
          const max = parseInt(r.max_occupancy, 10) || 1;
          const base = Math.min(parseInt(r.base_occupancy, 10) || max, max);
          const extra = toCents(r.extra_guest_price);
          return {
            name: r.name.trim(),
            description: r.description.trim() || undefined,
            max_occupancy: max,
            base_occupancy: base,
            extra_guest_price_cents: extra > 0 ? extra : undefined,
            base_price_cents: toCents(r.base_price),
          };
        }),
      };
      const res = await hostJson<{ lodging?: { id: string } }>('organizer/lodgings', 'POST', payload);
      const id = res.lodging?.id;
      router.push(id ? `/mi-negocio/hospedajes/${id}` : '/mi-negocio/hospedajes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar.');
      setSaving(false);
    }
  }

  return (
    <>
      <BackLink href="/mi-negocio/hospedajes">Mis hospedajes</BackLink>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={eyebrow}>Nuevo hospedaje</p>
        <h1 style={h1}>Publica tu propiedad</h1>
        <p style={muted}>Datos básicos + al menos una habitación con su precio. Podrás afinar tarifas, inventario y disponibilidad después.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {/* Datos del hospedaje */}
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <Field label="Nombre del hospedaje">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Casa Viento de Luz" />
        </Field>
        <Field label="Dirección" hint="Opcional — ayuda al huésped a ubicarte.">
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Camino a la Cola de Caballo #123" />
        </Field>
        <Field label="Descripción">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cuéntale al huésped qué hace especial tu lugar…" />
        </Field>
        <Field label="Amenidades">
          <AmenitiesPicker value={amenities} onChange={setAmenities} />
        </Field>
        <Field label="Fotos" hint="La primera será la portada.">
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </Field>
      </div>

      {/* Habitaciones */}
      <h2 style={{ ...h2, marginBottom: '1rem' }}>Habitaciones</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
        {rooms.map((r, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink }}>Habitación {i + 1}</span>
              {rooms.length > 1 && (
                <button type="button" onClick={() => setRooms((rs) => rs.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem' }}>Quitar</button>
              )}
            </div>
            <Field label="Nombre">
              <TextInput value={r.name} onChange={(e) => setRoom(i, { name: e.target.value })} placeholder="Habitación doble" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Precio por noche ($)">
                <TextInput inputMode="numeric" value={r.base_price} onChange={(e) => setRoom(i, { base_price: e.target.value })} placeholder="1800" />
              </Field>
              <Field label="Cargo por huésped extra ($)" hint="Opcional">
                <TextInput inputMode="numeric" value={r.extra_guest_price} onChange={(e) => setRoom(i, { extra_guest_price: e.target.value })} placeholder="500" />
              </Field>
              <Field label="Ocupación máxima">
                <TextInput inputMode="numeric" value={r.max_occupancy} onChange={(e) => setRoom(i, { max_occupancy: e.target.value })} />
              </Field>
              <Field label="Incluida en el precio" hint="Huéspedes sin cargo extra">
                <TextInput inputMode="numeric" value={r.base_occupancy} onChange={(e) => setRoom(i, { base_occupancy: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <Button variant="outline" onClick={() => setRooms((rs) => [...rs, emptyRoom()])}>+ Otra habitación</Button>
        <Button onClick={submit} disabled={saving} style={{ marginLeft: 'auto' }}>
          {saving ? 'Publicando…' : 'Publicar hospedaje'}
        </Button>
      </div>
    </>
  );
}
