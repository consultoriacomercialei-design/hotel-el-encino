'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { label: 'Concepto', href: '#concepto' },
  { label: 'Habitaciones', href: '#habitaciones' },
  { label: 'Experiencias', href: '#experiencias' },
  { label: 'Directorio Santiago', href: '/directorio' },
  { label: 'Reseñas', href: '#resenas' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact]   = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef      = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      setCompact(window.scrollY < 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /* ── shared glass styles ──
     When NOT scrolled (over dark hero): use opaque forest-tinted pill with NO backdrop-filter.
     Reason: backdrop-filter blur samples upward into the Dynamic Island zone and picks up the
     body's white background, creating a white bar. Over the dark hero, a solid-ish dark pill
     looks better anyway. backdrop-filter is only enabled when scrolled (over white sections),
     where sampling white is correct and intentional.
  ── */
  const glassStyle: React.CSSProperties = {
    background: scrolled
      ? 'rgba(250,250,250,0.85)'
      : 'linear-gradient(160deg, rgba(13,34,30,0.62) 0%, rgba(13,34,30,0.42) 55%, rgba(13,34,30,0.58) 100%)',
    backdropFilter: scrolled ? 'blur(48px) saturate(200%) brightness(1.04)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(48px) saturate(200%) brightness(1.04)' : 'none',
    border: scrolled
      ? '1px solid rgba(255,255,255,0.8)'
      : '1px solid rgba(255,255,255,0.22)',
    boxShadow: scrolled
      ? '0 4px 32px rgba(4,4,4,0.10), inset 0 0.5px 0 rgba(255,255,255,0.95)'
      : 'inset 0 0.5px 0 rgba(255,255,255,0.88), 0 16px 48px rgba(0,0,0,0.12)',
    transition: 'background 0.45s, border 0.45s, box-shadow 0.45s',
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      paddingTop: 'max(12px, env(safe-area-inset-top))',
      paddingBottom: '12px',
      paddingLeft: '20px',
      paddingRight: '20px',
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <motion.div
        ref={menuRef}
        initial={false}
        animate={{ maxWidth: compact ? 68 : 900 }}
        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}
      >
        {/* ── Pill ── */}
        <div style={{
          ...glassStyle,
          width: '100%',
          height: '54px',
          borderRadius: 'var(--radius-pill)',
          display: 'flex',
          alignItems: 'center',
          /* center logo when compact, space-between when expanded */
          justifyContent: compact ? 'center' : 'space-between',
          padding: '0 10px',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Specular highlight */}
          {!scrolled && (
            <div style={{
              position: 'absolute', top: 0, left: '5%', right: '5%', height: '0.5px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.92) 65%, transparent)',
              pointerEvents: 'none', zIndex: 2,
            }} />
          )}

          {/* ── LEFT: Logo + Hamburger ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

            {/* Logo — always visible, layoutId for smooth positional animation */}
            <motion.a
              layoutId="navbar-logo"
              href="#"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <motion.img
                src="/logo.png"
                alt="Hotel El Encino"
                initial={false}
                animate={{ width: compact ? 44 : 38, height: compact ? 44 : 38 }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  objectFit: 'contain',
                  display: 'block',
                  filter: scrolled ? 'none' : 'drop-shadow(0 1px 6px rgba(0,0,0,0.40))',
                  transition: 'filter 0.4s',
                }}
              />
            </motion.a>

            {/* Hamburger — only when expanded */}
            <AnimatePresence initial={false}>
              {!compact && (
                <motion.button
                  key="hamburger"
                  ref={hamburgerRef}
                  onClick={() => setMenuOpen(v => !v)}
                  aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  style={{
                    background: menuOpen ? 'rgba(255,255,255,0.18)' : 'transparent',
                    border: menuOpen ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                    padding: '8px 10px', borderRadius: '12px',
                    transition: 'background 0.25s, border 0.25s',
                    overflow: 'hidden',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={
                        i === 0 ? (menuOpen ? { rotate: 45,  y: 8  } : { rotate: 0, y: 0 }) :
                        i === 1 ? (menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }) :
                                  (menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 })
                      }
                      transition={{ duration: 0.3, ease: [0.5, 0.2, 0.1, 1.14] }}
                      style={{
                        display: 'block', width: '20px', height: '1.5px',
                        background: scrolled ? 'var(--ink)' : 'rgba(255,255,255,0.92)',
                        transformOrigin: 'center', borderRadius: '2px',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── CENTER: El Encino — absolute, only when expanded ── */}
          <AnimatePresence initial={false}>
            {!compact && (
              <motion.a
                key="brand-text"
                href="#"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.12 }}
                style={{
                  position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'var(--serif)',
                  fontSize: '0.95rem', fontWeight: 400,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: scrolled ? 'var(--ink)' : 'rgba(255,255,255,0.95)',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  textShadow: scrolled ? 'none' : '0 1px 8px rgba(0,0,0,0.15)',
                  transition: 'color 0.4s',
                  pointerEvents: 'auto',
                }}
              >
                El Encino
              </motion.a>
            )}
          </AnimatePresence>

          {/* ── RIGHT: Reservar — only when expanded ── */}
          <AnimatePresence initial={false}>
            {!compact && (
              <motion.button
                key="reservar"
                onClick={() => window.dispatchEvent(new Event('open-booking-modal'))}
                initial={{ opacity: 0, maxWidth: 0, paddingLeft: 0, paddingRight: 0 }}
                animate={{ opacity: 1, maxWidth: 200, paddingLeft: 18, paddingRight: 18 }}
                exit={{ opacity: 0, maxWidth: 0, paddingLeft: 0, paddingRight: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  fontFamily: 'var(--sans)', fontSize: '0.68rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--paper)', borderRadius: 'var(--radius-pill)',
                  background: 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.45)',
                  boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 4px 20px rgba(133,109,71,0.35)',
                  paddingTop: '9px', paddingBottom: '9px',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  overflow: 'hidden', flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'linear-gradient(135deg, rgba(13,34,30,0.85) 0%, rgba(13,34,30,0.65) 100%)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)';
                }}
              >
                Reservar
              </motion.button>
            )}
          </AnimatePresence>

        </div>{/* end pill */}

        {/* ── Dropdown menu ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.5, 0.2, 0.1, 1.14] }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                width: 'min(300px, calc(100vw - 40px))',
                background: 'linear-gradient(160deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.26) 100%)',
                backdropFilter: 'blur(60px) saturate(140%) brightness(1.04)',
                WebkitBackdropFilter: 'blur(60px) saturate(140%) brightness(1.04)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.55)',
                boxShadow: `
                  inset 0 0.5px 0 rgba(255,255,255,0.95),
                  inset 0 -0.5px 0 rgba(255,255,255,0.2),
                  0 24px 64px rgba(4,4,4,0.16), 0 4px 16px rgba(4,4,4,0.08)
                `,
                padding: '10px', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: '0.5px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.95) 60%, transparent)',
                pointerEvents: 'none',
              }} />

              {links.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.045, duration: 0.28 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'var(--serif-italic)', fontSize: '1.15rem', fontWeight: 400,
                    color: 'var(--ink)', textDecoration: 'none',
                    padding: '14px 20px', borderRadius: 'var(--radius-md)',
                    transition: 'background 0.2s, color 0.2s', cursor: 'pointer',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = 'rgba(133,109,71,0.12)';
                    el.style.color = 'var(--warm)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = 'transparent';
                    el.style.color = 'var(--ink)';
                  }}
                >
                  <span>{link.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </motion.a>
              ))}

              <div style={{
                marginTop: '4px', padding: '12px 20px 4px',
                borderTop: '1px solid rgba(4,4,4,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(15,15,15,0.65)', letterSpacing: '0.08em' }}>
                  Santiago, N.L.
                </span>
                <a href="tel:+528123816588" style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(15,15,15,0.82)', textDecoration: 'none', letterSpacing: '0.05em', fontWeight: 600 }}>
                  +52 (81) 2381 6588
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

      </motion.div>
    </header>
  );
}
