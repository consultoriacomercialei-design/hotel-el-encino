'use client';

import { useRef, useState } from 'react';
import { compressToWebP } from '@/app/lib/compress';
import { uploadPhoto, toCents, toPesos, WEEKDAY_LABELS, type Rate } from './host';
import { C, Button, TextInput, Badge } from './ui';

/* ─── Subida de fotos (bucket lodging-photos vía proxy) ───────────── */

export function PhotoUploader({
  photos, onChange, max = 12,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    setBusy(true);
    try {
      const slots = max - photos.length;
      const picked = Array.from(files).slice(0, Math.max(0, slots));
      const urls: string[] = [];
      for (const f of picked) {
        const blob = await compressToWebP(f).catch(() => f);
        const file = blob instanceof File ? blob : new File([blob], 'foto.webp', { type: 'image/webp' });
        urls.push(await uploadPhoto(file));
      }
      onChange([...photos, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {photos.map((url) => (
          <div key={url} style={{ position: 'relative', width: 84, height: 70, borderRadius: 10, overflow: 'hidden', background: '#eee' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => onChange(photos.filter((p) => p !== url))}
              style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: '20px', padding: 0 }}
              aria-label="Quitar foto"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{ width: 84, height: 70, borderRadius: 10, border: '1.5px dashed rgba(0,0,0,0.2)', background: '#fafafa', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)' }}
          >
            {busy ? '…' : '+ Foto'}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      {error && <p style={{ fontFamily: C.sans, fontSize: '0.7rem', color: '#b0392a', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

/* ─── Selector de amenidades ─────────────────────────────────────── */

const PRESET_AMENITIES = [
  'WiFi', 'Estacionamiento', 'Aire acondicionado', 'Calefacción', 'TV', 'Cocina',
  'Agua caliente', 'Alberca', 'Jardín', 'Terraza', 'Asador', 'Lavadora',
  'Pet friendly', 'Desayuno', 'Chimenea', 'Vista a la montaña',
];

export function AmenitiesPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const toggle = (a: string) =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  const addCustom = () => {
    const a = custom.trim();
    if (a && !value.includes(a)) onChange([...value, a]);
    setCustom('');
  };
  const options = Array.from(new Set([...PRESET_AMENITIES, ...value]));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
        {options.map((a) => {
          const on = value.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              style={{
                fontFamily: C.sans, fontSize: '0.72rem', padding: '6px 13px', borderRadius: '999px', cursor: 'pointer',
                border: `1px solid ${on ? C.forest : 'rgba(0,0,0,0.14)'}`,
                background: on ? C.forest : '#fff', color: on ? C.paper : 'rgba(0,0,0,0.6)',
              }}
            >
              {on ? '✓ ' : ''}{a}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <TextInput
          value={custom}
          placeholder="Agregar otra…"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          style={{ flex: 1 }}
        />
        <Button variant="outline" onClick={addCustom}>Agregar</Button>
      </div>
    </div>
  );
}

/* ─── Editor de tarifas estacionales ─────────────────────────────── */

export function RatesEditor({ rates, onChange }: { rates: Rate[]; onChange: (next: Rate[]) => void }) {
  const update = (i: number, patch: Partial<Rate>) =>
    onChange(rates.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rates.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...rates, { name: '', price_cents: 0, starts_on: null, ends_on: null, weekdays: null, priority: rates.length + 1 }]);

  const toggleWeekday = (i: number, wd: number) => {
    const cur = rates[i].weekdays ?? [];
    const next = cur.includes(wd) ? cur.filter((d) => d !== wd) : [...cur, wd].sort();
    update(i, { weekdays: next.length ? next : null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {rates.length === 0 && (
        <p style={{ fontFamily: C.sans, fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)' }}>
          Sin tarifas especiales. Se aplica el precio base todos los días.
        </p>
      )}
      {rates.map((r, i) => (
        <div key={i} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <TextInput value={r.name} placeholder="Nombre (ej. Fin de semana)" onChange={(e) => update(i, { name: e.target.value })} style={{ flex: 2 }} />
            <TextInput
              inputMode="numeric"
              value={r.price_cents ? toPesos(r.price_cents) : ''}
              placeholder="Precio $"
              onChange={(e) => update(i, { price_cents: toCents(e.target.value) })}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
            {WEEKDAY_LABELS.map((lbl, wd) => {
              const on = (r.weekdays ?? []).includes(wd);
              return (
                <button
                  key={wd}
                  type="button"
                  onClick={() => toggleWeekday(i, wd)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem', border: `1px solid ${on ? C.forest : 'rgba(0,0,0,0.14)'}`, background: on ? C.forest : '#fff', color: on ? C.paper : 'rgba(0,0,0,0.55)' }}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontFamily: C.sans, fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)' }}>
              Del <input type="date" value={r.starts_on ?? ''} onChange={(e) => update(i, { starts_on: e.target.value || null })} style={{ fontFamily: C.sans, fontSize: '0.75rem', padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)' }} />
            </label>
            <label style={{ fontFamily: C.sans, fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)' }}>
              al <input type="date" value={r.ends_on ?? ''} onChange={(e) => update(i, { ends_on: e.target.value || null })} style={{ fontFamily: C.sans, fontSize: '0.75rem', padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)' }} />
            </label>
            <Badge>{(r.weekdays?.length ?? 0) > 0 ? `${r.weekdays!.length} días` : 'Rango de fechas'}</Badge>
            <button type="button" onClick={() => remove(i)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b0392a', cursor: 'pointer', fontFamily: C.sans, fontSize: '0.72rem' }}>Quitar</button>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={add}>+ Agregar tarifa</Button>
    </div>
  );
}
