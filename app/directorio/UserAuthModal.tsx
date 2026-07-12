'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // called after successful login/signup
}

type Tab = 'login' | 'signup';

const EMOJIS = ['🎮','🏔️','🌊','🌳','🦋','🌺','🎯','🏕️','🌅','⛰️','🌿','🦜'];

export default function UserAuthModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab]         = useState<Tab>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [emoji, setEmoji]     = useState('🎮');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  function reset() {
    setError(''); setInfo(''); setEmail(''); setPass(''); setName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setInfo('');
    try {
      const body: Record<string, string> = { action: tab, email, password };
      if (tab === 'signup') { body.displayName = name; body.avatarEmoji = emoji; }

      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Error. Intenta de nuevo.'); return; }

      if (data.needsConfirmation) {
        setInfo('Revisa tu correo para confirmar tu cuenta, luego inicia sesión.');
        setTab('login');
        return;
      }
      reset();
      onSuccess();
    } catch { setError('Error de conexión. Intenta de nuevo.'); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Modal wrapper — handles centering */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9001,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
              pointerEvents: 'none',
            }}
          >
          {/* Modal — handles animation only */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            style={{
              width: '100%', maxWidth: '420px',
              background: '#fff', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* Forest header */}
            <div style={{ background: 'var(--forest)', padding: '1.5rem', position: 'relative' }}>
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.35rem' }}>
                Directorio Santiago
              </p>
              <p style={{ fontFamily: 'var(--serif-italic)', fontStyle: 'italic', fontSize: '1.25rem', color: 'rgba(250,250,250,0.92)', lineHeight: 1.2 }}>
                {tab === 'login' ? 'Bienvenido de vuelta' : 'Únete al directorio'}
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {(['login', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); reset(); }}
                  style={{
                    flex: 1, padding: '0.85rem',
                    fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? 'var(--forest)' : 'var(--muted)',
                    borderBottom: tab === t ? '2px solid var(--forest)' : '2px solid transparent',
                    transition: 'all 0.18s',
                  }}
                >
                  {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {tab === 'signup' && (
                <>
                  {/* Display name */}
                  <div>
                    <label style={labelSt}>Nombre para juegos</label>
                    <input
                      type="text" required value={name} onChange={e => setName(e.target.value)}
                      maxLength={30} placeholder="Como quieres aparecer en el ranking"
                      style={inputSt}
                      autoComplete="nickname"
                    />
                    <p style={hintSt}>2-30 caracteres. Este nombre es público en el leaderboard.</p>
                  </div>
                  {/* Emoji picker */}
                  <div>
                    <label style={labelSt}>Tu avatar</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {EMOJIS.map(em => (
                        <button key={em} type="button" onClick={() => setEmoji(em)}
                          style={{
                            width: '36px', height: '36px', fontSize: '1.25rem', borderRadius: '8px',
                            background: emoji === em ? 'rgba(13,34,30,0.10)' : 'transparent',
                            border: emoji === em ? '2px solid var(--forest)' : '1.5px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >{em}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={labelSt}>Correo electrónico</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" style={inputSt} autoComplete="email" />
              </div>

              <div>
                <label style={labelSt}>Contraseña</label>
                <input type="password" required value={password} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputSt} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} minLength={6} />
              </div>

              {error && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: '#c0392b', margin: 0 }}>{error}</p>}
              {info  && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: '#2a7a4f', margin: 0 }}>{info}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  fontFamily: 'var(--sans)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#fff', border: 'none', padding: '13px',
                  background: loading ? 'rgba(13,34,30,0.3)' : 'var(--forest)',
                  borderRadius: '999px', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s', marginTop: '0.25rem',
                }}
              >
                {loading ? 'Cargando…' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>

              {/* Advertiser note */}
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                ¿Tienes un negocio registrado?{' '}
                <a href="/mi-negocio/login" style={{ color: 'var(--warm)', textDecoration: 'none' }}>
                  Entra por el portal de anunciantes →
                </a>
              </p>
            </form>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--sans)', fontSize: '0.68rem',
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px',
};
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 14px',
  fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--ink)',
  border: '1.5px solid var(--border)', borderRadius: '10px',
  background: 'var(--paper)', outline: 'none', transition: 'border 0.18s',
};
const hintSt: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--muted)', marginTop: '4px',
};
