'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Isolated component so useSearchParams doesn't block static prerender
function OutreachParamCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref === 'outreach') {
      const prefill = {
        nombre:    searchParams.get('n')   ?? '',
        telefono:  searchParams.get('t')   ?? '',
        lat:       searchParams.get('lat') ?? '',
        lng:       searchParams.get('lng') ?? '',
        website:   searchParams.get('web') ?? '',
        categoria: searchParams.get('cat') ?? '',
      };
      sessionStorage.setItem('outreach_prefill', JSON.stringify(prefill));
    }
  }, [searchParams]);
  return null;
}

export default function NegocioRegistroPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/negocio/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al registrar'); return; }
      if (data.needsConfirmation) { setNeedsConfirmation(true); return; }
      router.push('/mi-negocio');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div style={pageStyle}>
        <Suspense fallback={null}><OutreachParamCapture /></Suspense>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✉️</div>
            <h2 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--forest, #0d221e)', marginBottom: '0.75rem' }}>
              Revisa tu correo
            </h2>
            <p style={{ fontFamily: 'var(--sans, system-ui)', fontSize: '0.85rem', color: 'rgba(0,0,0,0.55)', lineHeight: 1.6 }}>
              Te enviamos un enlace de confirmación a <strong>{email}</strong>. Haz clic en él para activar tu cuenta.
            </p>
            <Link href="/mi-negocio/login" style={{ display: 'inline-block', marginTop: '1.5rem', fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--forest, #0d221e)', textDecoration: 'none', letterSpacing: '0.06em' }}>
              Ir al inicio de sesión →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Suspense fallback={null}><OutreachParamCapture /></Suspense>
      <div style={cardStyle}>
        <a href="/directorio" style={{ display: 'block', textAlign: 'center', marginBottom: '1.75rem', textDecoration: 'none' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.3rem' }}>
            Directorio Santiago
          </p>
          <h1 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em' }}>
            Crear cuenta de negocio
          </h1>
        </a>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} placeholder="tu@correo.com" autoComplete="email" />
          </div>
          <div>
            <label style={labelStyle}>Contraseña <span style={{ fontWeight: 400, color: '#999' }}>(mín. 8 caracteres)</span></label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <div>
            <label style={labelStyle}>Confirmar contraseña</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
              style={inputStyle} placeholder="••••••••" autoComplete="new-password" />
          </div>

          {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading || !email || !password || !confirm} style={{
            fontFamily: 'var(--sans)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#fff', border: 'none', padding: '13px',
            background: loading ? 'rgba(13,34,30,0.3)' : 'var(--forest, #0d221e)',
            borderRadius: '980px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
          }}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link href="/mi-negocio/login" style={linkStyle}>
            ¿Ya tienes cuenta? Inicia sesión →
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f6f4f0', padding: '1.5rem',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '20px', padding: 'clamp(2rem, 5vw, 2.75rem)',
  width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
  border: '1px solid rgba(0,0,0,0.06)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--sans, system-ui)', fontSize: '0.68rem',
  fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'rgba(0,0,0,0.55)', marginBottom: '7px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontFamily: 'var(--sans, system-ui)', fontSize: '0.92rem',
  border: '1px solid rgba(0,0,0,0.13)', borderRadius: '12px',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)', textDecoration: 'none',
};
