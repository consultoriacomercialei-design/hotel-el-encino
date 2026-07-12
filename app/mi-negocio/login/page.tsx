'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NegocioLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/negocio/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) { router.push('/mi-negocio'); return; }
      const data = await res.json();
      setError(data.error || 'Credenciales incorrectas');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <a href="/directorio" style={{ display: 'block', textAlign: 'center', marginBottom: '1.75rem', textDecoration: 'none' }}>
          <p style={{ fontFamily: 'var(--sans, system-ui)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm, #856d47)', marginBottom: '0.3rem' }}>
            Directorio Santiago
          </p>
          <h1 style={{ fontFamily: 'var(--serif, Georgia)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--forest, #0d221e)', letterSpacing: '-0.02em' }}>
            Portal de negocios
          </h1>
        </a>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading || !email || !password} style={{
            fontFamily: 'var(--sans)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#fff', border: 'none', padding: '13px',
            background: loading || !email || !password ? 'rgba(13,34,30,0.3)' : 'var(--forest, #0d221e)',
            borderRadius: '980px', cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            marginTop: '0.25rem', transition: 'background 0.2s',
          }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/mi-negocio/recuperar" style={linkStyle}>
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/mi-negocio/registro" style={linkStyle}>
            Crear cuenta →
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
  fontFamily: 'var(--sans, system-ui)', fontSize: '0.75rem',
  color: 'rgba(0,0,0,0.45)', textDecoration: 'none',
};
