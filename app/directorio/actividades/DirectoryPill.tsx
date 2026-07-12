'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/** Sticky pill that fades in after scrolling 150px — links back to /directorio */
export default function DirectoryPill() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 150);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Link
      href="/directorio"
      style={{
        position: 'fixed',
        top: 'clamp(60px, 7vh, 72px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 44,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        background: 'linear-gradient(135deg, rgba(13,50,40,0.90) 0%, rgba(13,50,40,0.76) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderTop: '1px solid rgba(255,255,255,0.24)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.22), inset 0 0.5px 0 rgba(255,255,255,0.18)',
        borderRadius: '980px',
        padding: '7px 16px 7px 12px',
        textDecoration: 'none',
        color: 'rgba(255,255,255,0.82)',
        fontFamily: 'var(--sans)',
        fontSize: '0.72rem',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.35s ease',
      }}
    >
      <svg
        width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.7 }}
      >
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      Directorio · Santiago, N.L.
    </Link>
  );
}
