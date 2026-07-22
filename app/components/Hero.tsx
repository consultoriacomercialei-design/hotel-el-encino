'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const slides = [
  { src: '/santiago-aerea.jpeg',       alt: 'Vista aérea de Santiago, Nuevo León', pos: 'center' },
  { src: '/parroquia-santiago.jpg',    alt: 'Parroquia de Santiago Apóstol',        pos: 'center top' },
  { src: '/cielo-magico-festival.jpg', alt: 'Festival Santiago Cielo Mágico',       pos: 'center' },
  { src: '/IMG_4883.PNG',              alt: 'Hotel El Encino Santiago',              pos: 'center' },
];

/* ── Word reveal — each word slides up from overflow:hidden container ── */
function WordsReveal({
  text,
  tag: Tag = 'span',
  delay = 0,
  stagger = 0.06,
  style,
}: {
  text: string;
  tag?: 'h1' | 'h2' | 'span' | 'p';
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}) {
  return (
    <Tag style={{ display: 'flex', flexWrap: 'wrap', gap: '0 0.28em', ...style }}>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 'inherit' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.85, delay: delay + i * stagger, ease: [0.23, 1, 0.32, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSlider = () => {
    intervalRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 6000);
  };

  useEffect(() => {
    startSlider();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    setCurrent(i);
    if (intervalRef.current) clearInterval(intervalRef.current);
    startSlider();
  };

  return (
    <section style={{
      position: 'relative',
      height: 'calc(100dvh + env(safe-area-inset-top, 0px))',
      marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))',
      overflow: 'hidden',
      background: 'var(--forest)'
    }}>

      {/* ── Slideshow ── */}
      <AnimatePresence>
        {slides.map((slide, i) => i === current && (
          <motion.div
            key={slide.src}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.25, 0, 0.1, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Image
              src={slide.src} alt={slide.alt} fill priority={i === 0}
              sizes="100vw" quality={95}
              style={{ objectFit: 'cover', objectPosition: slide.pos }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Gradient overlays ── */}
      {/* Bottom-heavy dark for text legibility */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(4,4,4,0.25) 0%, rgba(4,4,4,0.10) 35%, rgba(4,4,4,0.55) 70%, rgba(4,4,4,0.82) 100%)',
      }} />
      {/* Left vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to right, rgba(4,4,4,0.45) 0%, transparent 55%)',
      }} />

      {/* ── Organic particles (pollen/mist) ── */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
        {([
          { left: '11%',  top: '73%', size: 3, dur: '13s', delay: '0s',   anim: 'encino-float-a' },
          { left: '27%',  top: '79%', size: 2, dur: '11s', delay: '2.5s', anim: 'encino-float-b' },
          { left: '48%',  top: '75%', size: 4, dur: '15s', delay: '1s',   anim: 'encino-float-c' },
          { left: '67%',  top: '81%', size: 2, dur: '10s', delay: '4s',   anim: 'encino-float-a' },
          { left: '83%',  top: '71%', size: 3, dur: '12s', delay: '3s',   anim: 'encino-float-b' },
          { left: '38%',  top: '83%', size: 2, dur: '14s', delay: '6s',   anim: 'encino-float-c' },
        ] as const).map((p, i) => (
          <span key={i} style={{
            position: 'absolute', left: p.left, top: p.top,
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%', background: 'rgba(168,130,84,0.55)',
            animation: `${p.anim} ${p.dur} ease-in-out ${p.delay} infinite`,
          }} />
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{
        position: 'relative', zIndex: 3,
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(2rem, 5vw, 5rem)',
        maxWidth: '1400px', margin: '0 auto',
      }}>

        {/* Location eyebrow — glass pill, slides down */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
          style={{
            display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
            gap: '8px', marginBottom: '1.75rem',
            background: 'linear-gradient(135deg, rgba(133,109,71,0.45) 0%, rgba(133,109,71,0.25) 100%)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderTop: '1px solid rgba(255,255,255,0.40)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 16px 6px 12px',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.45)',
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(168,130,84,0.9)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.62rem',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.88)',
          }}>
            Santiago, Nuevo León · Centro Histórico
          </span>
        </motion.div>

        {/* ── HERO TITLE — dramatic line reveals ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          {/* Line 1: HOTEL */}
          <div style={{ overflow: 'hidden', lineHeight: '0.95' }}>
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.0, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(4rem, 12vw, 10rem)',
                fontWeight: 400,
                color: 'var(--paper)',
                letterSpacing: '-0.03em',
                lineHeight: '0.95',
              }}
            >
              Hotel
            </motion.div>
          </div>

          {/* Line 2: El Encino (italic, dimmer) */}
          <div style={{ overflow: 'hidden', lineHeight: '0.95' }}>
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.0, delay: 0.65, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontFamily: 'var(--serif-italic)',
                fontStyle: 'italic',
                fontSize: 'clamp(4rem, 12vw, 10rem)',
                fontWeight: 400,
                color: 'rgba(250,250,250,0.38)',
                letterSpacing: '-0.03em',
                lineHeight: '0.95',
              }}
            >
              El Encino
            </motion.div>
          </div>

          {/* Line 3: Santiago (warm accent) — lineHeight amplio + paddingBottom EN EL TEXTO
              (em = el tamaño grande) para que el overflow:hidden no recorte la cola de la "g" */}
          <div style={{ overflow: 'hidden' }}>
            <motion.div
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.0, delay: 0.82, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.6rem, 8vw, 6.5rem)',
                fontWeight: 400,
                color: 'var(--warm)',
                letterSpacing: '-0.02em',
                lineHeight: '1.15',
                paddingBottom: '0.14em',
              }}
            >
              Santiago
            </motion.div>
          </div>

          {/* Decorative line — sweeps in */}
          <div style={{ overflow: 'hidden', height: '1px', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <motion.div
              initial={{ scaleX: 0, transformOrigin: 'left center' }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 0.9, ease: [0.77, 0, 0.175, 1] }}
              style={{ width: 'clamp(120px, 30vw, 280px)', height: '1px', background: 'var(--warm)', transformOrigin: 'left center' }}
            />
          </div>

          {/* Tagline — words reveal */}
          <WordsReveal
            text="Un lugar en el corazón de Santiago — perfecto para descansar y desconectarte."
            delay={1.0}
            stagger={0.04}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(0.82rem, 1.3vw, 0.98rem)',
              color: 'rgba(250,250,250,0.60)',
              lineHeight: 1.7,
              fontWeight: 300,
              maxWidth: '440px',
            }}
          />
        </div>

        {/* ── CTA row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', paddingBottom: '3.5rem' }}
        >
          <a
            href="#habitaciones"
            className="hero-cta"
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--paper)', textDecoration: 'none',
              background: 'var(--warm)',
              padding: '16px 40px', borderRadius: 'var(--radius-pill)',
              display: 'inline-block', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(133,109,71,0.35)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 48px rgba(133,109,71,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(133,109,71,0.35)'; }}
          >
            Descubrir habitaciones
          </a>
          <a
            href="/directorio"
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            Conoce Santiago
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </motion.div>

        {/* ── Slide dots ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          style={{
            position: 'absolute', bottom: '2rem', left: 'clamp(2rem, 5vw, 5rem)',
            display: 'flex', gap: '10px', alignItems: 'center',
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? '40px' : '16px', height: '1px',
                background: i === current ? 'var(--warm)' : 'rgba(250,250,250,0.30)',
                border: 'none', cursor: 'pointer', transition: 'all 0.5s ease', padding: 0,
              }}
            />
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.5 }}
          style={{
            position: 'absolute', bottom: '2rem', right: 'clamp(6rem, 10vw, 10rem)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}
        >
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>
            Scroll
          </span>
          <div style={{ width: '1px', height: '40px', position: 'relative', overflow: 'hidden' }}>
            <motion.div
              style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.30)' }}
              animate={{ y: ['0%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
