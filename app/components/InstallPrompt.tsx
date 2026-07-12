'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DISMISSED_KEY = 'install_prompt_dismissed_at';
const DISMISS_TTL   = 7 * 24 * 60 * 60 * 1000; // 7 days

type Platform = 'ios' | 'android' | 'other';

function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

function wasRecentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_TTL;
  } catch { return false; }
}

export default function InstallPrompt() {
  const [show, setShow]         = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    // Capture the beforeinstallprompt event (Chrome/Android)
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as typeof deferredPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Listen for custom engagement event from the directory
  const triggerShow = useCallback(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;
    const p = getPlatform();
    setPlatform(p);
    // Only show for iOS and Android (Chrome will have beforeinstallprompt or iOS manual)
    if (p === 'ios' || p === 'android' || deferredPrompt) {
      setTimeout(() => setShow(true), 1200); // small delay after engagement
    }
  }, [deferredPrompt]);

  useEffect(() => {
    window.addEventListener('encino:requestInstall', triggerShow);
    return () => window.removeEventListener('encino:requestInstall', triggerShow);
  }, [triggerShow]);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ok */ }
    setShow(false);
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); setShow(false); }
      return;
    }
    // iOS: just show the instructions (already showing)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="install"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            left: '50%', transform: 'translateX(-50%)',
            width: 'min(400px, calc(100vw - 2rem))',
            zIndex: 8000,
            background: 'var(--forest)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          {/* Dismiss */}
          <button
            onClick={dismiss}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>📍</div>
              <div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--paper)', marginBottom: '2px' }}>
                  Agrega Santiago a tu inicio
                </p>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.50)' }}>
                  Acceso rápido al directorio + notificaciones
                </p>
              </div>
            </div>

            {/* Platform-specific instructions */}
            {platform === 'ios' ? (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '4px' }}>
                  <strong style={{ color: 'var(--warm)' }}>En Safari:</strong>
                </p>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                  1. Toca <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Compartir</strong> (□↑) en la barra inferior<br />
                  2. Selecciona <strong style={{ color: 'rgba(255,255,255,0.85)' }}>"Agregar a inicio"</strong><br />
                  3. Toca <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Agregar</strong>
                </p>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                style={{
                  width: '100%', fontFamily: 'var(--sans)', fontSize: '0.75rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--paper)',
                  border: 'none', borderRadius: '999px', padding: '12px', cursor: 'pointer',
                }}
              >
                Instalar app →
              </button>
            ) : null}

            {/* Benefits */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '0.85rem', flexWrap: 'wrap' }}>
              {['🎮 Juegos', '❤️ Favoritos', '🔔 Novedades'].map(b => (
                <span key={b} style={{
                  fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.08em',
                  padding: '3px 10px', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.55)',
                }}>{b}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
