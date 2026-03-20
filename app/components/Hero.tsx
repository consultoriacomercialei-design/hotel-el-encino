'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const slides = [
  {
    src: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1800&q=85',
    alt: 'Habitación acogedora Hotel El Encino Santiago',
  },
  {
    src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1800&q=85',
    alt: 'Habitación cómoda y limpia El Encino',
  },
  {
    src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1800&q=85',
    alt: 'Descanso en el corazón de Santiago N.L.',
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSlider = () => {
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 6000);
  };

  useEffect(() => {
    startSlider();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const goTo = (i: number) => {
    setCurrent(i);
    if (intervalRef.current) clearInterval(intervalRef.current);
    startSlider();
  };

  return (
    <section
      style={{
        position: 'relative',
        height: '100svh',
        overflow: 'hidden',
        background: 'var(--forest)',
      }}
    >
      {/* Slideshow */}
      {slides.map((slide, i) => (
        <motion.div
          key={slide.src}
          initial={{ opacity: 0 }}
          animate={{ opacity: i === current ? 1 : 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>
      ))}

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(4,4,4,0.35) 0%, rgba(4,4,4,0.2) 50%, rgba(4,4,4,0.6) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 'clamp(2rem, 5vw, 5rem)',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--warm)',
            marginBottom: '1.5rem',
          }}
        >
          Santiago, Nuevo León · Centro Histórico
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.9, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(3.5rem, 8vw, 8rem)',
            fontWeight: 400,
            color: 'var(--paper)',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            maxWidth: '700px',
            marginBottom: '2.5rem',
          }}
        >
          Hotel
          <br />
          <em style={{ fontStyle: 'italic', color: 'rgba(250,250,250,0.75)' }}>El Encino</em>
        </motion.h1>

        {/* Tagline + CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.8, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
            paddingBottom: '3rem',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)',
              color: 'rgba(250,250,250,0.7)',
              maxWidth: '340px',
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            Un lugar en el corazón de Santiago<br />
            perfecto para descansar y desconectarte.
          </p>

          <a
            href="#habitaciones"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--paper)',
              textDecoration: 'none',
              border: '1px solid rgba(250,250,250,0.5)',
              padding: '16px 36px',
              transition: 'all 0.4s ease',
              display: 'inline-block',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = 'var(--warm)';
              el.style.borderColor = 'var(--warm)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = 'transparent';
              el.style.borderColor = 'rgba(250,250,250,0.5)';
            }}
          >
            Descubrir
          </a>
        </motion.div>

        {/* Slide dots */}
        <div
          style={{
            position: 'absolute',
            right: 'clamp(2rem, 5vw, 5rem)',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? '1px' : '1px',
                height: i === current ? '40px' : '16px',
                background: i === current ? 'var(--warm)' : 'rgba(250,250,250,0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.5s ease',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(250,250,250,0.5)', textTransform: 'uppercase' }}>Scroll</span>
          <svg width="1" height="48" viewBox="0 0 1 48" fill="none">
            <line x1="0.5" y1="0" x2="0.5" y2="48" stroke="rgba(250,250,250,0.35)" strokeWidth="1" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
