'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { type Listing, CATEGORY_ICON } from './data';

/* ── GA4 + push notification tracking ── */
function trackListingClick(item: Listing) {
  if (typeof window !== 'undefined' && typeof (window as unknown as { gtag?: Function }).gtag === 'function') {
    (window as unknown as { gtag: Function }).gtag('event', 'listing_click', {
      listing_slug:     item.slug,
      listing_name:     item.name,
      listing_category: item.category,
      listing_tier:     item.tier,
    });
  }
  // Track click for analytics + notify owner via push (fire-and-forget)
  fetch('/api/push/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: item.slug }),
  }).catch(() => {});
}

/* ── SVG icons ── */
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .27.92z"/>
    </svg>
  );
}
function WAIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}
function IGIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}
function FBIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

/* ── Photo slideshow (hero/featured) ── */
function parseImgFocus(v?: string | null): { transformOrigin: string; scale: number } {
  const parts = (v ?? '50% 50%').trim().split(/\s+/);
  return {
    transformOrigin: `${parts[0] || '50%'} ${parts[1] || '50%'}`,
    scale: parseFloat(parts[2]) || 1,
  };
}

function PhotoSlideshow({ photos, alt, imgFocus }: { photos: string[]; alt: string; imgFocus?: string }) {
  const [idx, setIdx] = useState(0);
  const { transformOrigin, scale } = parseImgFocus(imgFocus);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % photos.length), 3800);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={photos[idx]} alt={alt} fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
            style={{ objectFit: 'cover', transform: `scale(${scale})`, transformOrigin }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%',
          transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 3,
        }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{
                width: i === idx ? '18px' : '6px', height: '6px',
                borderRadius: '3px',
                background: i === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Hero / Featured flip card ─────────────────────────── */
export function GuiaCard({ item }: { item: Listing }) {
  // Flip card only for paying tiers: hero always, featured only if it's a real registered business
  const isFlipCard = item.tier === 'hero' || (item.tier === 'featured' && item.isUserListing === true);

  return isFlipCard
    ? <HeroCard item={item} />
    : <FreeCard item={item} />;
}

function HeroCard({ item }: { item: Listing }) {
  const [flipped, setFlipped] = useState(false);
  const photos = item.photos && item.photos.length > 0 ? item.photos : [item.src];
  const isFeatured = item.tier === 'featured' || item.tier === 'hero';
  const isHero = item.tier === 'hero';

  /* ── AnimatePresence approach: each face lives alone in the DOM.
     No CSS preserve-3d, no backface-visibility — zero bleed-through possible.
     rotateY on each face gives the flip illusion with the perspective on the wrapper. ── */
  return (
    <div
      style={{ perspective: '1000px', cursor: 'pointer', borderRadius: 'var(--radius-lg)', alignSelf: 'start' }}
      onClick={() => { if (!flipped) trackListingClick(item); setFlipped(f => !f); }}
    >
      <AnimatePresence mode="wait" initial={false}>

        {/* ── FRONT ── */}
        {!flipped && (
          <motion.article
            key="front"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0,   opacity: 1 }}
            exit={{    rotateY:  90, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderTop: isFeatured ? '2px solid rgba(168,130,84,0.6)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Hero radial glow */}
            {isHero && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: 'radial-gradient(ellipse at 90% 10%, rgba(133,109,71,0.12) 0%, transparent 60%)',
              }} />
            )}

            {/* Slideshow */}
            <div style={{ position: 'relative', aspectRatio: isHero ? '16/9' : '4/3', overflow: 'hidden', flexShrink: 0 }}>
              <PhotoSlideshow photos={photos} alt={item.alt} imgFocus={item.imgFocus} />

              {/* Category badge */}
              <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 3 }}>
                <div style={{
                  background: 'rgba(13,34,30,0.72)', backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
                  padding: '4px 11px', borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--sans)', fontSize: '0.58rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.88)',
                }}>{item.categoryLabel}</div>
              </div>

              {/* Tier badge */}
              {isFeatured && (
                <div style={{
                  position: 'absolute', bottom: '0.75rem', left: '0.75rem', zIndex: 3,
                  background: 'rgba(133,109,71,0.82)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--sans)', fontSize: '0.55rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.95)',
                }}>✦ {isHero ? 'Anunciante Destacado' : 'Destacado'}</div>
              )}

              {/* Flip hint */}
              <div style={{
                position: 'absolute', bottom: '10px', right: '0.75rem', zIndex: 3,
                background: 'rgba(13,34,30,0.68)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--sans)', fontSize: '0.55rem',
                color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', pointerEvents: 'none',
              }}>Toca · más info</div>
            </div>

            {/* Card info */}
            <div style={{ padding: 'clamp(0.9rem, 2vw, 1.25rem)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', position: 'relative', zIndex: 1 }}>
              <h3 style={{
                fontFamily: 'var(--serif)', fontSize: '1.15rem', fontWeight: 400,
                color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: '0.2rem',
              }}>{item.name}</h3>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)',
                lineHeight: 1.55, marginBottom: '0.6rem',
                display: '-webkit-box', WebkitLineClamp: isFeatured ? 3 : 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>{isFeatured ? (item.longDesc || item.shortDesc) : item.shortDesc}</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {item.hours && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--muted)' }}>
                    <span style={{ flexShrink: 0, marginTop: '1px' }}><ClockIcon /></span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', lineHeight: 1.4 }}>{item.hours}</span>
                  </div>
                )}
                {item.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--muted)' }}>
                    <span style={{ flexShrink: 0, marginTop: '1px' }}><PinIcon /></span>
                    <span style={{
                      fontFamily: 'var(--sans)', fontSize: '0.72rem', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                    }}>{item.address}</span>
                  </div>
                )}
                {isHero && (item.phone || item.whatsapp || item.website) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {item.phone && (
                      <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                        color: 'var(--ink)', textDecoration: 'none',
                        background: 'var(--paper)', border: '1px solid var(--border)',
                        padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                      }}><PhoneIcon /> Llamar</a>
                    )}
                    {item.whatsapp && (
                      <a href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                        color: '#fff', textDecoration: 'none',
                        background: '#25D366', padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                      }}><WAIcon /> WhatsApp</a>
                    )}
                    {item.website && (
                      <a href={item.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                        color: 'var(--ink)', textDecoration: 'none',
                        background: 'var(--paper)', border: '1px solid var(--border)',
                        padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                      }}><GlobeIcon /> Sitio web</a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.article>
        )}

        {/* ── BACK ── */}
        {flipped && (
          <motion.article
            key="back"
            initial={{ rotateY:  90, opacity: 0 }}
            animate={{ rotateY:   0, opacity: 1 }}
            exit={{    rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'var(--forest)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Texture */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 70% 60% at 110% 0%, rgba(133,109,71,0.18) 0%, transparent 65%)',
            }} />

            {/* Close */}
            <button
              onClick={e => { e.stopPropagation(); setFlipped(false); }}
              style={{
                position: 'absolute', top: '0.85rem', right: '0.85rem', zIndex: 2,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >✕</button>

            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.4rem', position: 'relative', zIndex: 1,
            }}>{item.categoryLabel}</p>
            <h3 style={{
              fontFamily: 'var(--serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)',
              fontWeight: 400, color: 'var(--paper)', letterSpacing: '-0.02em',
              lineHeight: 1.15, marginBottom: '0.7rem', position: 'relative', zIndex: 1,
            }}>{item.name}</h3>

            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.78rem',
              color: 'rgba(250,250,250,0.68)', lineHeight: 1.65,
              flex: 1,
              display: '-webkit-box', WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              position: 'relative', zIndex: 1,
            }}>{item.longDesc || item.shortDesc}</p>

            <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative', zIndex: 1 }}>
              {item.hours && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(250,250,250,0.45)', minWidth: '56px', flexShrink: 0 }}>Horario</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(250,250,250,0.82)' }}>{item.hours}</span>
                </div>
              )}
              {item.priceRange && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(250,250,250,0.45)', minWidth: '56px', flexShrink: 0 }}>Precio</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--warm)', fontWeight: 500 }}>{item.priceRange}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {item.phone && (
                <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                  color: 'var(--forest)', textDecoration: 'none',
                  background: 'var(--paper)', padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                }}><PhoneIcon /> Llamar</a>
              )}
              {item.whatsapp && (
                <a href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                  color: '#fff', textDecoration: 'none',
                  background: '#25D366', padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                }}><WAIcon /> WhatsApp</a>
              )}
              <Link href={`/directorio/actividades/${item.slug}`} onClick={e => e.stopPropagation()} style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill)',
              }}>Ver detalles →</Link>
            </div>

            {(item.instagram || item.facebook || item.website) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.85rem', position: 'relative', zIndex: 1 }}>
                {item.instagram && (
                  <a href={item.instagram} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Instagram" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                    color: '#fff', textDecoration: 'none', flexShrink: 0,
                  }}><IGIcon /></a>
                )}
                {item.facebook && (
                  <a href={item.facebook} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Facebook" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: '#1877F2', color: '#fff', textDecoration: 'none', flexShrink: 0,
                  }}><FBIcon /></a>
                )}
                {item.website && (
                  <a href={item.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Sitio web" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.85)', textDecoration: 'none', flexShrink: 0,
                  }}><GlobeIcon /></a>
                )}
              </div>
            )}
          </motion.article>
        )}

      </AnimatePresence>
    </div>
  );
}

/* ── Free tier — expandable inline card ────────────────── */
function FreeCard({ item }: { item: Listing }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { setExpanded(e => !e); trackListingClick(item); }}
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transform: hovered && !expanded ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered || expanded ? '0 12px 40px rgba(4,4,4,0.09)' : 'none',
        transition: 'transform 0.28s ease, box-shadow 0.28s ease',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      {/* Photo */}
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', flexShrink: 0 }}>
        {(() => {
          const { transformOrigin, scale } = parseImgFocus(item.imgFocus);
          const s = hovered ? scale * 1.04 : scale;
          return (
            <Image
              src={item.src} alt={item.alt} fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              quality={85}
              style={{ objectFit: 'cover', transform: `scale(${s})`, transformOrigin, transition: 'transform 0.5s ease' }}
            />
          );
        })()}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(13,34,30,0.72)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
            padding: '4px 11px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--sans)', fontSize: '0.58rem',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.88)',
          }}>{item.categoryLabel}</div>
        </div>
        {item.distanceMin > 0 && (
          <div style={{
            position: 'absolute', bottom: '0.75rem', right: '0.75rem',
            background: 'rgba(13,34,30,0.72)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
            padding: '3px 10px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)',
          }}>{item.distanceMin} min · {item.distanceKm} km</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'clamp(0.9rem, 2vw, 1.25rem)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 400,
          color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: '0.35rem',
        }}>{item.name}</h3>

        {/* Description — truncated collapsed, full + longDesc expanded */}
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="desc-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden', marginBottom: '0.6rem' }}
            >
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                {item.longDesc || item.shortDesc}
              </p>
            </motion.div>
          ) : (
            <p key="desc-collapsed" style={{
              fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)',
              lineHeight: 1.55, marginBottom: '0.5rem',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
            }}>{item.shortDesc}</p>
          )}
        </AnimatePresence>

        {/* Business details */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {item.hours && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--muted)' }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}><ClockIcon /></span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', lineHeight: 1.4 }}>{item.hours}</span>
            </div>
          )}
          {item.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--muted)' }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}><PinIcon /></span>
              <span style={{
                fontFamily: 'var(--sans)', fontSize: '0.72rem', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>{item.address}</span>
            </div>
          )}
          {(item.phone || item.whatsapp) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '0.1rem', flexWrap: 'wrap' }}>
              {item.phone && (
                <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'var(--ink)',
                  textDecoration: 'none', background: 'var(--paper)',
                  border: '1px solid var(--border)', padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                }}>
                  <PhoneIcon /> {item.phone}
                </a>
              )}
              {item.whatsapp && (
                <a href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}`} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'var(--sans)', fontSize: '0.7rem', color: '#25D366',
                  textDecoration: 'none', background: 'rgba(37,211,102,0.08)',
                  border: '1px solid rgba(37,211,102,0.25)', padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                }}>
                  <WAIcon /> WhatsApp
                </a>
              )}
            </div>
          )}
          {item.priceRange && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'var(--warm)', fontWeight: 500 }}>{item.priceRange}</p>
          )}
        </div>

        {/* Expand toggle + details link */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontFamily: 'var(--sans)', fontSize: '0.68rem', fontWeight: 600,
            color: expanded ? 'var(--muted)' : 'var(--forest)',
            letterSpacing: '0.04em',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px', borderRadius: '50%',
              background: expanded ? 'rgba(0,0,0,0.06)' : 'var(--forest)',
              color: expanded ? 'var(--muted)' : '#fff',
              fontSize: '0.65rem', flexShrink: 0,
              transition: 'all 0.22s ease',
            }}>
              {expanded ? '✕' : '+'}
            </span>
            {expanded ? 'Cerrar' : 'Ver más'}
          </span>
          <Link
            href={`/directorio/actividades/${item.slug}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.04em',
              color: 'var(--warm)', textDecoration: 'none',
            }}
          >
            Página completa →
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Small card (sidebar / related) ────────────────────── */
export function GuiaCardSmall({ item }: { item: Listing }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/directorio/actividades/${item.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', gap: '1rem', alignItems: 'center',
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '0.85rem', overflow: 'hidden',
          boxShadow: hovered ? '0 8px 24px rgba(4,4,4,0.08)' : 'none',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <Image src={item.src} alt={item.alt} fill sizes="72px" quality={80} style={{ objectFit: 'cover' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--warm)', marginBottom: '3px' }}>
            {item.categoryLabel}
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: '2px' }}>
            {item.name}
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'var(--muted)' }}>
            {item.distanceMin} min{item.phone ? ` · ${item.phone}` : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}

/* ─── Activity card (detail page related) ───────────────── */
export function ActividadCard({ item }: { item: Listing }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/directorio/actividades/${item.slug}`} style={{ textDecoration: 'none' }}>
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered ? '0 12px 32px rgba(4,4,4,0.1)' : 'none',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '3/2', overflow: 'hidden' }}>
          <Image src={item.src} alt={item.alt} fill sizes="(max-width: 640px) 100vw, 33vw" quality={85} style={{ objectFit: 'cover' }} />
          {item.tag && (
            <div style={{
              position: 'absolute', top: '0.75rem', left: '0.75rem',
              background: 'rgba(133,109,71,0.85)', backdropFilter: 'blur(8px)',
              padding: '3px 10px', borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.1em',
              textTransform: 'uppercase' as const, color: 'var(--paper)',
            }}>{item.tag}</div>
          )}
        </div>
        <div style={{ padding: '1rem 1.2rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--ink)', marginBottom: '0.35rem' }}>
            {item.name}
          </h3>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.65rem' }}>
            {item.shortDesc}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'var(--warm)' }}>{item.distanceMin} min</span>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'var(--muted)' }}>{item.priceRange}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
