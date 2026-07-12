'use client';

import { useState } from 'react';
import { hostJson, type LodgingDetail } from '../host';
import { card, Field, TextInput, TextArea, Select, Button, Banner } from '../ui';
import { PhotoUploader, AmenitiesPicker } from '../widgets';

export default function EditLodging({ lodging, onSaved }: { lodging: LodgingDetail; onSaved: (l: LodgingDetail) => void }) {
  const [name, setName] = useState(lodging.name);
  const [address, setAddress] = useState(lodging.address ?? '');
  const [description, setDescription] = useState(lodging.description ?? '');
  const [amenities, setAmenities] = useState<string[]>(lodging.amenities ?? []);
  const [photos, setPhotos] = useState<string[]>(lodging.photos ?? []);
  const [status, setStatus] = useState(lodging.status);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await hostJson<{ lodging: LodgingDetail }>(`organizer/lodgings/${lodging.id}`, 'PATCH', {
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        amenities,
        photos,
        status,
      });
      onSaved(res.lodging);
      setMsg({ tone: 'success', text: 'Cambios guardados.' });
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <Field label="Nombre">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Dirección">
        <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Descripción">
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Amenidades">
        <AmenitiesPicker value={amenities} onChange={setAmenities} />
      </Field>
      <Field label="Fotos">
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </Field>
      <Field label="Estado" hint="«Oculto» lo retira del directorio sin borrarlo.">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Publicado</option>
          <option value="draft">Borrador</option>
          <option value="hidden">Oculto</option>
        </Select>
      </Field>
      <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
    </div>
  );
}
