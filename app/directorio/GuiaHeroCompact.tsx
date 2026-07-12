'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Default slideshow slides ─── */
const STATIC_SLIDES = [
  { src: '/cola-de-caballo.jpeg',      name: 'Cascada Cola de Caballo', accent: 'rgba(52,152,219,0.10)' },
  { src: '/matacanes.jpg',             name: 'Cañón Matacanes',         accent: 'rgba(180,60,30,0.08)'  },
  { src: '/cielo-magico-festival.jpg', name: 'Festival Cielo Mágico',   accent: 'rgba(120,60,180,0.08)' },
  { src: '/presadelaboca.webp',        name: 'Presa La Boca',           accent: 'rgba(30,130,180,0.08)' },
  { src: '/elcielito.jpg',             name: 'El Cielito',              accent: 'rgba(40,150,80,0.06)'  },
  { src: '/cielomagico2.jpg',          name: 'Cielo Mágico',            accent: 'rgba(200,140,20,0.08)' },
];

export interface HeroSlide {
  src: string;
  name: string;
  accent?: string;
}

interface Props {
  heroSlides?: HeroSlide[];
}

/* ── Volume number — editorial detail ── */
const VOLUME = (() => {
  const d = new Date();
  return `Vol. ${d.getFullYear() - 2024} · ${d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
})();

// Monthly spotlight — change each month
const MONTH_SPOTLIGHTS: Record<number, { name: string; category: string }> = {
  1:  { name: 'Cola de Caballo',         category: 'Naturaleza' },
  2:  { name: 'Cañón Matacanes',         category: 'Aventura' },
  3:  { name: 'Presa La Boca',           category: 'Lago & Deportes' },
  4:  { name: 'Festival de Abril',       category: 'Cultura' },
  5:  { name: 'El Cielito',              category: 'Mirador' },
  6:  { name: 'Cielo Mágico',            category: 'Festival' },
  7:  { name: 'Cascada Cola de Caballo', category: 'Naturaleza' },
  8:  { name: 'Cañón Matacanes',         category: 'Aventura' },
  9:  { name: 'Presa La Boca',           category: 'Lago & Deportes' },
  10: { name: 'Cielo Mágico',            category: 'Festival' },
  11: { name: 'Cola de Caballo',         category: 'Naturaleza' },
  12: { name: 'Posadas Santiago',        category: 'Cultura & Tradición' },
};

const CURRENT_MONTH = new Date().getMonth() + 1; // 1-12
const SPOTLIGHT = MONTH_SPOTLIGHTS[CURRENT_MONTH] ?? { name: 'Cola de Caballo', category: 'Naturaleza' };

export default function GuiaHeroCompact({ heroSlides }: Props) {
  const slides = heroSlides && heroSlides.length > 0 ? heroSlides : STATIC_SLIDES;
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrent(i => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div style={{
      position: 'relative',
      height: '100svh',
      minHeight: '600px',
      maxHeight: '960px',
      overflow: 'hidden',
      background: '#050e0d',
    }}>

      {/* ── Slideshow ── */}
      {mounted && (
        <AnimatePresence>
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.25, 0, 0.1, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Image
              src={slides[current].src} alt={slides[current].name} fill
              priority={current === 0} sizes="100vw" quality={88}
              style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
            />
            {slides[current].accent && (
              <div style={{ position: 'absolute', inset: 0, background: slides[current].accent, mixBlendMode: 'screen' }} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
      {!mounted && (
        <Image src={slides[0].src} alt={slides[0].name} fill priority sizes="100vw" quality={88}
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
      )}

      {/* ── Gradients — magazine dark cover ── */}
      {/* Heavy bottom-to-center dark for text */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(5,14,13,0.60) 0%, rgba(5,14,13,0.20) 30%, rgba(5,14,13,0.50) 60%, rgba(5,14,13,0.96) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Left vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(to right, rgba(5,14,13,0.70) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* ── Top bar — magazine header ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 5vw, 5rem)',
      }}>
        {/* Left: publication info */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(168,130,84,0.80)',
          }}>
            Hotel El Encino presents
          </span>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.5rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
          }}>
            {VOLUME}
          </span>
        </motion.div>

        {/* Right: issue number */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
          style={{
            fontFamily: 'var(--serif)', fontSize: '0.62rem', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.22)', fontStyle: 'italic',
          }}
        >
          Nº 001
        </motion.div>
      </div>

      {/* ── Main content — bottom aligned ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(2rem, 5vw, 4rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 5vw, 5rem)',
      }}>

        {/* Location pill */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            alignSelf: 'flex-start', marginBottom: '1.25rem',
            background: 'rgba(13,34,30,0.38)',
            backdropFilter: 'blur(14px) saturate(180%)',
            WebkitBackdropFilter: 'blur(14px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderTop: '1px solid rgba(255,255,255,0.28)',
            borderRadius: '999px',
            padding: '5px 14px 5px 12px',
          }}
        >
          <span style={{ color: 'rgba(168,130,84,0.95)', fontSize: '0.65rem' }}>✦</span>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.60rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)',
          }}>
            Santiago, Nuevo León
          </span>
        </motion.div>

        {/* ── Spotlight del mes — editorial compact inline ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.9rem' }}
        >
          <div style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.55)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.5rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'rgba(168,130,84,0.65)',
          }}>
            Spotlight
          </span>
          <div style={{ overflow: 'hidden', lineHeight: '1', display: 'flex', alignItems: 'center' }}>
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.75, delay: 0.52, ease: [0.23, 1, 0.32, 1] }}
              style={{
                display: 'inline-block',
                fontFamily: 'var(--serif-italic)', fontStyle: 'italic',
                fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '-0.01em',
              }}
            >
              {SPOTLIGHT.name}
            </motion.span>
          </div>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.48rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
          }}>
            · {SPOTLIGHT.category}
          </span>
        </motion.div>

        {/* ── Magazine title — HUGE, line reveals ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          {/* DIRECTORIO */}
          <div style={{ overflow: 'hidden', lineHeight: '0.9' }}>
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.65, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(3.8rem, 14vw, 9rem)',
                fontWeight: 400,
                color: 'var(--paper)',
                letterSpacing: '-0.03em',
                lineHeight: '0.9',
              }}
            >
              Directorio
            </motion.div>
          </div>

          {/* Santiago (italic, muted) */}
          <div style={{ overflow: 'hidden', lineHeight: '0.9', paddingBottom: '0.14em' }}>
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.85, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontFamily: 'var(--serif-italic)',
                fontStyle: 'italic',
                fontSize: 'clamp(3.8rem, 14vw, 9rem)',
                fontWeight: 400,
                color: 'rgba(250,250,250,0.28)',
                letterSpacing: '-0.03em',
                lineHeight: '0.9',
              }}
            >
              Santiago
            </motion.div>
          </div>
        </div>

        {/* Horizontal divider line — sweeps in */}
        <div style={{ overflow: 'hidden', height: '1px', marginBottom: '1.25rem' }}>
          <motion.div
            initial={{ scaleX: 0, transformOrigin: 'left center' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.0, delay: 1.05, ease: [0.77, 0, 0.175, 1] }}
            style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.12)', transformOrigin: 'left center' }}
          />
        </div>

        {/* Bottom row: tagline + slide dots */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.2 }}
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.80rem',
              color: 'rgba(250,250,250,0.35)', lineHeight: 1.7,
              fontWeight: 300, maxWidth: '380px',
            }}
          >
            Naturaleza · gastronomía · aventura · cultura
          </motion.p>

          {/* Slide indicator dots + caption */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={slides[i].name}
                style={{
                  width: i === current ? '22px' : '6px', height: '6px',
                  borderRadius: '3px', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === current ? 'var(--warm)' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.45s ease',
                }}
              />
            ))}
            <AnimatePresence mode="wait">
              <motion.span
                key={current}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.35 }}
                style={{
                  fontFamily: 'var(--sans)', fontSize: '0.56rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.28)', marginLeft: '6px',
                }}
              >
                {slides[current].name}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
