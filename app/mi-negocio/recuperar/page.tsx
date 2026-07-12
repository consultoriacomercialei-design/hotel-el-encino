'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecuperarPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/negocio/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { setError('Error al enviar. Intenta de nuevo.'); return; }
      setSent(true);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📬</div>
            <h2 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--forest, #0d221e)', marginBottom: '0.75rem' }}>
              Correo enviado
            </h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'rgba(0,0,0,0.55)', lineHeight: 1.6 }}>
              Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(0,0,0,0.35)', marginTop: '0.75rem' }}>
              Revisa también tu carpeta de spam.
            </p>
            <Link href="/mi-negocio/login" style={{ display: 'inline-block', marginTop: '1.5rem', fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--forest, #0d221e)', textDecoration: 'none' }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.3rem' }}>
                Conoce Santiago
              </p>
              <h1 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em' }}>
                Recuperar contraseña
              </h1>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)', marginTop: '0.5rem' }}>
                Te enviaremos un enlace para crear una nueva contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Correo electrónico</label>
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  style={inputStyle} placeholder="tu@correo.com" autoComplete="email" />
              </div>

              {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading || !email} style={{
                fontFamily: 'var(--sans)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#fff', border: 'none', padding: '13px',
                background: loading || !email ? 'rgba(13,34,30,0.3)' : 'var(--forest, #0d221e)',
                borderRadius: '980px', cursor: loading || !email ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link href="/mi-negocio/login" style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
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
