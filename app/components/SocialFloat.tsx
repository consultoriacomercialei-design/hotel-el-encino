'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const socials = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/elencinohospedaje',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/hotelencinosantiago',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'Google Maps',
    href: 'https://www.google.com/maps/place/Hotel+El+Encino+Santiago/@25.4219673,-100.1599007,17z',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
];

export default function SocialFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{
            position: 'fixed',
            right: '1.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(250,250,250,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px rgba(4,4,4,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--warm)';
                el.style.color = 'var(--paper)';
                el.style.borderColor = 'var(--warm)';
                el.style.boxShadow = '0 6px 20px rgba(133,109,71,0.35)';
                el.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'rgba(250,250,250,0.75)';
                el.style.color = 'var(--muted)';
                el.style.borderColor = 'rgba(255,255,255,0.7)';
                el.style.boxShadow = '0 4px 16px rgba(4,4,4,0.10)';
                el.style.transform = 'scale(1)';
              }}
            >
              {s.icon}
            </a>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
