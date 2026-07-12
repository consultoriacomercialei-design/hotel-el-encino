'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import GameLeaderboard from './GameLeaderboard';

const CrosswordGame = dynamic(() => import('./CrosswordGame'), { ssr: false });
const WordSearchGame = dynamic(() => import('./WordSearchGame'), { ssr: false });
const SudokuGame    = dynamic(() => import('./SudokuGame'),    { ssr: false });
const AnagramGame   = dynamic(() => import('./AnagramGame'),   { ssr: false });

const PROMPT_AFTER = 4;
const TOKEN_AFTER  = 1;

interface UserCtx { loggedIn: boolean; displayName?: string | null; avatarEmoji?: string; }
interface Props { userCtx: UserCtx; onNeedAuth: () => void; onEngaged: () => void; }
type GameId = 'crucigrama' | 'sopa' | 'sudoku' | 'anagrama';

const GAMES = [
  { id: 'crucigrama' as GameId, slug: 'crucigrama-jun-2026', title: 'Crucigrama',     subtitle: 'Historia y datos de Santiago',  icon: '📰' },
  { id: 'sopa'       as GameId, slug: 'sopa-jun-2026',       title: 'Sopa de Letras', subtitle: 'Lugares y naturaleza',          icon: '🔍' },
  { id: 'sudoku'     as GameId, slug: 'sudoku-jun-2026',     title: 'Sudoku',         subtitle: 'Clásico 9×9',                   icon: '🔢' },
  { id: 'anagrama'   as GameId, slug: 'anagrama-jun-2026',   title: 'Anagrama',       subtitle: 'Palabras de la región',         icon: '🔤' },
];

interface GS {
  sessionToken: string | null;
  finalScore: number | null;
  done: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  leaderRefresh: number;
  showPrompt: boolean;
  promptDismissed: boolean;
  engaged: boolean;
  tokenFetched: boolean;
  gameKey: number;
}

const fresh = (): GS => ({
  sessionToken: null, finalScore: null, done: false,
  saveStatus: 'idle', leaderRefresh: 0,
  showPrompt: false, promptDismissed: false,
  engaged: false, tokenFetched: false, gameKey: 0,
});

function fmt(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
}

export default function MiniGamesSection({ userCtx, onNeedAuth, onEngaged }: Props) {
  const [activeIdx, setActiveIdx]       = useState(0);
  const [showLeaderboard, setShowLB]    = useState(false);
  const [states, setStates]             = useState<Record<GameId, GS>>(() => ({
    crucigrama: fresh(), sopa: fresh(), sudoku: fresh(), anagrama: fresh(),
  }));

  const patch = useCallback((id: GameId, p: Partial<GS>) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }, []);

  function goTo(idx: number) {
    if (idx === activeIdx) return;
    setActiveIdx(idx);
    setShowLB(false);
  }

  const game = GAMES[activeIdx];
  const gs   = states[game.id];

  async function fetchToken(id: GameId, slug: string) {
    if (states[id].tokenFetched || !userCtx.loggedIn) return;
    patch(id, { tokenFetched: true });
    try {
      const r = await fetch('/api/games/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameSlug: slug }) });
      if (r.ok) patch(id, { sessionToken: (await r.json()).sessionToken });
    } catch { /* silent */ }
  }

  function handleProgress(id: GameId, slug: string, n: number) {
    const s = states[id];
    if (n >= TOKEN_AFTER)  fetchToken(id, slug);
    if (n >= 1 && !s.engaged) { patch(id, { engaged: true }); onEngaged(); }
    if (n >= PROMPT_AFTER && !userCtx.loggedIn && !s.promptDismissed && !s.done)
      patch(id, { showPrompt: true });
  }

  async function handleComplete(id: GameId, slug: string, seconds: number) {
    const s = states[id];
    patch(id, { finalScore: seconds, done: true, showPrompt: false });
    if (!s.sessionToken) return;
    patch(id, { saveStatus: 'saving' });
    try {
      const r = await fetch('/api/games/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameSlug: slug, scoreSeconds: seconds, sessionToken: s.sessionToken }) });
      if (r.ok) patch(id, { saveStatus: 'saved', leaderRefresh: s.leaderRefresh + 1 });
      else patch(id, { saveStatus: 'error' });
    } catch { patch(id, { saveStatus: 'error' }); }
  }

  function reset(id: GameId) {
    setStates(prev => ({ ...prev, [id]: { ...fresh(), gameKey: prev[id].gameKey + 1 } }));
  }

  function renderGame(id: GameId) {
    const g = GAMES.find(g => g.id === id)!;
    const s = states[id];
    const props = {
      key: s.gameKey,
      onComplete: (sec: number) => handleComplete(id, g.slug, sec),
      onProgress: (n: number)   => handleProgress(id, g.slug, n),
      disabled: s.done,
    };
    switch (id) {
      case 'crucigrama': return <CrosswordGame {...props} />;
      case 'sopa':       return <WordSearchGame {...props} />;
      case 'sudoku':     return <SudokuGame {...props} />;
      case 'anagrama':   return <AnagramGame {...props} />;
    }
  }

  return (
    <div id="juegos" style={{ width: '100%' }}>
      <div style={{ background: 'linear-gradient(180deg, #0b1e1a 0%, #07120f 100%)', padding: 'clamp(2rem, 4.5vw, 3.5rem) clamp(1.25rem, 5vw, 5rem) clamp(2rem, 4vw, 3rem)', position: 'relative' }}>

        {/* Ambient glow */}
        <div aria-hidden style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '50%', pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 0%, rgba(133,109,71,0.13) 0%, transparent 65%)' }} />

        <div style={{ maxWidth: '920px', margin: '0 auto', position: 'relative' }}>

          {/* ── Section header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
            <div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--warm)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'rgba(168,130,84,0.65)' }} />
                Juegos · Santiago, N.L.
              </p>
              <p style={{ fontFamily: 'var(--serif-italic)', fontStyle: 'italic', fontSize: 'clamp(1.15rem, 2.8vw, 1.55rem)', color: 'rgba(250,248,242,0.88)', lineHeight: 1.2, margin: 0 }}>
                5 minutos para entretenerte
              </p>
            </div>
            {gs.done && (
              <button onClick={() => reset(game.id)} style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '4px 14px', cursor: 'pointer' }}>
                Reiniciar
              </button>
            )}
          </div>

          {/* ── Stable glass card — never unmounts, no flash ── */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.07) 100%)',
            backdropFilter: 'blur(36px) saturate(1.55) brightness(1.04)',
            WebkitBackdropFilter: 'blur(36px) saturate(1.55) brightness(1.04)',
            borderRadius: 'clamp(16px, 2vw, 22px)',
            border: '1px solid rgba(255,255,255,0.13)',
            borderTop: '1px solid rgba(255,255,255,0.28)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}>

            {/* Card header — updates instantly, no animation */}
            <div style={{
              padding: 'clamp(0.75rem, 2vw, 1.1rem) clamp(1.25rem, 3vw, 2rem)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{game.icon}</span>
                <div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '1px' }}>{game.subtitle}</p>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.90)', lineHeight: 1.2, margin: 0 }}>{game.title}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Ranking toggle — always visible */}
                <button
                  onClick={() => setShowLB(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: showLeaderboard ? 'rgba(212,168,83,0.95)' : 'rgba(255,255,255,0.55)',
                    background: showLeaderboard ? 'rgba(212,168,83,0.14)' : 'rgba(255,255,255,0.07)',
                    border: showLeaderboard ? '1px solid rgba(212,168,83,0.40)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '999px', padding: '5px 13px', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🏆 <span>Ranking</span>
                </button>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '3px 12px' }}>
                  Junio 2026
                </span>
              </div>
            </div>

            {/* Leaderboard panel — slides open */}
            <AnimatePresence>
              {showLeaderboard && (
                <motion.div
                  key="lb-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
                >
                  <div style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem) clamp(1.25rem, 3vw, 2rem)' }}>
                    <GameLeaderboard
                      gameSlug={game.slug}
                      gameName={game.title}
                      myScore={gs.finalScore}
                      refreshKey={gs.leaderRefresh}
                    />
                    {!userCtx.loggedIn && (
                      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', flex: 1 }}>Crea una cuenta para aparecer en el ranking</span>
                        <button onClick={() => { setShowLB(false); onNeedAuth(); }} style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--paper)', border: 'none', borderRadius: '999px', padding: '7px 16px', cursor: 'pointer', flexShrink: 0 }}>
                          Crear cuenta →
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game body — stable min-height prevents collapse */}
            <div style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem)', minHeight: 'clamp(360px, 50vw, 480px)' }}>
              {renderGame(game.id)}
            </div>

            {/* Completion panel */}
            <AnimatePresence>
              {gs.done && gs.finalScore !== null && (
                <motion.div key="done" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(42,122,79,0.10)', overflow: 'hidden' }}>
                  <div style={{ padding: 'clamp(1.25rem, 3vw, 1.75rem) clamp(1.25rem, 3vw, 2rem)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem', lineHeight: 1 }}>🏆</span>
                        <div>
                          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(80,200,120,0.75)', marginBottom: '2px' }}>¡{game.title} completado!</p>
                          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', color: 'rgba(255,255,255,0.92)', lineHeight: 1, margin: 0 }}>
                            Tiempo: <strong style={{ color: 'var(--warm)' }}>{fmt(gs.finalScore)}</strong>
                          </p>
                        </div>
                      </div>
                      {gs.saveStatus === 'saving' && <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Guardando…</span>}
                      {gs.saveStatus === 'saved'  && <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(80,200,120,0.8)' }}>✓ Puntaje guardado</span>}
                    </div>
                    {(gs.saveStatus === 'idle' || gs.saveStatus === 'error') && !userCtx.loggedIn && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.12)', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '1.15rem' }}>🎯</span>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', flex: 1, margin: 0, lineHeight: 1.4 }}>Guarda tu puntaje y compite en el ranking de Santiago</p>
                        <button onClick={onNeedAuth} style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--paper)', border: 'none', borderRadius: '999px', padding: '9px 20px', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          Crear cuenta →
                        </button>
                      </div>
                    )}
                    <GameLeaderboard gameSlug={game.slug} gameName={game.title} myScore={gs.finalScore} refreshKey={gs.leaderRefresh} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth nudge */}
            <AnimatePresence>
              {gs.showPrompt && !userCtx.loggedIn && !gs.done && (
                <motion.div key="prompt"
                  initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  style={{ position: 'absolute', bottom: 'clamp(1rem, 2.5vw, 1.75rem)', right: 'clamp(1rem, 3vw, 2rem)', zIndex: 20, width: 'min(300px, calc(100% - 2rem))', background: 'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)', backdropFilter: 'blur(28px) saturate(1.8)', WebkitBackdropFilter: 'blur(28px) saturate(1.8)', border: '1px solid rgba(255,255,255,0.20)', borderTop: '1px solid rgba(255,255,255,0.38)', borderRadius: '18px', boxShadow: '0 12px 44px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.25)', padding: '1.1rem 1.2rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🏆</span>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, margin: 0 }}>¿Aparecer en el ranking?</p>
                    </div>
                    <button onClick={() => patch(game.id, { showPrompt: false, promptDismissed: true })} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.50)', lineHeight: 1.55, margin: '0 0 0.85rem' }}>
                    Crea una cuenta gratis para guardar tu tiempo y competir con otros.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { patch(game.id, { showPrompt: false }); onNeedAuth(); }} style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--paper)', border: 'none', borderRadius: '999px', padding: '9px 14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      Crear cuenta
                    </button>
                    <button onClick={() => patch(game.id, { showPrompt: false, promptDismissed: true })} style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '9px 14px', cursor: 'pointer' }}>
                      Seguir →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* ── Navigation ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 'clamp(0.75rem, 1.5vw, 1rem)' }}>

            {/* Prev arrow */}
            <button
              onClick={() => activeIdx > 0 && goTo(activeIdx - 1)}
              disabled={activeIdx === 0}
              aria-label="Juego anterior"
              style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', cursor: activeIdx === 0 ? 'default' : 'pointer', color: activeIdx === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.70)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            >‹</button>

            {/* Desktop: 4 game tabs */}
            <div className="games-nav-desktop">
              {GAMES.map((g, i) => {
                const isActive = i === activeIdx;
                return (
                  <button key={g.id} onClick={() => goTo(i)} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '0 clamp(10px, 2vw, 16px)', height: '38px', borderRadius: '999px',
                    border: isActive ? '1px solid rgba(212,168,83,0.55)' : '1px solid rgba(255,255,255,0.10)',
                    background: isActive ? 'rgba(212,168,83,0.14)' : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)', fontSize: 'clamp(0.55rem, 1.3vw, 0.65rem)', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: isActive ? 'rgba(212,168,83,0.95)' : 'rgba(255,255,255,0.38)',
                    transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{g.icon}</span>
                    <span>{g.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile: compact icon + "title n/4" */}
            <div className="games-nav-mobile">
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{game.icon}</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.80)' }}>{game.title}</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.04em' }}>{activeIdx + 1}/{GAMES.length}</span>
            </div>

            {/* Next arrow */}
            <button
              onClick={() => activeIdx < GAMES.length - 1 && goTo(activeIdx + 1)}
              disabled={activeIdx === GAMES.length - 1}
              aria-label="Siguiente juego"
              style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', cursor: activeIdx === GAMES.length - 1 ? 'default' : 'pointer', color: activeIdx === GAMES.length - 1 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.70)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            >›</button>
          </div>

          <style>{`
            .games-nav-desktop {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              align-items: center;
            }
            .games-nav-mobile {
              display: none;
              align-items: center;
              gap: 8px;
              padding: 0 16px;
            }
            @media (max-width: 500px) {
              .games-nav-desktop { display: none !important; }
              .games-nav-mobile  { display: flex !important; }
            }
          `}</style>

        </div>
      </div>
    </div>
  );
}
