'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { compressToWebP } from '@/app/lib/compress';
import dynamic from 'next/dynamic';
import type { LatLng } from '@/app/directorio/MapaLocationPicker';

const MapaLocationPicker = dynamic(
  () => import('@/app/directorio/MapaLocationPicker'),
  { ssr: false, loading: () => <div style={{ height: 280, borderRadius: 14, background: '#f5f4f0', border: '1.5px solid rgba(0,0,0,0.08)' }} /> }
);

const CATEGORIES = [
  ['restaurantes','Restaurantes'], ['cafes','Cafés & Panaderías'], ['bares','Bares & Cantinas'],
  ['gastronomia','Gastronomía'], ['naturaleza','Naturaleza'], ['aventura','Aventura Extrema'],
  ['lago','Lago & Deportes'], ['senderismo','Senderismo & Rutas'], ['cultura','Historia & Cultura'],
  ['iglesias','Iglesias & Capillas'], ['festival','Festivales'], ['tours','Tours & Guías'],
  ['hospedaje','Hospedaje'], ['bienestar','Bienestar & Spa'], ['entretenimiento','Entretenimiento'],
  ['tiendas','Tiendas & Artesanías'], ['floreria','Florería & Arreglos'],
  ['salud','Médicos & Salud'], ['veterinaria','Veterinarias'], ['farmacia','Farmacias'],
  ['belleza','Salones & Estéticas'], ['automotriz','Gasolineras & Mecánicos'],
  ['servicios','Servicios & Delivery'], ['bancos','Bancos & ATMs'],
];

export default function NuevoAnuncioPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [photo,   setPhoto]     = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [coords,  setCoords]    = useState<LatLng | null>(null);
  const [showMap, setShowMap]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', category: '', short_desc: '', long_desc: '',
    address: '', phone: '', whatsapp: '',
    instagram: '', facebook: '', website: '',
    hours: '', price_range: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Pre-fill from outreach invite link
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('outreach_prefill');
      if (!raw) return;
      const p = JSON.parse(raw) as Record<string, string>;
      sessionStorage.removeItem('outreach_prefill'); // consume once
      setForm(f => ({
        ...f,
        name:    p.nombre   || f.name,
        phone:   p.telefono || f.phone,
        website: p.website  || f.website,
        category: p.categoria || f.category,
      }));
      if (p.lat && p.lng) {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        if (!isNaN(lat) && !isNaN(lng)) setCoords({ lat, lng });
      }
    } catch { /* ignore */ }
  }, []);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se aceptan imágenes.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Imagen demasiado grande (máx 15 MB).'); return; }
    setError('');
    setPreview(URL.createObjectURL(file));
    try {
      const blob = await compressToWebP(file);
      setPhoto(new File([blob], 'foto.webp', { type: 'image/webp' }));
    } catch {
      setPhoto(file);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    if (coords && coords.lat !== 0 && coords.lng !== 0) {
      fd.append('lat', String(coords.lat));
      fd.append('lng', String(coords.lng));
    }
    try {
      const res = await fetch('/api/negocio/listings', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear el anuncio'); return; }
      router.push('/mi-negocio?created=1');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrowStyle}>Nuevo anuncio</p>
        <h1 style={h1Style}>Agrega tu negocio</h1>
        <p style={subtitleStyle}>
          Tu anuncio será revisado antes de publicarse. El plan gratuito incluye 1 foto.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>

        {/* Nombre + Categoría */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Nombre del negocio *</label>
            <input required style={inputStyle} value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Tapicería y Alfombras García" maxLength={100} />
          </div>
          <div>
            <label style={labelStyle}>Categoría *</label>
            <select required style={inputStyle} value={form.category}
              onChange={e => set('category', e.target.value)}>
              <option value="">Selecciona...</option>
              {CATEGORIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Foto */}
        <div>
          <label style={labelStyle}>Foto de tu negocio <span style={optStyle}>(opcional · máx 2 MB)</span></label>
          {preview ? (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '6px' }}>
              <Image src={preview} alt="Vista previa" fill sizes="600px" style={{ objectFit: 'cover' }} />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed rgba(0,0,0,0.13)', borderRadius: '12px', padding: '1.75rem', textAlign: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--sans)', fontSize: '0.82rem' }}>
              Toca para subir una foto · JPG, PNG o WebP
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />
          <p style={hintStyle}>La imagen se comprime automáticamente.</p>
        </div>

        {/* Descripción breve */}
        <div>
          <label style={labelStyle}>Descripción breve * <span style={optStyle}>(máx 160 caracteres)</span></label>
          <textarea required maxLength={160} rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
            value={form.short_desc} onChange={e => set('short_desc', e.target.value)}
            placeholder="Limpieza profunda de tapicerías, tapetes y alfombras a domicilio..." />
          <p style={{ ...hintStyle, textAlign: 'right' }}>{form.short_desc.length}/160</p>
        </div>

        {/* Descripción completa */}
        <div>
          <label style={labelStyle}>Descripción completa <span style={optStyle}>(opcional)</span></label>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            value={form.long_desc} onChange={e => set('long_desc', e.target.value)}
            placeholder="Cuéntanos más sobre tu negocio, experiencia y lo que te diferencia..." />
        </div>

        {/* Dirección + Horarios */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Dirección <span style={optStyle}>(opcional)</span></label>
            <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Calle Principal 12, Santiago N.L." />
          </div>
          <div>
            <label style={labelStyle}>Horarios <span style={optStyle}>(opcional)</span></label>
            <input style={inputStyle} value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="Lun–Sáb 9:00–18:00h" />
          </div>
        </div>

        {/* Teléfono + WhatsApp */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Teléfono <span style={optStyle}>(opcional)</span></label>
            <input type="tel" style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+52 81 2381 6588" />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp <span style={optStyle}>(opcional)</span></label>
            <input type="tel" style={inputStyle} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+52 81 2381 6588" />
          </div>
        </div>

        {/* Rango de precios */}
        <div>
          <label style={labelStyle}>Rango de precios <span style={optStyle}>(opcional)</span></label>
          <input style={inputStyle} value={form.price_range} onChange={e => set('price_range', e.target.value)} placeholder="Servicio desde $350 MXN" />
        </div>

        {/* Redes sociales — separador */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '1.2rem' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: '1rem' }}>
            Redes sociales <span style={{ textTransform: 'none', letterSpacing: 0 }}>— opcionales · los botones de enlace aparecen en planes Destacado y Hero</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Instagram <span style={optStyle}>(opcional)</span></label>
              <input style={inputStyle} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="https://www.instagram.com/tunegocio" />
            </div>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Facebook <span style={optStyle}>(opcional)</span></label>
                <input style={inputStyle} value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="https://www.facebook.com/tunegocio" />
              </div>
              <div>
                <label style={labelStyle}>Sitio web <span style={optStyle}>(opcional)</span></label>
                <input style={inputStyle} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://tunegocio.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Ubicación en el mapa */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showMap ? '1rem' : 0, flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', margin: 0 }}>
                Ubicación en el mapa{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0, color: '#aaa' }}>— opcional</span>
              </p>
              {coords && coords.lat !== 0 && (
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: '#2a7a4f', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Pin fijado en el mapa
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowMap(v => !v)}
              style={{
                fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer',
                padding: '8px 16px', borderRadius: '999px',
                border: '1px solid rgba(0,0,0,0.13)',
                background: showMap ? 'var(--forest, #0d221e)' : '#fff',
                color: showMap ? '#fff' : 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
              aria-expanded={showMap}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {showMap ? 'Ocultar mapa' : coords && coords.lat !== 0 ? 'Editar ubicación' : 'Fijar en mapa'}
            </button>
          </div>

          {showMap && (
            <div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Toca en el mapa para colocar el pin de tu negocio. Puedes arrastrarlo para ajustarlo.
                Esto ayuda a los turistas a encontrarte exactamente.
              </p>
              <MapaLocationPicker
                value={coords && coords.lat !== 0 ? coords : null}
                onChange={(loc) => setCoords(loc.lat === 0 ? null : loc)}
                height={300}
                label="Toca para colocar tu negocio"
              />
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#c0392b', background: '#fdf0ed', padding: '10px 14px', borderRadius: '10px', margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Enviando…' : 'Publicar anuncio'}
          </button>
          <Link href="/mi-negocio" style={btnGhost}>Cancelar</Link>
        </div>

        <p style={hintStyle}>
          Al publicar aceptas que el contenido es verídico. Tu anuncio aparecerá en el directorio tras revisión.
        </p>
      </form>
    </>
  );
}

/* ─── Styles ───────────────────────────────────────────── */
const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.4rem',
};
const h1Style: React.CSSProperties = {
  fontFamily: 'var(--serif, Georgia)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em',
};
const subtitleStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(0,0,0,0.42)', marginTop: '0.35rem',
};
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--sans, system-ui)',
  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)', marginBottom: '7px',
};
const optStyle: React.CSSProperties = {
  fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: '#aaa',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  fontFamily: 'var(--sans, system-ui)', fontSize: '0.9rem',
  border: '1px solid rgba(0,0,0,0.13)', borderRadius: '12px',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  color: 'var(--ink, #040404)',
};
const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.68rem',
  color: 'rgba(0,0,0,0.3)', marginTop: '5px',
};
const btnPrimary: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.78rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#fff',
  background: 'var(--forest, #0d221e)', border: 'none',
  padding: '13px 28px', borderRadius: '980px', cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.78rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(0,0,0,0.1)', padding: '13px 20px',
  borderRadius: '980px', textDecoration: 'none', display: 'inline-block',
};
