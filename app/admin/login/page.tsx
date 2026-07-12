'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin/reservaciones');
      } else {
        const data = await res.json();
        setError(data.error || 'Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f3ef',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <form onSubmit={handleLogin} style={{
        background: '#fff',
        border: '1px solid #e8e4de',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.4rem', color: '#040404' }}>
          Panel Admin
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: '0.82rem', color: '#6b6b6b' }}>
          Hotel El Encino
        </p>

        <label style={labelStyle}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••••••"
          autoComplete="current-password"
          style={inputStyle}
          autoFocus
        />

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.8rem', margin: '8px 0 0' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%', padding: '13px',
            marginTop: '20px',
            borderRadius: '980px', border: 'none',
            background: loading || !password ? 'rgba(133,109,71,0.3)' : '#856d47',
            color: '#fff',
            fontSize: '0.85rem', fontWeight: 600,
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(15,15,15,0.65)',
  marginBottom: '7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #ddd',
  fontSize: '0.92rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};
