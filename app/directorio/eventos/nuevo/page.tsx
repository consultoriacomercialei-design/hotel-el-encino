'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const CATEGORIES = [
  ['cultural',     'Cultural'],
  ['gastronomico', 'Gastronomía'],
  ['festival',     'Festival'],
  ['religioso',    'Religioso & Tradición'],
  ['aventura',     'Aventura'],
  ['comunidad',    'Comunidad'],
] as const;

async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1200;
      const ratio = Math.min(1, MAX_W / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.naturalWidth  * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas fail')), 'image/webp', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load')); };
    img.src = url;
  });
}

export default function NuevoEventoPage() {
  const [form, setForm] = useState({
    title: '', category: 'cultural', start_date: '', end_date: '',
    time_start: '', location: '', short_desc: '', price: '',
    organizer_name: '', organizer_phone: '',
  });
  const [photo, setPhoto]       = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se aceptan imágenes.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('La imagen original es demasiado grande (máx 10 MB).'); return; }
    setError('');
    setPreview(URL.createObjectURL(file));
    try {
      const compressed = await compressToWebP(file);
      setPhoto(new File([compressed], 'foto.webp', { type: 'image/webp' }));
    } catch {
      setPhoto(file); // fallback: use original
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.end_date && form.end_date < form.start_date) {
      setError('La fecha de fin no puede ser antes que la fecha de inicio.');
      return;
    }
    setLoading(true); setError('');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (!form.end_date) fd.set('end_date', form.start_date);
    if (photo) fd.append('photo', photo);

    try {
      const res = await fetch('/api/guia/eventos', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al publicar.'); return; }
      setSuccess(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--forest, #0d221e)', marginBottom: '0.75rem' }}>
              ¡Evento publicado!
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Tu evento ya aparece en el directorio de Directorio Santiago.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/directorio?tab=eventos" style={btnPrimary}>Ver eventos →</Link>
              <button onClick={() => { setSuccess(false); setForm({ title:'',category:'cultural',start_date:'',end_date:'',time_start:'',location:'',short_desc:'',price:'',organizer_name:'',organizer_phone:'' }); setPhoto(null); setPreview(null); }} style={btnGhost}>
                Publicar otro evento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/directorio" style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm, #856d47)', textDecoration: 'none' }}>
            ← Directorio Santiago
          </Link>
          <h1 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
            Publica tu evento
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)', marginTop: '0.35rem' }}>
            Completamente gratis. Aparece de inmediato en el directorio.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Title + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nombre del evento *</label>
              <input required style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Callejoneada del Centro" maxLength={100} />
            </div>
            <div>
              <label style={labelStyle}>Categoría *</label>
              <select required style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha de inicio *</label>
              <input required type="date" style={inputStyle} value={form.start_date} onChange={e => set('start_date', e.target.value)} min={new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label style={labelStyle}>Fecha de fin <span style={{ fontWeight: 400, color: '#aaa' }}>(opcional)</span></label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.start_date || new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label style={labelStyle}>Hora de inicio <span style={{ fontWeight: 400, color: '#aaa' }}>(opcional)</span></label>
              <input type="time" style={inputStyle} value={form.time_start} onChange={e => set('time_start', e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>Lugar *</label>
            <input required style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Plaza Principal, Santiago, N.L." maxLength={200} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descripción del evento * <span style={{ fontWeight: 400, color: '#aaa' }}>(máx 280 caracteres)</span></label>
            <textarea required rows={3} maxLength={280} style={{ ...inputStyle, resize: 'vertical' }}
              value={form.short_desc} onChange={e => set('short_desc', e.target.value)}
              placeholder="Cuéntanos de qué se trata, para quién es y qué van a disfrutar..." />
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(0,0,0,0.35)', marginTop: '4px', textAlign: 'right' }}>
              {form.short_desc.length}/280
            </p>
          </div>

          {/* Price */}
          <div>
            <label style={labelStyle}>Precio / Costo</label>
            <input style={inputStyle} value={form.price} onChange={e => set('price', e.target.value)} placeholder="Entrada libre  ·  $80 MXN  ·  Donativo voluntario" maxLength={100} />
          </div>

          {/* Organizer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nombre del organizador</label>
              <input style={inputStyle} value={form.organizer_name} onChange={e => set('organizer_name', e.target.value)} placeholder="Tu nombre o el de tu organización" maxLength={100} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono de contacto</label>
              <input type="tel" style={inputStyle} value={form.organizer_phone} onChange={e => set('organizer_phone', e.target.value)} placeholder="+52 81 2381 6588" maxLength={20} />
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label style={labelStyle}>Foto del evento <span style={{ fontWeight: 400, color: '#aaa' }}>(opcional · máx 2 MB)</span></label>
            {preview ? (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '8px' }}>
                <Image src={preview} alt="Preview" fill style={{ objectFit: 'cover' }} sizes="600px" />
                <button type="button" onClick={() => { setPhoto(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                  borderRadius: '50%', width: '28px', height: '28px',
                  cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed rgba(0,0,0,0.12)', borderRadius: '12px',
                  padding: '2rem', textAlign: 'center', cursor: 'pointer',
                  color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--sans)', fontSize: '0.82rem',
                  transition: 'border-color 0.2s',
                }}
              >
                Toca para subir una foto · JPG, PNG o WebP
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(0,0,0,0.32)', marginTop: '5px' }}>
              La imagen se comprime automáticamente antes de subirse.
            </p>
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: '#c0392b', background: '#fdf0ed', padding: '10px 14px', borderRadius: '10px', margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem' }}>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Publicando…' : 'Publicar evento gratis →'}
            </button>
            <Link href="/directorio" style={btnGhost}>Cancelar</Link>
          </div>

          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(0,0,0,0.3)', lineHeight: 1.6 }}>
            Al publicar aceptas que el contenido es apropiado y verídico. El equipo de Hotel El Encino puede ocultar eventos que no cumplan las políticas de uso.
          </p>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: '#f6f4f0',
  padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem)',
  display: 'flex', justifyContent: 'center',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '24px',
  padding: 'clamp(1.75rem, 5vw, 2.75rem)',
  width: '100%', maxWidth: '640px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)',
  height: 'fit-content',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--sans, system-ui)',
  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)', marginBottom: '7px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  fontFamily: 'var(--sans, system-ui)', fontSize: '0.9rem',
  border: '1px solid rgba(0,0,0,0.13)', borderRadius: '12px',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  color: 'var(--ink, #040404)',
};
const btnPrimary: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.78rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#fff',
  background: 'var(--forest, #0d221e)', border: 'none',
  padding: '13px 28px', borderRadius: '980px', cursor: 'pointer',
  textDecoration: 'none', display: 'inline-block',
};
const btnGhost: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.78rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(0,0,0,0.1)', padding: '13px 20px',
  borderRadius: '980px', cursor: 'pointer', textDecoration: 'none',
  display: 'inline-block', background: 'transparent',
};
