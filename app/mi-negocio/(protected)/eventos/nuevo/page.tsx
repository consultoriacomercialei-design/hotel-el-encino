'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressToWebP } from '@/app/lib/compress';
import { hostJson } from '../../hospedajes/host';
import { C, card, eyebrow, h1, h2, muted, Button, Field, TextInput, TextArea, Select, Banner, BackLink } from '../../hospedajes/ui';
import { EVENT_CATEGORIES, localToISO, uploadEventCover } from '../events';
import TicketTypesEditor, { emptyType, toTicketTypeInputs, type TicketTypeUI } from './TicketTypesEditor';

export default function NuevoEventoPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState('');
  const [feeMode, setFeeMode] = useState<'absorb' | 'pass'>('absorb');
  const [types, setTypes] = useState<TicketTypeUI[]>([emptyType()]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const blob = await compressToWebP(file).catch(() => file);
      const f = blob instanceof File ? blob : new File([blob], 'cover.webp', { type: 'image/webp' });
      setCover(await uploadEventCover(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la portada.');
    } finally {
      setUploading(false);
    }
  }

  function validate(): string | null {
    if (name.trim().length < 2) return 'Escribe el nombre del evento.';
    if (venueName.trim().length < 2) return 'Escribe el lugar (venue).';
    if (!startsLocal || !endsLocal) return 'Define inicio y fin.';
    if (localToISO(endsLocal) <= localToISO(startsLocal)) return 'El fin debe ser posterior al inicio.';
    for (const [i, t] of types.entries()) {
      if (t.name.trim().length < 1) return `El boleto ${i + 1} necesita nombre.`;
      if (!t.quantity_total || parseInt(t.quantity_total, 10) < 1) return `El boleto ${i + 1} necesita cantidad.`;
      for (const p of t.phases) {
        if (p.trigger_type === 'date' && !p.ends_at_local) return `Una fase de "${t.name || 'boleto'}" necesita fecha límite.`;
        if (p.trigger_type === 'stock' && !p.sold_threshold) return `Una fase de "${t.name || 'boleto'}" necesita el N de vendidos.`;
      }
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
        category: category || undefined,
        venue_name: venueName.trim(),
        venue_address: venueAddress.trim() || undefined,
        starts_at: localToISO(startsLocal),
        ends_at: localToISO(endsLocal),
        cover_image_url: cover || undefined,
        fee_mode: feeMode,
        ticket_types: toTicketTypeInputs(types),
      };
      const res = await hostJson<{ event?: { id: string }; id?: string }>('organizer/events', 'POST', payload);
      const id = res.event?.id ?? res.id;
      router.push(id ? `/mi-negocio/eventos/${id}` : '/mi-negocio/eventos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el evento.');
      setSaving(false);
    }
  }

  return (
    <>
      <BackLink href="/mi-negocio/eventos">Mis eventos</BackLink>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={eyebrow}>Nuevo evento</p>
        <h1 style={h1}>Crea tu evento</h1>
        <p style={muted}>Con boletos que la gente compra en línea, tenga iPhone o no.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <Field label="Nombre del evento"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Concierto en el Encino" /></Field>
        <Field label="Categoría">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Selecciona…</option>
            {EVENT_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Inicio"><TextInput type="datetime-local" value={startsLocal} onChange={(e) => setStartsLocal(e.target.value)} /></Field>
          <Field label="Fin"><TextInput type="datetime-local" value={endsLocal} onChange={(e) => setEndsLocal(e.target.value)} /></Field>
        </div>
        <Field label="Lugar (venue)"><TextInput value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Hotel El Encino" /></Field>
        <Field label="Dirección" hint="Opcional"><TextInput value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} /></Field>
        <Field label="Descripción"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Portada">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 10 }} />
            )}
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Subiendo…' : cover ? 'Cambiar portada' : 'Subir portada'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleCover(e.target.files?.[0])} />
          </div>
        </Field>
        <Field label="Comisión de Santiapp" hint="«Absorber» = tú pagas la comisión. «Trasladar» = se suma al precio del comprador.">
          <Select value={feeMode} onChange={(e) => setFeeMode(e.target.value as 'absorb' | 'pass')}>
            <option value="absorb">Absorber (la pago yo)</option>
            <option value="pass">Trasladar al comprador</option>
          </Select>
        </Field>
      </div>

      <h2 style={{ ...h2, marginBottom: '1rem' }}>Boletos</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <TicketTypesEditor types={types} onChange={setTypes} />
      </div>

      <div style={{ display: 'flex', marginBottom: '2rem' }}>
        <Button onClick={submit} disabled={saving} style={{ marginLeft: 'auto' }}>
          {saving ? 'Creando…' : 'Crear evento'}
        </Button>
      </div>
    </>
  );
}
