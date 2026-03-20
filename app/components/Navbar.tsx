'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { label: 'Concepto', href: '#concepto' },
  { label: 'Habitaciones', href: '#habitaciones' },
  { label: 'Experiencias', href: '#experiencias' },
  { label: 'Reseñas', href: '#resenas' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header
      ref={menuRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* Floating pill navbar */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '54px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderRadius: 'var(--radius-pill)',
          transition: 'all 0.5s cubic-bezier(.5,.2,.1,1)',
          background: scrolled
            ? 'rgba(250,250,250,0.78)'
            : 'rgba(250,250,250,0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: scrolled
            ? '1px solid rgba(255,255,255,0.8)'
            : '1px solid rgba(255,255,255,0.25)',
          boxShadow: scrolled
            ? '0 4px 32px rgba(4,4,4,0.10), inset 0 1px 0 rgba(255,255,255,0.9)'
            : '0 4px 24px rgba(4,4,4,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px',
            borderRadius: '8px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={
                i === 0 ? (menuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }) :
                i === 1 ? (menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }) :
                (menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 })
              }
              transition={{ duration: 0.3, ease: [0.5, 0.2, 0.1, 1.14] }}
              style={{
                display: 'block',
                width: '20px',
                height: '1.5px',
                background: scrolled ? 'var(--ink)' : 'var(--paper)',
                transformOrigin: 'center',
                transition: 'background 0.3s',
                borderRadius: '2px',
              }}
            />
          ))}
        </button>

        {/* Logo */}
        <a
          href="#"
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '1rem',
            fontWeight: 400,
            letterSpacing: '0.16em',
            color: scrolled ? 'var(--ink)' : 'var(--paper)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            transition: 'color 0.4s',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          El Encino
        </a>

        {/* CTA */}
        <a
          href="#contacto"
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: scrolled ? 'var(--paper)' : 'var(--paper)',
            textDecoration: 'none',
            padding: '9px 18px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--warm)',
            border: '1px solid transparent',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(133,109,71,0.35)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = 'var(--ink)';
            el.style.boxShadow = '0 4px 20px rgba(4,4,4,0.25)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = 'var(--warm)';
            el.style.boxShadow = '0 2px 12px rgba(133,109,71,0.35)';
          }}
        >
          Reservar
        </a>
      </div>

      {/* Glass dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              position: 'absolute',
              top: '78px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(520px, calc(100vw - 40px))',
              background: 'rgba(250,250,250,0.82)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 20px 60px rgba(4,4,4,0.15), inset 0 1px 0 rgba(255,255,255,1)',
              padding: '12px',
              overflow: 'hidden',
            }}
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--serif-italic)',
                  fontSize: '1.15rem',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  padding: '14px 20px',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 0.2s, color 0.2s',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(133,109,71,0.1)';
                  el.style.color = 'var(--warm)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'transparent';
                  el.style.color = 'var(--ink)';
                }}
              >
                <span>{link.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </motion.a>
            ))}

            {/* Footer del menú */}
            <div style={{
              marginTop: '4px',
              padding: '12px 20px 4px',
              borderTop: '1px solid rgba(4,4,4,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                Santiago, N.L.
              </span>
              <a href="tel:+528119999318" style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--warm)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                +52 (81) 1999 9318
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
