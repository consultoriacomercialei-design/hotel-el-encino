'use client';

import { useState } from 'react';
import { hostJson, toCents, toPesos, type RoomDetail, type Rate } from '../host';
import { card, Field, TextInput, TextArea, Select, Button, Banner } from '../ui';
import { PhotoUploader, RatesEditor } from '../widgets';

export default function EditRoom({
  lodgingId, room, rates: initialRates, onSaved,
}: {
  lodgingId: string;
  room: RoomDetail;
  rates: Rate[];
  onSaved: (room: RoomDetail, rates: Rate[]) => void;
}) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? '');
  const [houseRules, setHouseRules] = useState(room.house_rules ?? '');
  const [basePrice, setBasePrice] = useState(toPesos(room.base_price_cents));
  const [maxOcc, setMaxOcc] = useState(String(room.max_occupancy));
  const [baseOcc, setBaseOcc] = useState(String(room.base_occupancy));
  const [extra, setExtra] = useState(room.extra_guest_price_cents ? toPesos(room.extra_guest_price_cents) : '');
  const [totalUnits, setTotalUnits] = useState(String(room.total_units ?? 1));
  const [pricingMode, setPricingMode] = useState<'per_night' | 'per_person'>(room.pricing_mode ?? 'per_night');
  const [maxCapacity, setMaxCapacity] = useState(room.max_capacity != null ? String(room.max_capacity) : '');
  const [calId, setCalId] = useState(room.google_calendar_id ?? '');
  const [status, setStatus] = useState(room.status);
  const [photos, setPhotos] = useState<string[]>(room.photos ?? []);
  const [rates, setRates] = useState<Rate[]>(initialRates);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    const max = parseInt(maxOcc, 10) || 1;
    const base = parseInt(baseOcc, 10) || max;
    if (base > max) { setMsg({ tone: 'error', text: 'La ocupación base no puede exceder la máxima.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        house_rules: houseRules.trim() || null,
        base_price_cents: toCents(basePrice),
        max_occupancy: max,
        base_occupancy: base,
        extra_guest_price_cents: toCents(extra),
        total_units: parseInt(totalUnits, 10) || 1,
        pricing_mode: pricingMode,
        max_capacity: pricingMode === 'per_person' && maxCapacity ? parseInt(maxCapacity, 10) : null,
        google_calendar_id: calId.trim() || null,
        status,
        photos,
        rates: rates
          .filter((r) => r.name.trim() && r.price_cents > 0)
          .map((r) => ({
            name: r.name.trim(), price_cents: r.price_cents,
            starts_on: r.starts_on, ends_on: r.ends_on,
            weekdays: r.weekdays, priority: r.priority,
          })),
      };
      const res = await hostJson<{ room: RoomDetail; rates: Rate[] }>(
        `organizer/lodgings/${lodgingId}/rooms/${room.id}`, 'PATCH', body
      );
      onSaved(res.room, res.rates);
      setMsg({ tone: 'success', text: 'Habitación guardada.' });
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      {/* Básicos */}
      <div style={card}>
        <Field label="Nombre">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Descripción">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Reglas de la casa" hint="Opcional — horarios, mascotas, etc.">
          <TextArea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} />
        </Field>
        <Field label="Fotos">
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </Field>
        <Field label="Estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="published">Publicada</option>
            <option value="draft">Borrador</option>
            <option value="hidden">Oculta</option>
          </Select>
        </Field>
      </div>

      {/* Precio + ocupación + inventario */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Precio base por noche ($)">
            <TextInput inputMode="numeric" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </Field>
          <Field label="Cargo por huésped extra ($)" hint="Por encima de la ocupación incluida">
            <TextInput inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </Field>
          <Field label="Ocupación máxima">
            <TextInput inputMode="numeric" value={maxOcc} onChange={(e) => setMaxOcc(e.target.value)} />
          </Field>
          <Field label="Incluida en el precio">
            <TextInput inputMode="numeric" value={baseOcc} onChange={(e) => setBaseOcc(e.target.value)} />
          </Field>
          <Field label="Unidades disponibles" hint="Cuántas iguales rentas de este tipo">
            <TextInput inputMode="numeric" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} />
          </Field>
          <Field label="Modo de precio">
            <Select value={pricingMode} onChange={(e) => setPricingMode(e.target.value as 'per_night' | 'per_person')}>
              <option value="per_night">Por noche</option>
              <option value="per_person">Por persona</option>
            </Select>
          </Field>
        </div>
        {pricingMode === 'per_person' && (
          <Field label="Aforo máximo (por persona)" hint="Ej. rancho o salón con cupo total">
            <TextInput inputMode="numeric" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
          </Field>
        )}
      </div>

      {/* Tarifas estacionales */}
      <div style={card}>
        <p style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.85rem' }}>Tarifas especiales</p>
        <RatesEditor rates={rates} onChange={setRates} />
      </div>

      {/* Google Calendar */}
      <div style={card}>
        <Field label="Google Calendar ID" hint="Opcional — sincroniza ocupación con un calendario de Google.">
          <TextInput value={calId} onChange={(e) => setCalId(e.target.value)} placeholder="xxxx@group.calendar.google.com" />
        </Field>
      </div>

      <Button onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Guardando…' : 'Guardar habitación'}
      </Button>
    </div>
  );
}
