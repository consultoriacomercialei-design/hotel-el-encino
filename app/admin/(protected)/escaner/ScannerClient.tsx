'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Reservation {
  id: string;
  folio: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  room_label: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_mxn: number;
  status: string;
  checkin_at: string | null;
}
interface PriorCheckin {
  id: string;
  full_name: string;
  id_doc_type: string;
  id_doc_number: string | null;
  checked_in_at: string;
}

const GREEN = '#283820';
const GOLD = '#856d47';

const DOC_LABELS: Record<string, string> = {
  ine: 'INE',
  pasaporte: 'Pasaporte',
  licencia: 'Licencia',
  otro: 'Otro',
};

function extractCode(raw: string): string {
  const m = raw.match(/\/wallet\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : raw.trim();
}

export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<{ detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null>(null);
  const scanningRef = useRef(false);
  const busyRef = useRef(false);

  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState('');
  const [folioInput, setFolioInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [priorCheckins, setPriorCheckins] = useState<PriorCheckin[]>([]);

  // Formulario de check-in
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('Mexicana');
  const [docType, setDocType] = useState('ine');
  const [docNumber, setDocNumber] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  }, []);

  const resolve = useCallback(
    async (payload: { code?: string; folio?: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/checkin/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'No se encontró la reservación.');
          busyRef.current = false;
          return;
        }
        stopCamera();
        setReservation(data.reservation);
        setPriorCheckins(data.checkins || []);
        setFullName(data.reservation.guest_name || '');
        setEmail(data.reservation.guest_email || '');
        setPhone(data.reservation.guest_phone || '');
        setNationality('Mexicana');
        setDocType('ine');
        setDocNumber('');
        setPhoto(null);
        setDone(null);
      } catch {
        setError('Error de red.');
      } finally {
        setLoading(false);
        busyRef.current = false;
      }
    },
    [stopCamera]
  );

  const loop = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes && codes.length && !busyRef.current) {
        resolve({ code: extractCode(codes[0].rawValue) });
        return;
      }
    } catch {
      /* frame no listo */
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [resolve]);

  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      if (!detectorRef.current) {
        const mod = await import('barcode-detector/ponyfill');
        detectorRef.current = new mod.BarcodeDetector({ formats: ['qr_code'] });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      setCamActive(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      setCamError('No se pudo abrir la cámara. Usa el folio manual abajo.');
      setCamActive(false);
    }
  }, [loop]);

  // Re-adquirir cámara si iOS suelta el stream al volver a la app.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && scanningRef.current && !streamRef.current) {
        startCamera();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  async function submitCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation || saving) return;
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.set('reservation_id', reservation.id);
      fd.set('full_name', fullName.trim());
      fd.set('email', email.trim());
      fd.set('phone', phone.trim());
      fd.set('nationality', nationality.trim());
      fd.set('id_doc_type', docType);
      fd.set('id_doc_number', docNumber.trim());
      if (photo) fd.set('photo', photo);
      const res = await fetch('/api/admin/checkin', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'No se pudo registrar.');
        return;
      }
      setDone(fullName.trim());
      setPriorCheckins((p) => [
        ...p,
        { id: crypto.randomUUID(), full_name: fullName.trim(), id_doc_type: docType, id_doc_number: docNumber.trim() || null, checked_in_at: new Date().toISOString() },
      ]);
      // Limpia para el siguiente acompañante.
      setFullName('');
      setEmail('');
      setPhone('');
      setDocNumber('');
      setPhoto(null);
    } catch {
      setError('Error de red al registrar.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setReservation(null);
    setPriorCheckins([]);
    setDone(null);
    setError('');
    setFolioInput('');
  }

  const label = (t: string) => DOC_LABELS[t] || t;
  const btn: React.CSSProperties = { padding: '12px 18px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' };
  const field: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 9, border: '1px solid #d8d2c8', fontSize: '1rem', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', color: GREEN, margin: '4px 0 4px' }}>Check-in por escáner</h1>
      <p style={{ color: '#6b6b6b', fontSize: '0.88rem', margin: '0 0 18px' }}>
        Escanea el pase del huésped o busca por folio. Registra su nombre e identificación.
      </p>

      {!reservation && (
        <>
          <div style={{ position: 'relative', background: '#000', borderRadius: 14, overflow: 'hidden', aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: camActive ? 'block' : 'none' }} />
            {camActive && (
              <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 3px rgba(212,175,55,0.7)', borderRadius: 14, pointerEvents: 'none' }} />
            )}
            {!camActive && (
              <button onClick={startCamera} style={{ ...btn, background: GOLD, color: '#fff' }}>
                📷 Abrir cámara
              </button>
            )}
          </div>
          {camError && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>{camError}</p>}
          {loading && <p style={{ color: GOLD, marginTop: 10 }}>Buscando…</p>}

          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Buscar por folio</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input value={folioInput} onChange={(e) => setFolioInput(e.target.value)} placeholder="RSV-103" style={{ ...field, flex: 1 }} />
              <button onClick={() => folioInput.trim() && resolve({ folio: folioInput })} disabled={loading} style={{ ...btn, background: GREEN, color: '#fff' }}>
                Buscar
              </button>
            </div>
          </div>
          {error && <p style={{ color: '#c0392b', fontSize: '0.9rem', marginTop: 12 }}>{error}</p>}
        </>
      )}

      {reservation && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e8e4de', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontFamily: 'monospace', color: GOLD }}>{reservation.folio}</strong>
              <span style={{ fontSize: '0.78rem', color: reservation.checkin_at ? '#27ae60' : '#999' }}>
                {reservation.checkin_at ? '● Ya con check-in' : 'Sin check-in'}
              </span>
            </div>
            <p style={{ margin: '8px 0 4px', fontSize: '1.05rem', fontWeight: 600 }}>{reservation.guest_name}</p>
            <p style={{ margin: '0 0 2px', color: '#555', fontSize: '0.9rem' }}>{reservation.room_label} · {reservation.nights} noche(s)</p>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>{reservation.check_in} → {reservation.check_out}</p>
            {reservation.status === 'cancelled' && <p style={{ color: '#c0392b', fontWeight: 600, marginTop: 8 }}>⚠️ Reservación cancelada</p>}
          </div>

          {priorCheckins.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.8rem', color: '#6b6b6b', margin: '0 0 6px' }}>Registrados ({priorCheckins.length}):</p>
              {priorCheckins.map((c) => (
                <div key={c.id} style={{ fontSize: '0.86rem', color: '#333', padding: '4px 0', borderBottom: '1px solid #f0ece5' }}>
                  ✓ {c.full_name} · {label(c.id_doc_type)}{c.id_doc_number ? ` ${c.id_doc_number}` : ''}
                </div>
              ))}
            </div>
          )}

          {done ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <p style={{ color: '#166534', fontWeight: 600, margin: '0 0 12px' }}>✓ Check-in registrado: {done}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => setDone(null)} style={{ ...btn, background: GOLD, color: '#fff' }}>+ Otro huésped</button>
                <button onClick={reset} style={{ ...btn, background: '#eee', color: '#333' }}>Escanear otro</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitCheckin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Nombre completo</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required style={field} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Correo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={field} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Teléfono</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="81 1234 5678" style={field} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Nacionalidad</label>
                <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Mexicana" style={field} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: '0 0 40%' }}>
                  <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Documento</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)} style={field}>
                    <option value="ine">INE</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="licencia">Licencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Número</label>
                  <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Clave / No." style={field} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>Foto del documento (opcional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} style={{ ...field, padding: 9 }} />
                {photo && <p style={{ fontSize: '0.78rem', color: '#27ae60', margin: '4px 0 0' }}>✓ {photo.name}</p>}
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: '0.9rem', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{ ...btn, background: GREEN, color: '#fff', flex: 1, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando…' : 'Registrar check-in'}
                </button>
                <button type="button" onClick={reset} style={{ ...btn, background: '#eee', color: '#333' }}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
