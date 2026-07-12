'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookingFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after scrolling past 300px
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const open = () => window.dispatchEvent(new Event('open-booking-modal'));

  return (
    <>
      <style>{`
        @keyframes encino-pulse {
          0%, 100% { box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.45), 0 4px 20px rgba(133,109,71,0.28), 0 0 0 0 rgba(133,109,71,0); }
          50%       { box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.45), 0 4px 20px rgba(133,109,71,0.42), 0 0 0 8px rgba(133,109,71,0); }
        }
        .booking-float-btn:active { transform: scale(0.96) !important; }
      `}</style>

      <AnimatePresence>
        {visible && (
          <motion.button
            key="booking-float"
            id="btn-reservar-float"
            className="booking-float-btn"
            initial={{ opacity: 0, y: 24, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onClick={open}
            style={{
              position: 'fixed',
              bottom: 'clamp(1.25rem, 3vw, 2rem)',
              left: 'clamp(1rem, 3vw, 1.75rem)',
              zIndex: 48,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, rgba(133,109,71,0.82) 0%, rgba(13,34,30,0.72) 100%)',
              backdropFilter: 'blur(32px) saturate(200%) brightness(1.04)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.04)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderTop: '1px solid rgba(255,255,255,0.48)',
              borderRadius: '999px',
              padding: '12px 20px',
              cursor: 'pointer',
              animation: 'encino-pulse 3.2s ease-in-out infinite',
              transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)',
            } as React.CSSProperties}
          >
            {/* Calendar icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>

            <span style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.72rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1,
            }}>
              Reservar Ahora
            </span>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
