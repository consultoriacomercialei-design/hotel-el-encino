'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { compressToWebP } from '@/app/lib/compress';
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


function PhotoPositioner({ src, initialValue, onSave, onCancel }: {
  src: string; initialValue: string;
  onSave: (v: string) => void; onCancel: () => void;
}) {
  const parse = (v: string): [number, number, number] => {
    const parts = v.trim().split(/\s+/);
    return [parseFloat(parts[0]) || 50, parseFloat(parts[1]) || 50, parseFloat(parts[2]) || 1];
  };
  const [pos, setPos] = useState<[number, number, number]>(() => parse(initialValue));
  const [dragging, setDragging] = useState(false);
  const isDragging = useRef(false);
  const last = useRef<[number, number]>([0, 0]);

  const start = (cx: number, cy: number) => {
    isDragging.current = true; setDragging(true);
    last.current = [cx, cy];
  };
  const move = (cx: number, cy: number) => {
    if (!isDragging.current) return;
    const dx = cx - last.current[0];
    const dy = cy - last.current[1];
    last.current = [cx, cy];
    // transformOrigin: drag right → origin moves right → se ve la parte derecha de la imagen
    // sensitivity: 60/160 = 0.375% por pixel al zoom=1; se divide entre zoom para movimiento más fino al acercar
    setPos(([px, py, pz]) => [
      Math.max(0, Math.min(100, px - dx * (60 / (pz * 160)))),
      Math.max(0, Math.min(100, py - dy * (60 / (pz * 213)))),
      pz,
    ]);
  };
  const stop = () => { isDragging.current = false; setDragging(false); };

  const zoom = pos[2];
  // posStr usa coordenadas para guardado; las decimales se redondean al guardar
  const posStr = `${Math.round(pos[0])}% ${Math.round(pos[1])}% ${zoom.toFixed(2)}`;

  // Posicionamiento absoluto: left/top% relativo al contenedor, img es zoom*100% de tamaño
  // Esto funciona en tiempo real sin depender de transformOrigin
  const imgLeft = `${(1 - zoom) * pos[0]}%`;
  const imgTop  = `${(1 - zoom) * pos[1]}%`;

  return (
    <div style={{ marginTop: '4px' }}>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(0,0,0,0.38)', marginBottom: '10px', lineHeight: 1.5 }}>
        Sube el zoom y arrastra para reencuadrar.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{ position: 'relative', width: '160px', aspectRatio: '3/4', borderRadius: '14px', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab', border: '2px solid rgba(133,109,71,0.4)', userSelect: 'none', touchAction: 'none' }}
          onMouseDown={e => { e.preventDefault(); start(e.clientX, e.clientY); }}
          onMouseMove={e => move(e.clientX, e.clientY)}
          onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchMove={e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={stop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false}
            style={{ position: 'absolute', width: `${zoom * 100}%`, height: `${zoom * 100}%`, objectFit: 'cover', left: imgLeft, top: imgTop, pointerEvents: 'none', userSelect: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: dragging ? 0 : 1, transition: 'opacity 0.15s' }}>
            <div style={{ background: 'rgba(0,0,0,0.42)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Zoom */}
      <div style={{ marginTop: '12px', padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(0,0,0,0.35)' }}>🔍 Zoom</span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(0,0,0,0.35)' }}>{zoom.toFixed(1)}×</span>
        </div>
        <input type="range" min="0.5" max="3" step="0.05"
          value={zoom}
          onChange={e => setPos(([px, py]) => [px, py, parseFloat(e.target.value)])}
          style={{ width: '100%', accentColor: '#856d47' }} />
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => setPos([50, 50, 0.8])} style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', padding: '6px 12px', borderRadius: '999px', border: '1px solid rgba(176,57,42,0.25)', background: 'transparent', color: '#b0392a', cursor: 'pointer' }}>
          ↺ Reset
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onCancel} style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', padding: '8px 18px', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#888', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={() => onSave(posStr)} style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', padding: '8px 22px', borderRadius: '999px', border: 'none', background: '#856d47', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            ✓ Guardar encuadre
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditAnuncioPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);
  const [photos,    setPhotos]    = useState<string[]>([]);   // saved photo URLs
  const [newPhotos, setNewPhotos] = useState<File[]>([]);     // pending new uploads
  const [tier,      setTier]      = useState<string>('free');
  const [coords,      setCoords]      = useState<LatLng | null>(null);
  const [showMap,     setShowMap]     = useState(false);
  const [imgFocus,    setImgFocus]    = useState<string>('');
  const [showFocalPicker, setShowFocalPicker] = useState(false);
  const [coordSaving, setCoordSaving] = useState(false);
  const [coordSaved,  setCoordSaved]  = useState(false);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: '', category: '', short_desc: '', long_desc: '',
    address: '', phone: '', whatsapp: '', instagram: '', facebook: '', website: '',
    hours: '', price_range: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/negocio/listings')
      .then(r => r.json())
      .then((listings: Array<Record<string, string | number | null>>) => {
        const l = listings.find(x => x.id === id);
        if (!l) { router.push('/mi-negocio'); return; }
        setForm({
          name: (l.name as string) ?? '', category: (l.category as string) ?? '',
          short_desc: (l.short_desc as string) ?? '', long_desc: (l.long_desc as string) ?? '',
          address: (l.address as string) ?? '', phone: (l.phone as string) ?? '',
          whatsapp: (l.whatsapp as string) ?? '',
          instagram: (l.instagram as string) ?? '', facebook: (l.facebook as string) ?? '',
          website: (l.website as string) ?? '',
          hours: (l.hours as string) ?? '', price_range: (l.price_range as string) ?? '',
        });
        setTier((l.tier as string) ?? 'free');
        // Load existing photos
        const rawPhotos = l.photos as string[] | null;
        if (rawPhotos && rawPhotos.length > 0) {
          setPhotos(rawPhotos);
        } else if (l.src) {
          setPhotos([l.src as string]);
        }
        // Restore coords if they exist and are real
        const lat = l.lat as number | null;
        const lng = l.lng as number | null;
        if (lat && lng) setCoords({ lat, lng });
        // Restore focal point
        if (l.img_focus) setImgFocus(l.img_focus as string);
      })
      .finally(() => setFetching(false));
  }, [id, router]);

  // Open map if ?openMap=true and scroll to it
  useEffect(() => {
    if (searchParams.get('openMap') === 'true' && !fetching) {
      setShowMap(true);
      setTimeout(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [searchParams, fetching]);

  const MAX_PHOTOS = 5;

  const handleAddPhotos = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const totalAllowed = MAX_PHOTOS - photos.length - newPhotos.length;
    if (totalAllowed <= 0) { setError(`Máximo ${MAX_PHOTOS} fotos por anuncio.`); return; }
    const toProcess = files.slice(0, totalAllowed);
    setError('');
    const compressed: File[] = [];
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 15 * 1024 * 1024) { setError('Una imagen es demasiado grande (máx 15 MB).'); continue; }
      try {
        const blob = await compressToWebP(file);
        compressed.push(new File([blob], `foto-${Date.now()}.webp`, { type: 'image/webp' }));
      } catch {
        compressed.push(file);
      }
    }
    setNewPhotos(prev => [...prev, ...compressed]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [photos.length, newPhotos.length]);

  // Auto-save coords the moment the user places a pin — no submit required
  const autoSaveCoords = useCallback(async (lat: number, lng: number) => {
    setCoordSaving(true);
    setCoordSaved(false);
    try {
      const fd = new FormData();
      fd.append('lat', String(lat));
      fd.append('lng', String(lng));
      const res = await fetch(`/api/negocio/listings/${id}`, { method: 'PATCH', body: fd });
      if (res.ok) { setCoordSaved(true); setTimeout(() => setCoordSaved(false), 4000); }
    } catch { /* ignore — user can still save via main button */ }
    finally { setCoordSaving(false); }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSaved(false);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    // Multi-photo: only send photos_keep if there are photos or new uploads
    // (avoids accidentally clearing src when photos state hasn't loaded yet)
    if (photos.length > 0 || newPhotos.length > 0) {
      fd.append('photos_keep', JSON.stringify(photos));
      newPhotos.forEach((f, i) => fd.append(`new_photo_${i}`, f));
    }
    if (coords && coords.lat !== 0 && coords.lng !== 0) {
      fd.append('lat', String(coords.lat));
      fd.append('lng', String(coords.lng));
    }
    fd.append('img_focus', imgFocus);
    try {
      const res = await fetch(`/api/negocio/listings/${id}`, { method: 'PATCH', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      // Verify lat/lng were saved if coords were sent
      if (coords && (!data.lat || !data.lng)) {
        console.warn('[save] coords sent but not returned by API', { coords, data });
      }
      setSaved(true);
      setNewPhotos([]);
      // Hard navigation so the dashboard re-renders with fresh data (bypasses Router Cache)
      setTimeout(() => { window.location.href = '/mi-negocio'; }, 1200);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--sans)', color: 'rgba(0,0,0,0.35)' }}>
      Cargando…
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <a href="/mi-negocio" style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)', textDecoration: 'none', letterSpacing: '0.06em' }}>
          ← Volver
        </a>
        <p style={eyebrowStyle}>Mis anuncios</p>
        <h1 style={h1Style}>Editar anuncio</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>

        {/* Nombre + Categoría */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Nombre del negocio *</label>
            <input required style={inputStyle} value={form.name}
              onChange={e => set('name', e.target.value)} maxLength={100} />
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

        {/* ── Galería de fotos ──────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '7px' }}>
            <label style={labelStyle}>
              Fotos de tu negocio <span style={optStyle}>(máx {MAX_PHOTOS})</span>
            </label>
            {tier === 'free' && (photos.length + newPhotos.length) > 1 && (
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.64rem', color: '#856d47', letterSpacing: '0.03em' }}>
                Plan gratuito — solo se muestra la 1ª foto
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {/* Saved photos */}
            {photos.map((url, i) => (
              <div key={url} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1', background: '#f5f4f0' }}>
                <Image src={url} alt={`Foto ${i + 1}`} fill sizes="130px" style={{ objectFit: 'cover', objectPosition: i === 0 ? (imgFocus || '50% 50%') : '50% 50%' }} unoptimized />
                {/* Lock overlay for free tier on extra photos */}
                {tier === 'free' && i > 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,34,30,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔒</span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, padding: '0 6px' }}>Plan Destacado</span>
                  </div>
                )}
                {/* Cover badge + Adjust button */}
                {i === 0 && (
                  <>
                    <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.55)', borderRadius: '4px', padding: '2px 7px', fontFamily: 'var(--sans)', fontSize: '0.55rem', color: '#fff', letterSpacing: '0.06em' }}>
                      PORTADA
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFocalPicker(v => !v)}
                      style={{ position: 'absolute', bottom: '5px', right: '5px', background: showFocalPicker ? 'rgba(133,109,71,0.92)' : 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)', borderRadius: '4px', border: 'none', padding: '2px 7px', fontFamily: 'var(--sans)', fontSize: '0.55rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      {imgFocus ? 'Ajustado ✓' : 'Ajustar'}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}

            {/* Pending new photos (preview before save) */}
            {newPhotos.map((file, i) => {
              const blobUrl = URL.createObjectURL(file);
              const idx = photos.length + i;
              return (
                <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1', background: '#f5f4f0', outline: '2px solid #856d47', outlineOffset: '-2px' }}>
                  <Image src={blobUrl} alt={`Nueva ${i + 1}`} fill sizes="130px" style={{ objectFit: 'cover' }} unoptimized />
                  {tier === 'free' && idx > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,34,30,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔒</span>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, padding: '0 6px' }}>Plan Destacado</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(133,109,71,0.85)', borderRadius: '4px', padding: '2px 7px', fontFamily: 'var(--sans)', fontSize: '0.55rem', color: '#fff' }}>
                    Por subir
                  </div>
                  <button type="button" onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              );
            })}

            {/* Add button */}
            {(photos.length + newPhotos.length) < MAX_PHOTOS && (
              <label style={{ borderRadius: '10px', aspectRatio: '1', border: '2px dashed rgba(0,0,0,0.13)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', gap: '4px', fontFamily: 'var(--sans)', fontSize: '0.72rem' }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>+</span>
                Agregar
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handleAddPhotos} />
              </label>
            )}
          </div>

          <p style={hintStyle}>
            {tier === 'free'
              ? 'Puedes subir hasta 5 fotos — se guardan para cuando actives un plan Destacado o Hero.'
              : 'La primera foto es la portada · imágenes comprimidas automáticamente.'}
          </p>
        </div>

        {/* ── Ajustar encuadre — inline debajo del grid ── */}
        {showFocalPicker && photos.length > 0 && (
          <PhotoPositioner
            src={photos[0]}
            initialValue={imgFocus || '50% 50%'}
            onSave={v => { setImgFocus(v); setShowFocalPicker(false); }}
            onCancel={() => setShowFocalPicker(false)}
          />
        )}

        {/* Descripción breve */}
        <div>
          <label style={labelStyle}>Descripción breve * <span style={optStyle}>(máx 160 caracteres)</span></label>
          <textarea required maxLength={160} rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
            value={form.short_desc} onChange={e => set('short_desc', e.target.value)} />
          <p style={{ ...hintStyle, textAlign: 'right' }}>{form.short_desc.length}/160</p>
        </div>

        {/* Descripción completa */}
        <div>
          <label style={labelStyle}>Descripción completa <span style={optStyle}>(opcional)</span></label>
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            value={form.long_desc} onChange={e => set('long_desc', e.target.value)} />
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
            <input type="tel" style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp <span style={optStyle}>(opcional)</span></label>
            <input type="tel" style={inputStyle} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
        </div>

        {/* Rango de precios */}
        <div>
          <label style={labelStyle}>Rango de precios <span style={optStyle}>(opcional)</span></label>
          <input style={inputStyle} value={form.price_range} onChange={e => set('price_range', e.target.value)} placeholder="Servicio desde $350 MXN" />
        </div>

        {/* Redes sociales */}
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
        <div ref={mapSectionRef} style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showMap ? '1rem' : 0, flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', margin: 0 }}>
                Ubicación en el mapa <span style={{ textTransform: 'none', letterSpacing: 0, color: '#aaa' }}>— opcional</span>
              </p>
              {coords && coords.lat !== 0 && (
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: '#2a7a4f', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Pin fijado
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
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {showMap ? 'Ocultar mapa' : coords && coords.lat !== 0 ? 'Editar ubicación' : 'Fijar en mapa'}
            </button>
          </div>
          {/* Auto-save feedback — visible even when map is collapsed */}
          {(coordSaving || coordSaved) && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '5px', color: coordSaved ? '#2a7a4f' : '#856d47' }}>
              {coordSaving ? (
                <>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Guardando ubicación…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Ubicación guardada automáticamente
                </>
              )}
            </p>
          )}

          {showMap && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(0,0,0,0.4)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Toca en el mapa para colocar tu pin — se guarda automáticamente.
              </p>
              <MapaLocationPicker
                value={coords && coords.lat !== 0 ? coords : null}
                onChange={loc => {
                  const c = loc.lat === 0 ? null : loc;
                  setCoords(c);
                  if (c) autoSaveCoords(c.lat, c.lng);
                }}
                height={300}
                label="Toca para colocar tu negocio"
              />
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {error && (
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#c0392b', background: '#fdf0ed', padding: '10px 14px', borderRadius: '10px', margin: 0 }}>
            {error}
          </p>
        )}
        {saved && (
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#2a7a4f', background: '#edf7f1', padding: '10px 14px', borderRadius: '10px', margin: 0 }}>
            Cambios guardados correctamente.
          </p>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <a href="/mi-negocio" style={btnGhost}>Cancelar</a>
        </div>
      </form>
    </>
  );
}

/* ─── Styles ───────────────────────────────────────────── */
const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.4rem', marginTop: '0.75rem',
};
const h1Style: React.CSSProperties = {
  fontFamily: 'var(--serif, Georgia)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em',
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
