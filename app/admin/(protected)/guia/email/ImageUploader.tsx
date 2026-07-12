'use client';

import { useRef, useState } from 'react';

interface ImageUploaderProps {
  onUploaded: (url: string) => void;
  accept?: string;
  label?: string;
  previewSrc?: string;
}

export default function ImageUploader({ onUploaded, accept = 'image/*', label, previewSrc }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { setError('Solo imágenes.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Máximo 8 MB.'); return; }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error al subir');
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }

  return (
    <div>
      {label && <p style={lbl}>{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? '#856d47' : 'rgba(0,0,0,0.15)'}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragging ? 'rgba(133,109,71,0.05)' : 'rgba(0,0,0,0.02)',
          transition: 'all 0.15s',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {previewSrc && (
          <img
            src={previewSrc}
            alt="preview"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.25, borderRadius: '10px',
            }}
          />
        )}
        <span style={{ fontSize: '1.4rem', position: 'relative' }}>🖼️</span>
        <p style={{ fontFamily: 'system-ui', fontSize: '0.75rem', color: '#888', margin: 0, position: 'relative' }}>
          {uploading ? 'Subiendo…' : dragging ? 'Suelta aquí' : 'Arrastra o haz clic para subir'}
        </p>
        {previewSrc && !uploading && (
          <p style={{ fontFamily: 'system-ui', fontSize: '0.62rem', color: '#bbb', margin: 0, position: 'relative' }}>
            Haz clic para reemplazar
          </p>
        )}
      </div>
      {error && (
        <p style={{ fontFamily: 'system-ui', fontSize: '0.72rem', color: '#b0392a', marginTop: '4px' }}>
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
      />
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontFamily: 'system-ui', fontSize: '0.62rem',
  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'rgba(0,0,0,0.4)', marginBottom: '6px',
};
