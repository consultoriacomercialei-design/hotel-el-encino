'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface UserCtx {
  loggedIn: boolean;
  id?: string;
  email?: string;
  displayName?: string | null;
  avatarEmoji?: string;
  isAdvertiser?: boolean;
  advertiserSlug?: string | null;
}

interface FavListing {
  listing_slug: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userCtx: UserCtx;
  onLogout: () => void;
}

type Panel = 'home' | 'favorites' | 'profile';

function fmt(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
}

export default function UserDashboard({ open, onClose, userCtx, onLogout }: Props) {
  const [panel, setPanel]         = useState<Panel>('home');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [profileEdit, setProfileEdit] = useState({ name: userCtx.displayName ?? '', emoji: userCtx.avatarEmoji ?? '🎮' });
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');

  useEffect(() => {
    if (!open) return;
    // Load favorites
    fetch('/api/user/favorites').then(r => r.json()).then(d => setFavorites(d.favorites ?? [])).catch(() => {});
    // Load best score
    fetch('/api/games/scores?game=crucigrama-jun-2026').then(r => r.json()).then(d => setBestScore(d.myBest)).catch(() => {});
  }, [open]);

  async function handleLogout() {
    await fetch('/api/user/auth', { method: 'DELETE' });
    onLogout();
    onClose();
  }

  async function saveProfile() {
    setSaving(true); setSaveMsg('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: profileEdit.name, avatarEmoji: profileEdit.emoji }),
      });
      if (res.ok) { setSaveMsg('¡Guardado!'); }
      else { const d = await res.json(); setSaveMsg(d.error ?? 'Error'); }
    } catch { setSaveMsg('Error de conexión'); }
    finally { setSaving(false); }
  }

  async function removeFavorite(slug: string) {
    await fetch(`/api/user/favorites?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setFavorites(f => f.filter(s => s !== slug));
  }

  const EMOJIS = ['🎮','🏔️','🌊','🌳','🦋','🌺','🎯','🏕️','🌅','⛰️','🌿','🦜'];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />
          <motion.div
            key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9101,
              width: 'min(380px, 100vw)', background: '#fff',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ background: 'var(--forest)', padding: '1.5rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.25rem' }}>Mi cuenta</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{userCtx.avatarEmoji ?? '🎮'}</span>
                    <div>
                      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--paper)', lineHeight: 1.2 }}>
                        {userCtx.displayName ?? userCtx.email?.split('@')[0]}
                      </p>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.42)' }}>
                        {userCtx.email}
                      </p>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem' }}>
                <StatPill label="Favoritos" value={String(favorites.length)} />
                {bestScore && <StatPill label="Mejor tiempo" value={fmt(bestScore)} />}
                {userCtx.isAdvertiser && <StatPill label="Anunciante" value="✓" highlight />}
              </div>
            </div>

            {/* Nav tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {([['home', '🏠 Inicio'], ['favorites', '❤️ Favoritos'], ['profile', '✏️ Perfil']] as const).map(([p, label]) => (
                <button key={p} onClick={() => setPanel(p)} style={{
                  flex: 1, padding: '0.75rem 0.5rem',
                  fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: panel === p ? 'var(--forest)' : 'var(--muted)',
                  borderBottom: panel === p ? '2px solid var(--forest)' : '2px solid transparent',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>

              {/* HOME */}
              {panel === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <NavCard icon="🎮" title="Juegos" desc={bestScore ? `Mejor tiempo: ${fmt(bestScore)}` : 'Juega el crucigrama de Santiago'} onClick={() => { onClose(); document.getElementById('juegos')?.scrollIntoView({ behavior: 'smooth' }); }} />
                  <NavCard icon="❤️" title="Mis favoritos" desc={favorites.length ? `${favorites.length} negocio${favorites.length !== 1 ? 's' : ''} guardado${favorites.length !== 1 ? 's' : ''}` : 'Aún no tienes favoritos'} onClick={() => setPanel('favorites')} />
                  {userCtx.isAdvertiser && (
                    <a href="/mi-negocio" style={{ textDecoration: 'none' }}>
                      <div style={{ ...navCardBase, background: 'rgba(133,109,71,0.06)', border: '1px solid rgba(133,109,71,0.22)' }}>
                        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>📊</span>
                        <div>
                          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--forest)' }}>Portal de anunciantes</p>
                          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'var(--muted)' }}>Ver estadísticas de tu negocio</p>
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'var(--warm)', fontSize: '0.8rem' }}>→</span>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {/* FAVORITES */}
              {panel === 'favorites' && (
                <div>
                  {favorites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</p>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--muted)' }}>Aún no tienes favoritos.</p>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Toca el corazón en cualquier negocio para guardarlo aquí.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {favorites.map(slug => (
                        <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                          <Link href={`/directorio/actividades/${slug}`} onClick={onClose} style={{ flex: 1, textDecoration: 'none' }}>
                            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 500, color: 'var(--ink)' }}>
                              {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          </Link>
                          <button
                            onClick={() => removeFavorite(slug)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(220,50,50,0.7)', fontSize: '1rem', flexShrink: 0, padding: '4px' }}
                            title="Quitar de favoritos"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PROFILE EDIT */}
              {panel === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={labelSt}>Nombre en juegos</label>
                    <input
                      type="text" maxLength={30} value={profileEdit.name}
                      onChange={e => setProfileEdit(p => ({ ...p, name: e.target.value }))}
                      style={inputSt}
                    />
                  </div>
                  <div>
                    <label style={labelSt}>Avatar</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {EMOJIS.map(em => (
                        <button key={em} type="button" onClick={() => setProfileEdit(p => ({ ...p, emoji: em }))}
                          style={{
                            width: '36px', height: '36px', fontSize: '1.25rem', borderRadius: '8px',
                            background: profileEdit.emoji === em ? 'rgba(13,34,30,0.10)' : 'transparent',
                            border: profileEdit.emoji === em ? '2px solid var(--forest)' : '1.5px solid var(--border)',
                            cursor: 'pointer',
                          }}>{em}</button>
                      ))}
                    </div>
                  </div>
                  {saveMsg && <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: saveMsg === '¡Guardado!' ? '#2a7a4f' : '#c0392b' }}>{saveMsg}</p>}
                  <button
                    onClick={saveProfile} disabled={saving}
                    style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: saving ? 'rgba(13,34,30,0.3)' : 'var(--forest)', border: 'none', borderRadius: '999px', padding: '11px 24px', cursor: saving ? 'not-allowed' : 'pointer' }}
                  >{saving ? 'Guardando…' : 'Guardar cambios'}</button>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
                  <button onClick={handleLogout} style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c0392b', background: 'none', border: '1.5px solid rgba(192,57,43,0.25)', borderRadius: '999px', padding: '10px 24px', cursor: 'pointer' }}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(133,109,71,0.20)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${highlight ? 'rgba(133,109,71,0.40)' : 'rgba(255,255,255,0.15)'}`,
      borderRadius: 'var(--radius-pill)', padding: '5px 12px',
    }}>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', fontWeight: 600, color: highlight ? 'var(--warm)' : 'var(--paper)' }}>{value}</p>
    </div>
  );
}

function NavCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...navCardBase, cursor: 'pointer', textAlign: 'left', width: '100%' } as React.CSSProperties}>
      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
      <div>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)' }}>{title}</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'var(--muted)' }}>{desc}</p>
      </div>
      <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.8rem' }}>→</span>
    </button>
  );
}

const navCardBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 14px', borderRadius: 'var(--radius-md)',
  background: 'var(--paper)', border: '1px solid var(--border)',
  transition: 'box-shadow 0.2s', textDecoration: 'none',
};

const labelSt: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--sans)', fontSize: '0.68rem',
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px',
};
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  fontFamily: 'var(--sans)', fontSize: '0.88rem', color: 'var(--ink)',
  border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--paper)', outline: 'none',
};
