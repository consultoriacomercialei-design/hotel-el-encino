'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { SocialFollowers } from './FeaturedCarousel';

/* ─────────────────────────────────────────────────────────────────────────
 * Ultra Spotlight Hero for "Directorio Santiago"
 *
 * Desktop: editorial spread — headline left, large photo fading right,
 * two accent photos floating at different z-levels with slight rotations.
 * The main photo's left edge dissolves into the forest background via
 * a gradient mask, so there are no hard rectangular edges.
 *
 * Mobile: full-bleed photo behind content with gradient overlay.
 * ───────────────────────────────────────────────────────────────────────── */

export default function GuiaHeroUltra() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  /* Parallax: main photo moves up slowly on scroll */
  const mainPhotoY = useTransform(scrollY, [0, 600], [0, -80]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: 'clamp(560px, 88vh, 920px)',
        overflow: 'hidden',
        background: 'var(--forest)',
      }}
    >
      {/* ── Warm radial accent — top right ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 80% 0%, rgba(133,109,71,0.22) 0%, transparent 70%)',
      }} />

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP PHOTO MOSAIC (hidden on mobile via CSS)
          ═══════════════════════════════════════════════════════════ */}

      {/* ── Main hero image: balloons, right side, left-dissolves ── */}
      <motion.div
        style={{ y: mainPhotoY }}
        className="ultra-main-photo"
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: '0 0 0 var(--radius-xl)',
        }}>
          <Image
            src="/cielo-magico-festival.jpg"
            alt="Festival Cielo Mágico Santiago NL — globos aerostáticos"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
            quality={92}
            style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
          />
          {/* Left fade — dissolves into forest background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, var(--forest) 0%, rgba(13,34,30,0.60) 28%, rgba(13,34,30,0) 55%)',
          }} />
          {/* Bottom fade */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(to top, var(--forest) 0%, transparent 100%)',
          }} />
        </div>
      </motion.div>

      {/* ── Accent photo 1: waterfall, lower-left floating ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ delay: 0.55, duration: 1.0, ease: [0.5, 0.2, 0.1, 1.14] }}
        className="ultra-accent-1"
        whileHover={{ scale: 1.03, rotate: -1.5, transition: { duration: 0.4 } }}
      >
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '-12px 24px 60px rgba(4,4,4,0.40), 0 4px 16px rgba(4,4,4,0.25)',
        }}>
          <Image
            src="/cola-de-caballo.jpeg"
            alt="Cascada Cola de Caballo"
            fill
            sizes="200px"
            quality={85}
            style={{ objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(4,4,4,0.65) 0%, transparent 55%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '0.75rem', left: '0.85rem',
          }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.52rem',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--warm)', marginBottom: '2px',
            }}>Naturaleza</p>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '0.82rem',
              color: '#fff', fontWeight: 400, lineHeight: 1.1,
            }}>Cola de Caballo</p>
          </div>
        </div>
      </motion.div>

      {/* ── Accent photo 2: aerial, mid-right floating ── */}
      <motion.div
        initial={{ opacity: 0, y: -20, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 2.5 }}
        transition={{ delay: 0.40, duration: 1.0, ease: [0.5, 0.2, 0.1, 1.14] }}
        className="ultra-accent-2"
        whileHover={{ scale: 1.04, rotate: 1, transition: { duration: 0.4 } }}
      >
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '12px 20px 55px rgba(4,4,4,0.45), 0 4px 16px rgba(4,4,4,0.20)',
        }}>
          <Image
            src="/santiago-aerea.jpeg"
            alt="Vista aérea Santiago NL"
            fill
            sizes="180px"
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(4,4,4,0.55) 0%, transparent 50%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '0.75rem', left: '0.85rem',
          }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.52rem',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--warm)', marginBottom: '2px',
            }}>Centro Histórico</p>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '0.78rem',
              color: '#fff', fontWeight: 400, lineHeight: 1.1,
            }}>Santiago, N.L.</p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE full-bleed photo (hidden on desktop via CSS)
          ═══════════════════════════════════════════════════════════ */}
      <div className="ultra-mobile-bg">
        <Image
          src="/cielo-magico-festival.jpg"
          alt="Festival Cielo Mágico Santiago"
          fill
          priority
          sizes="100vw"
          quality={85}
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(13,34,30,0.75) 0%, rgba(13,34,30,0.55) 50%, rgba(13,34,30,0.88) 100%)',
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TEXT CONTENT — always visible, z-index above photos
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 5vw, 5rem)',
        maxWidth: '1400px',
        /* On desktop: take the left ~44% of the container */
      }}>

        {/* Top row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem',
        }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(250,250,250,0.45)',
            textDecoration: 'none',
          }}>
            ← Hotel El Encino
          </Link>
          <a
            href="/mi-negocio/registro"
            className="guia-anunciate-hero"
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', textDecoration: 'none',
              color: 'rgba(250,250,250,0.55)',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '7px 16px', borderRadius: 'var(--radius-pill)',
              transition: 'all 0.25s',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Anúnciate aquí
          </a>
        </div>

        {/* Headline area */}
        <div className="ultra-text-col">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1.2rem',
            }}
          >
            Santiago, Nuevo León
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.85, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(3.2rem, 6.5vw, 6.5rem)',
              fontWeight: 400, color: 'var(--paper)', lineHeight: 0.95,
              letterSpacing: '-0.03em', marginBottom: '1.25rem',
            }}
          >
            Conoce<br />
            <em style={{ fontStyle: 'italic', color: 'rgba(250,250,250,0.45)' }}>Santiago</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.8, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(0.85rem, 1.3vw, 0.98rem)',
              color: 'rgba(250,250,250,0.52)', maxWidth: '360px',
              lineHeight: 1.85, fontWeight: 300,
              marginBottom: 'clamp(1.75rem, 3vw, 2.5rem)',
            }}
          >
            Cascadas, cañones, lagos y festivales — todo lo que Santiago, N.L. tiene para ofrecer, a minutos del hotel.
          </motion.p>

          {/* Social Followers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.8, ease: [0.5, 0.2, 0.1, 1.14] }}
          >
            <SocialFollowers />
          </motion.div>
        </div>
      </div>

      {/* ─── Layout CSS ─────────────────────────────────────────── */}
      <style>{`
        /* ── Main hero image ── */
        .ultra-main-photo {
          position: absolute;
          top: 0; right: 0;
          width: 62%;
          height: 100%;
          z-index: 1;
          display: none;                /* hidden on mobile */
        }

        /* ── Accent 1: waterfall (lower-left of photo area) ── */
        .ultra-accent-1 {
          position: absolute;
          bottom: clamp(2rem, 5vw, 4rem);
          right: clamp(2rem, 8vw, 7rem);
          width: clamp(120px, 13vw, 195px);
          aspect-ratio: 3/4;
          z-index: 5;
          display: none;
          cursor: pointer;
        }

        /* ── Accent 2: aerial (upper part of photo area) ── */
        .ultra-accent-2 {
          position: absolute;
          top: clamp(3rem, 8vw, 7rem);
          right: clamp(0.5rem, 2vw, 2rem);
          width: clamp(110px, 12vw, 170px);
          aspect-ratio: 4/5;
          z-index: 6;
          display: none;
          cursor: pointer;
        }

        /* ── Mobile background ── */
        .ultra-mobile-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: block;             /* visible on mobile */
        }

        /* ── Text column width on desktop ── */
        .ultra-text-col {
          max-width: 100%;
        }

        /* Desktop: show photo mosaic, hide mobile bg, narrow text */
        @media (min-width: 900px) {
          .ultra-main-photo  { display: block; }
          .ultra-accent-1    { display: block; }
          .ultra-accent-2    { display: block; }
          .ultra-mobile-bg   { display: none; }
          .ultra-text-col    { max-width: 44%; }
        }

        /* Anunciate hover */
        .guia-anunciate-hero:hover {
          background: rgba(133,109,71,0.22) !important;
          color: rgba(250,250,250,0.88) !important;
          border-color: rgba(133,109,71,0.48) !important;
        }
      `}</style>
    </div>
  );
}
