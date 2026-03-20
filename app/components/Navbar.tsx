'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'all 0.5s cubic-bezier(.5,.2,.1,1)',
          background: scrolled ? 'var(--glass-light)' : 'transparent',
          backdropFilter: scrolled ? 'var(--glass-blur)' : 'none',
          WebkitBackdropFilter: scrolled ? 'var(--glass-blur)' : 'none',
          borderBottom: scrolled ? '1px solid var(--glass-border-light)' : '1px solid transparent',
          boxShadow: scrolled ? 'var(--glass-shadow)' : 'none',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 2rem',
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
              gap: '6px',
              padding: '8px',
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={
                  i === 0 ? (menuOpen ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }) :
                  i === 1 ? (menuOpen ? { opacity: 0 } : { opacity: 1 }) :
                  (menuOpen ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 })
                }
                transition={{ duration: 0.35, ease: [0.5, 0.2, 0.1, 1.14] }}
                style={{
                  display: 'block',
                  width: '24px',
                  height: '1px',
                  background: menuOpen ? 'var(--paper)' : (scrolled ? 'var(--ink)' : 'var(--paper)'),
                  transformOrigin: 'center',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </button>

          {/* Logo */}
          <a
            href="#"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '1.1rem',
              fontWeight: 400,
              letterSpacing: '0.14em',
              color: scrolled ? 'var(--ink)' : 'var(--paper)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'color 0.4s',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            El Encino
          </a>

          {/* CTA — glass button */}
          <a
            href="#contacto"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: scrolled ? 'var(--ink)' : 'var(--paper)',
              textDecoration: 'none',
              padding: '10px 20px',
              transition: 'all 0.35s ease',
              cursor: 'pointer',
              background: scrolled
                ? 'transparent'
                : 'rgba(250,250,250,0.15)',
              backdropFilter: scrolled ? 'none' : 'blur(10px)',
              WebkitBackdropFilter: scrolled ? 'none' : 'blur(10px)',
              border: scrolled
                ? '1px solid var(--ink)'
                : '1px solid rgba(250,250,250,0.5)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = 'var(--warm)';
              el.style.borderColor = 'var(--warm)';
              el.style.color = 'var(--paper)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = scrolled ? 'transparent' : 'rgba(250,250,250,0.15)';
              el.style.borderColor = scrolled ? 'var(--ink)' : 'rgba(250,250,250,0.5)';
              el.style.color = scrolled ? 'var(--ink)' : 'var(--paper)';
            }}
          >
            Reservar
          </a>
        </div>
      </header>

      {/* Full-screen nav overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ duration: 0.6, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(13,34,30,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 4rem',
            }}
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.5, 0.2, 0.1, 1.14] }}
                style={{
                  fontFamily: 'var(--serif-italic)',
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 400,
                  color: 'var(--paper)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(250,250,250,0.1)',
                  padding: '1.5rem 0',
                  letterSpacing: '-0.01em',
                  transition: 'color 0.3s, padding-left 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--warm)';
                  (e.currentTarget as HTMLAnchorElement).style.paddingLeft = '1rem';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--paper)';
                  (e.currentTarget as HTMLAnchorElement).style.paddingLeft = '0';
                }}
              >
                {link.label}
              </motion.a>
            ))}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{
                position: 'absolute',
                bottom: '3rem',
                left: '4rem',
                right: '4rem',
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(250,250,250,0.1)',
                paddingTop: '1.5rem',
              }}
            >
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,250,250,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Santiago, N.L. — México
              </span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,250,250,0.45)', letterSpacing: '0.1em' }}>
                +52 (81) 1999 9318
              </span>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
