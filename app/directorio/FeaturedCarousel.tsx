'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from './data';

/* ── Social counts for the followers strip ── */
function useSocial() {
  const [counts, setCounts] = useState({ instagram: 0, facebook: 0 });
  useEffect(() => {
    fetch('/api/social').then(r => r.json())
      .then(d => { if (d.instagram || d.facebook) setCounts(d); })
      .catch(() => {});
  }, []);
  return counts;
}

/* ── Animated number ── */
function AnimNum({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    const dur = 1800, step = 16;
    let cur = 0;
    const inc = target / (dur / step);
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, step);
    return () => clearInterval(t);
  }, [target]);
  return <>{target > 0 ? val.toLocaleString('es-MX') : '—'}</>;
}

const IgIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const FbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────── */

/* Compact horizontal followers for header use */
export function SocialFollowersCompact() {
  const counts = useSocial();
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      {[
        { href: 'https://www.instagram.com/elencinohospedaje', icon: <IgIcon />, count: counts.instagram, label: 'Instagram' },
        { href: 'https://www.facebook.com/hotelencinosantiago', icon: <FbIcon />, count: counts.facebook, label: 'Facebook' },
      ].map(({ href, icon, count, label }) => (
        <a
          key={label}
          href={href}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            textDecoration: 'none',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.07) 100%)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderTop: '1px solid rgba(255,255,255,0.28)',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.1rem',
            cursor: 'pointer',
            transition: 'background 0.25s',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.50)', flexShrink: 0 }}>{icon}</div>
          <div>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)',
              fontWeight: 400, color: 'var(--paper)', lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              <AnimNum target={count} />
            </p>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginTop: '2px',
            }}>
              {label}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

/* Full-size followers — kept for any standalone use */
export function SocialFollowers() {
  const counts = useSocial();
  return (
    <div style={{ display: 'flex', gap: 'clamp(1.5rem, 4vw, 3rem)', flexWrap: 'wrap' }}>
      {[
        { href: 'https://www.instagram.com/elencinohospedaje', icon: <IgIcon />, count: counts.instagram, label: 'Seguidores · Instagram' },
        { href: 'https://www.facebook.com/hotelencinosantiago', icon: <FbIcon />, count: counts.facebook, label: 'Seguidores · Facebook' },
      ].map(({ href, icon, count, label }) => (
        <a
          key={label}
          href={href}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.10) 100%)',
            backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.28)', borderTop: '1px solid rgba(255,255,255,0.45)',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.55), 0 4px 24px rgba(0,0,0,0.18)',
            borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem',
            cursor: 'pointer', transition: 'background 0.3s', minWidth: '160px',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.70)' }}>{icon}</div>
          <div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 400, color: 'var(--paper)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              <AnimNum target={count} />
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)', marginTop: '3px' }}>
              {label}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── Flip card for Directorio Destacado ─────────────────────────────── */

function ListingFlipCard({ item, isDesktop, index, fillParent = false }: {
  item: Listing;
  isDesktop: boolean;
  index: number;
  fillParent?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  const isNew = item.isUserListing && item.tier === 'free' &&
    (!item.created_at || Date.now() - new Date(item.created_at).getTime() < TWO_WEEKS);
  const tierLabel =
    item.tier === 'hero'     ? '✦ Anfitrión' :
    item.tier === 'featured' ? '✦ Destacado'  :
    isNew                    ? '✦ Nuevo'       :
    item.tag                 ? `✦ ${item.tag}` : null;
  const tierBg =
    item.tier === 'featured' || item.tier === 'hero'
      ? 'linear-gradient(135deg, rgba(133,109,71,0.85) 0%, rgba(133,109,71,0.62) 100%)'
      : 'linear-gradient(135deg, rgba(42,122,79,0.85) 0%, rgba(42,122,79,0.62) 100%)';

  // fillParent: used inside CoverFlow where the outer div already has fixed size
  const wrapperStyle: React.CSSProperties = fillParent
    ? { width: '100%', height: '100%', position: 'relative', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }
    : isDesktop
      ? { aspectRatio: '3/4', position: 'relative', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }
      : { flexShrink: 0, scrollSnapAlign: 'center', width: 'min(340px, 78vw)', aspectRatio: '3/4', position: 'relative', borderRadius: 'var(--radius-lg)', cursor: 'pointer' };

  return (
    <div
      style={wrapperStyle}
      onClick={() => {
        if (!flipped && typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'listing_click', {
            listing_slug: item.slug, listing_name: item.name,
            listing_category: item.category, listing_tier: item.tier ?? 'free',
            source: isDesktop ? 'grid' : 'carousel',
          });
        }
        setFlipped(f => !f);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>

        {/* ── FRONT: photo + info overlay ── */}
        {!flipped && (
          <motion.div
            key="front"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#0d221e', willChange: 'transform' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.6, ease: [0.5, 0.2, 0.1, 1.14] }}
              {...(!fillParent && {
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98, transition: { duration: 0.12 } },
              })}
              style={{ width: '100%', height: '100%', position: 'relative', willChange: 'transform' }}
            >
              {/* Photo: always cover — el admin/anunciante ajusta encuadre con el editor */}
              {(() => {
                const parts = (item.imgFocus ?? '50% 50%').trim().split(/\s+/);
                const tOrigin = `${parts[0] || '50%'} ${parts[1] || '50%'}`;
                const fScale = parseFloat(parts[2]) || 1;
                return (
                  <Image src={item.src} alt={item.alt} fill sizes="285px" quality={90}
                    style={{ objectFit: 'cover', transform: `scale(${fScale})`, transformOrigin: tOrigin }} />
                );
              })()}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,10,8,0.22)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,4,4,0.92) 0%, rgba(4,4,4,0.15) 50%, transparent 75%)' }} />
              {tierLabel && (
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: tierBg, backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.5)', color: '#fff', fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase' as const, padding: '5px 12px', borderRadius: 'var(--radius-pill)' }}>
                  {tierLabel}
                </div>
              )}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(4,4,4,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255,255,255,0.15)', padding: '5px 10px' }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', color: 'rgba(250,250,250,0.82)', letterSpacing: '0.06em' }}>{item.categoryLabel}</span>
              </div>
              <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', right: '1.25rem', background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.16) 100%)', backdropFilter: 'blur(52px) saturate(200%) brightness(1.04)', WebkitBackdropFilter: 'blur(52px) saturate(200%) brightness(1.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.30)', borderTop: '1px solid rgba(255,255,255,0.55)', padding: '1rem 1.2rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.50), 0 8px 32px rgba(4,4,4,0.22)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.88) 40%, rgba(255,255,255,0.88) 60%, transparent)', pointerEvents: 'none' }} />
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--warm)', marginBottom: '0.25rem' }}>{item.categoryLabel}</p>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)', fontWeight: 400, color: '#fff', letterSpacing: '-0.01em', marginBottom: '0.35rem', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(250,250,250,0.62)', lineHeight: 1.5, display: '-webkit-box', WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 2, overflow: 'hidden' } as React.CSSProperties}>{item.shortDesc}</p>
                <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warm)' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Toca · más info</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── BACK: info panel + action buttons ── */}
        {flipped && (
          <motion.div
            key="back"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--forest)', padding: 'clamp(1.1rem, 2vw, 1.5rem)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 60% at 110% 0%, rgba(133,109,71,0.18) 0%, transparent 65%)' }} />
            <button
              onClick={e => { e.stopPropagation(); setFlipped(false); }}
              style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', zIndex: 2, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >✕</button>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--warm)', marginBottom: '0.35rem', position: 'relative', zIndex: 1 }}>{item.categoryLabel}</p>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, color: 'var(--paper)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>{item.name}</h3>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'rgba(250,250,250,0.68)', lineHeight: 1.6, flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, paddingRight: '2px' }}>{item.longDesc || item.shortDesc}</p>
            <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.28rem', position: 'relative', zIndex: 1 }}>
              {item.hours && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(250,250,250,0.45)', minWidth: '52px', flexShrink: 0 }}>Horario</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(250,250,250,0.82)' }}>{item.hours}</span>
                </div>
              )}
              {item.priceRange && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(250,250,250,0.45)', minWidth: '52px', flexShrink: 0 }}>Precio</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--warm)', fontWeight: 500 }}>{item.priceRange}</span>
                </div>
              )}
              {item.address && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(250,250,250,0.45)', minWidth: '52px', flexShrink: 0 }}>Dirección</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(250,250,250,0.82)', flex: 1 }}>{item.address}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {item.phone && (
                <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--forest)', textDecoration: 'none', background: 'var(--paper)', padding: '6px 10px', borderRadius: 'var(--radius-pill)' }}>Llamar</a>
              )}
              {item.whatsapp && (
                <a href={`https://wa.me/${item.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--sans)', fontSize: '0.65rem', color: '#fff', textDecoration: 'none', background: '#25D366', padding: '6px 10px', borderRadius: 'var(--radius-pill)' }}>WhatsApp</a>
              )}
              {item.website && (
                <a href={item.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: 'var(--radius-pill)' }}>Web</a>
              )}
              <Link href={`/directorio/actividades/${item.slug}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.20)', padding: '6px 10px', borderRadius: 'var(--radius-pill)' }}>Ver perfil →</Link>
            </div>
            {(item.instagram || item.facebook) && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '0.6rem', position: 'relative', zIndex: 1 }}>
                {item.instagram && (
                  <a href={item.instagram} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Instagram" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', textDecoration: 'none', flexShrink: 0 }}><IgIcon /></a>
                )}
                {item.facebook && (
                  <a href={item.facebook} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Facebook" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#1877F2', color: '#fff', textDecoration: 'none', flexShrink: 0 }}><FbIcon /></a>
                )}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* ── Hotel hero photo rotation ───────────────────────────────────────── */
const HOTEL_PHOTOS = ['/IMG_4874.PNG', '/IMG_4875.PNG', '/IMG_4876.PNG', '/IMG_4883.PNG'];

/* ── Featured Listings Carousel ─────────────────────────────────────── */

export default function FeaturedCarousel({ items }: { items: Listing[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [heroPhotoIdx, setHeroPhotoIdx] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelThrottle = useRef(0);
  const dragStartX = useRef<number | null>(null);
  // Velocity tracking for momentum (photo-gallery feel)
  const velRef = useRef(0);
  const lastVelX = useRef(0);
  const lastVelT = useRef(0);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-rotate hotel hero photo every 3.5s (pauses when user is interacting)
  useEffect(() => {
    if (userInteracting) return;
    const t = setInterval(() => setHeroPhotoIdx(i => (i + 1) % HOTEL_PHOTOS.length), 3500);
    return () => clearInterval(t);
  }, [userInteracting]);

  // Desktop Cover Flow auto-advance every 4.5s
  useEffect(() => {
    if (!isDesktop || userInteracting) return;
    const totalCF = items.length + 2;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % totalCF), 4500);
    return () => clearInterval(t);
  }, [isDesktop, userInteracting, items.length]);

  const getCards = () => Array.from(scrollRef.current?.children ?? []) as HTMLElement[];

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = getCards();
    const card = cards[idx];
    if (!card) return;
    const containerLeft = el.getBoundingClientRect().left;
    const cardLeft = card.getBoundingClientRect().left;
    el.scrollBy({ left: cardLeft - containerLeft - (el.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
    setActiveIdx(idx);
  };

  // +1 because index 0 is the hotel hero card
  const totalCards = items.length + 1;
  const prev = () => scrollTo(Math.max(0, activeIdx - 1));
  const next = () => scrollTo(Math.min(totalCards - 1, activeIdx + 1));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = getCards();
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.intersectionRatio > 0.55);
        if (visible) {
          const idx = cards.indexOf(visible.target as HTMLElement);
          if (idx >= 0) setActiveIdx(idx);
        }
      },
      { root: el, threshold: 0.55 }
    );
    cards.forEach(c => observer.observe(c));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Shared card markup helpers ──
     Note: scrollRef / scrollTo / prev / next kept for
     potential mobile fallback but not used in CoverFlow render path. */

  const hotelCard = (gridStyle?: React.CSSProperties, coverFlow = false) => (
    <a
      href="/#habitaciones"
      style={{
        textDecoration: 'none',
        display: 'block',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        ...((isDesktop || coverFlow)
          ? { aspectRatio: 'unset', height: '100%', ...gridStyle }
          : { flexShrink: 0, scrollSnapAlign: 'center', width: 'min(340px, 78vw)', aspectRatio: '3/4' }),
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.7, ease: [0.5, 0.2, 0.1, 1.14] }}
        {...(!coverFlow && {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98, transition: { duration: 0.12 } },
        })}
        style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--forest)' }}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={heroPhotoIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, position: 'absolute' as const, inset: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <Image
                src={HOTEL_PHOTOS[heroPhotoIdx]}
                alt="Hotel El Encino Santiago"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={85}
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </motion.div>
          </AnimatePresence>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, rgba(13,34,30,0.25) 0%, rgba(13,34,30,0.10) 50%, rgba(13,34,30,0.55) 100%)',
          }} />
          {/* Photo dots */}
          <div style={{
            position: 'absolute', bottom: '5.5rem', right: '1.25rem',
            display: 'flex', gap: '5px', alignItems: 'center',
          }}>
            {HOTEL_PHOTOS.map((_, i) => (
              <div key={i} style={{
                width: i === heroPhotoIdx ? '18px' : '5px',
                height: '5px',
                borderRadius: '3px',
                background: i === heroPhotoIdx ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(4,4,4,0.88) 0%, transparent 55%)',
        }} />
        <div style={{
          position: 'absolute', top: '1rem', left: '1rem',
          background: 'linear-gradient(135deg, rgba(133,109,71,0.85) 0%, rgba(133,109,71,0.60) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.5)',
          color: '#fff',
          fontFamily: 'var(--sans)', fontSize: '0.58rem',
          letterSpacing: '0.14em', textTransform: 'uppercase' as const,
          padding: '5px 12px', borderRadius: 'var(--radius-pill)',
        }}>
          ✦ Hotel Anfitrión
        </div>
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(4,4,4,0.55)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '5px 10px',
        }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', color: 'rgba(250,250,250,0.82)', letterSpacing: '0.06em' }}>
            Centro
          </span>
        </div>
        <div style={{
          position: 'absolute', bottom: '1.25rem',
          left: '1.25rem', right: '1.25rem',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.16) 100%)',
          backdropFilter: 'blur(52px) saturate(200%) brightness(1.04)',
          WebkitBackdropFilter: 'blur(52px) saturate(200%) brightness(1.04)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,255,255,0.30)',
          borderTop: '1px solid rgba(255,255,255,0.55)',
          padding: '1rem 1.2rem',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.50), 0 8px 32px rgba(4,4,4,0.22)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%',
            height: '0.5px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.88) 40%, rgba(255,255,255,0.88) 60%, transparent)',
            pointerEvents: 'none',
          }} />
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--warm)', marginBottom: '0.25rem' }}>
            Hospedaje
          </p>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)', fontWeight: 400, color: '#fff', letterSpacing: '-0.01em', marginBottom: '0.35rem', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Hotel El Encino
          </h3>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'rgba(250,250,250,0.62)', lineHeight: 1.5, display: '-webkit-box', WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 2, overflow: 'hidden' } as React.CSSProperties}>
            Tu base perfecta para explorar Santiago — centro histórico, naturaleza y descanso.
          </p>
          <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warm)' }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Reservar</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </motion.div>
    </a>
  );


  const anunciateCard = (gridStyle?: React.CSSProperties, coverFlow = false) => (
    <a
      href="/mi-negocio/registro"
      style={{
        textDecoration: 'none',
        display: 'block',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        ...((isDesktop || coverFlow)
          ? { aspectRatio: 'unset', ...gridStyle }
          : { flexShrink: 0, scrollSnapAlign: 'center', width: 'min(340px, 78vw)', aspectRatio: '3/4' }),
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (items.length + 1) * 0.08, duration: 0.7, ease: [0.5, 0.2, 0.1, 1.14] }}
        {...(!coverFlow && {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98, transition: { duration: 0.12 } },
        })}
        style={{ width: '100%', height: '100%', position: 'relative', background: '#0a1c19' }}
      >
        {/* Background: clean dark gradient — no grid noise */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 110% 70% at 60% 110%, rgba(133,109,71,0.28) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 10% 10%, rgba(42,80,50,0.30) 0%, transparent 60%), #0a1c19',
        }} />
        {/* Warm glow at center */}
        <div style={{
          position: 'absolute', left: '50%', top: '42%',
          transform: 'translate(-50%, -50%)',
          width: '160px', height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,130,84,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Badge */}
        <div style={{
          position: 'absolute', top: '1rem', left: '1rem',
          background: 'rgba(133,109,71,0.18)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(133,109,71,0.45)',
          color: 'rgba(168,130,84,0.95)',
          fontFamily: 'var(--sans)', fontSize: '0.55rem',
          letterSpacing: '0.16em', textTransform: 'uppercase' as const,
          padding: '5px 12px', borderRadius: 'var(--radius-pill)',
        }}>
          ✦ Espacio disponible
        </div>
        {/* Center content — vertically centered, consistent padding */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '3.5rem 1.5rem 5.5rem',
          gap: '0',
        }}>
          {/* Icon */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '1px solid rgba(168,130,84,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.2rem',
            background: 'rgba(133,109,71,0.10)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(168,130,84,0.80)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.56rem', letterSpacing: '0.20em',
            textTransform: 'uppercase' as const, color: 'rgba(168,130,84,0.65)',
            marginBottom: '0.85rem', textAlign: 'center',
          }}>
            Santiago, N.L.
          </p>
          <h3 style={{
            fontFamily: 'var(--serif-italic)', fontSize: 'clamp(1.45rem, 2.5vw, 1.75rem)',
            fontStyle: 'italic', fontWeight: 400,
            color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em',
            lineHeight: 1.25, textAlign: 'center', marginBottom: '0.85rem',
          }}>
            ¿Tu negocio<br />en el directorio?
          </h3>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.38)', lineHeight: 1.65,
            textAlign: 'center', maxWidth: '200px',
          }}>
            Aparece ante visitantes que buscan lo que tú ofreces.
          </p>
        </div>
        {/* CTA button */}
        <div style={{
          position: 'absolute', bottom: '1.5rem',
          left: '1.25rem', right: '1.25rem',
          background: 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.55) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(168,130,84,0.55)',
          borderTop: '1px solid rgba(255,255,255,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px rgba(133,109,71,0.25)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.16em',
            textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.95)',
            fontWeight: 500,
          }}>
            Anúnciate gratis
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </motion.div>
    </a>
  );

  /* ── Cover Flow carousel (all screens) ── */
  {
    // ALL cards share the same fixed DOM size — scale transform makes side cards smaller visually
    // This means inner content NEVER reflows or changes size — only the transform changes
    const CARD_W = isDesktop ? 285 : 220;
    const CARD_H = Math.round(CARD_W * 4 / 3); // 380 desktop, 293 mobile
    const STAGE_H = CARD_H + 40;

    // Horizontal offset from stage center to card center (px)
    const GAP1 = isDesktop ? 248 : 178;  // ring 1 (adjacent)
    const GAP2 = isDesktop ? 428 : 308;  // ring 2 (outer)

    const totalCF = items.length + 2;
    // Mobile needs a larger threshold — touch is more sensitive than mouse
    const DRAG_THRESHOLD = isDesktop ? 28 : 52;

    const cfGo = (dir: number) => {
      setUserInteracting(true);
      setActiveIdx(i => ((i + dir) % totalCF + totalCF) % totalCF);
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => setUserInteracting(false), 3200);
    };

    // Shortest-path offset for infinite looping:
    // Given raw offset, wrap to range [-floor(N/2), +floor(N/2)]
    const wrapOffset = (raw: number) => {
      const o = ((raw % totalCF) + totalCF) % totalCF;
      return o > Math.floor(totalCF / 2) ? o - totalCF : o;
    };

    const applyMomentum = () => {
      const v = velRef.current;
      const speed = Math.abs(v);
      // Desktop: up to 2 extra cards on fast swipe. Mobile: max 1 — touch already moved cards via threshold
      const maxMomentum = isDesktop ? 2 : 1;
      if (speed > 0.8) {
        const cards = Math.min(maxMomentum, Math.ceil(speed / 1.0));
        cfGo(v < 0 ? cards : -cards);
      }
      velRef.current = 0;
    };

    // renderCFCard: every card is CARD_W × CARD_H in DOM.
    // Visual size + rotation is pure CSS transform — content inside never changes dimensions.
    const renderCFCard = (key: string | number, offset: number, children: React.ReactNode) => {
      const abs = Math.abs(offset);
      const sign = Math.sign(offset) || 1;
      const isCenter = abs === 0;
      const isVisible = abs <= 2;

      if (!isVisible) return null;

      // Scale: center = 100%, ring1 = 68%, ring2 = 54%
      const scale = isCenter ? 1 : abs === 1 ? 0.68 : 0.54;
      // Rotation: modest so card face stays clearly readable
      const rotateY = isCenter ? 0 : -sign * (abs === 1 ? 34 : 50);
      // Translate from stage center
      const xOffset = isCenter ? 0 : sign * (abs === 1 ? GAP1 : GAP2);

      const zIndex = isCenter ? 10 : abs === 1 ? 7 : 4;
      const opacity = isCenter ? 1 : abs === 1 ? 0.96 : 0.82;

      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: CARD_W,
            height: CARD_H,
            marginLeft: -CARD_W / 2,
            marginTop: -CARD_H / 2,
            zIndex,
            // Single transform handles position + rotation + scale — content stays at full res
            transform: `translateX(${xOffset}px) rotateY(${rotateY}deg) scale(${scale})`,
            opacity,
            transition: 'transform 0.42s cubic-bezier(0.32,0.72,0,1), opacity 0.32s ease',
            cursor: !isCenter ? 'pointer' : 'default',
            pointerEvents: 'auto',
            willChange: 'transform, opacity',
            // Prevent GPU composite layer black corners on 3D-rotated rounded cards
            borderRadius: 'var(--radius-lg)',
            background: '#0d221e',
            isolation: 'isolate',
          }}
        >
          {/* Spotlight ring — center only */}
          {isCenter && (
            <div style={{
              position: 'absolute', inset: '-2px', zIndex: 30, pointerEvents: 'none',
              borderRadius: 'calc(var(--radius-lg) + 2px)',
              border: '1px solid rgba(168,130,84,0.55)',
              boxShadow: [
                '0 0 0 1px rgba(133,109,71,0.18)',
                '0 28px 80px rgba(133,109,71,0.32)',
                'inset 0 1px 0 rgba(255,255,255,0.28)',
                'inset 0 -1px 0 rgba(255,255,255,0.10)',
              ].join(', '),
            }} />
          )}
          {/* Subtle depth tint for side cards */}
          {!isCenter && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 35, pointerEvents: 'none',
              borderRadius: 'var(--radius-lg)',
              background: abs === 2 ? 'rgba(5,12,10,0.20)' : 'rgba(5,12,10,0.06)',
            }} />
          )}
          {/* Content — fixed CARD_W × CARD_H, never reflowed */}
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: '#0d221e',
            willChange: 'transform', // keep GPU layer permanently — prevents black corners after animation
          } as React.CSSProperties}>
            {children}
          </div>
        </div>
      );
    };

    return (
      <div
        onMouseEnter={() => isDesktop && setUserInteracting(true)}
        onMouseLeave={() => {
          dragStartX.current = null;
          if (isDesktop) interactionTimerRef.current = setTimeout(() => setUserInteracting(false), 600);
        }}
      >
        {/* Stage */}
        <div
          style={{ overflow: 'visible', padding: '20px 0 12px', cursor: isDesktop ? 'grab' : 'default', userSelect: 'none', WebkitUserSelect: 'none' }}
          onWheel={e => {
            const now = Date.now();
            if (now - wheelThrottle.current < 280) return;
            wheelThrottle.current = now;
            const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (d > 8) cfGo(1);
            else if (d < -8) cfGo(-1);
          }}
          onMouseDown={e => {
            dragStartX.current = e.clientX;
            lastVelX.current = e.clientX;
            lastVelT.current = Date.now();
            velRef.current = 0;
          }}
          onMouseMove={e => {
            if (dragStartX.current === null) return;
            // Track velocity
            const now = Date.now();
            const dt = now - lastVelT.current;
            if (dt > 0) velRef.current = (e.clientX - lastVelX.current) / dt;
            lastVelX.current = e.clientX;
            lastVelT.current = now;
            // Advance card
            const delta = e.clientX - dragStartX.current;
            if (delta > DRAG_THRESHOLD) { dragStartX.current = e.clientX; cfGo(-1); }
            else if (delta < -DRAG_THRESHOLD) { dragStartX.current = e.clientX; cfGo(1); }
          }}
          onMouseUp={() => { applyMomentum(); dragStartX.current = null; }}
          onMouseLeave={() => { applyMomentum(); dragStartX.current = null; }}
          onTouchStart={e => {
            dragStartX.current = e.touches[0].clientX;
            lastVelX.current = e.touches[0].clientX;
            lastVelT.current = Date.now();
            velRef.current = 0;
          }}
          onTouchMove={e => {
            if (dragStartX.current === null) return;
            const cx = e.touches[0].clientX;
            const now = Date.now();
            const dt = now - lastVelT.current;
            if (dt > 0) velRef.current = (cx - lastVelX.current) / dt;
            lastVelX.current = cx;
            lastVelT.current = now;
            const delta = cx - dragStartX.current;
            if (delta > DRAG_THRESHOLD) { dragStartX.current = cx; cfGo(-1); }
            else if (delta < -DRAG_THRESHOLD) { dragStartX.current = cx; cfGo(1); }
          }}
          onTouchEnd={() => { applyMomentum(); dragStartX.current = null; }}
        >
          <div style={{
            position: 'relative',
            height: `${STAGE_H}px`,
            perspective: '1200px',
            perspectiveOrigin: '50% 50%',
          }}>
            {/* Hotel */}
            {(() => {
              const offset = wrapOffset(0 - activeIdx);
              return renderCFCard('hotel', offset,
                <div style={{ width: '100%', height: '100%' }} onClick={() => offset !== 0 && setActiveIdx(0)}>
                  {hotelCard({ width: '100%', height: '100%' }, true)}
                </div>
              );
            })()}

            {/* Listings */}
            {items.map((item, i) => {
              const cardIdx = i + 1;
              const offset = wrapOffset(cardIdx - activeIdx);
              return renderCFCard(item.slug, offset,
                <div
                  style={{ width: '100%', height: '100%' }}
                  onClick={offset !== 0 ? (e) => { e.stopPropagation(); setActiveIdx(cardIdx); } : undefined}
                >
                  <ListingFlipCard item={item} isDesktop={true} index={i} fillParent />
                </div>
              );
            })}

            {/* Anunciate */}
            {(() => {
              const cardIdx = items.length + 1;
              const offset = wrapOffset(cardIdx - activeIdx);
              return renderCFCard('anunciate', offset,
                <div style={{ width: '100%', height: '100%' }} onClick={() => offset !== 0 && setActiveIdx(cardIdx)}>
                  {anunciateCard({ width: '100%', height: '100%' }, true)}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Nav dots + arrows */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '8px', marginTop: '1.5rem',
          padding: '0 clamp(1.5rem, 5vw, 5rem)', flexWrap: 'wrap',
        }}>
          <button onClick={() => cfGo(-1)} aria-label="Anterior"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.28)',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              color: '#fff', cursor: 'pointer',
              opacity: 0.88,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.3s', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {Array.from({ length: totalCF }).map((_, i) => (
            <button key={i} onClick={() => setActiveIdx(i)} aria-label={`Ir a ${i + 1}`}
              style={{
                width: i === activeIdx ? '22px' : '6px', height: '6px', borderRadius: '3px',
                background: i === activeIdx ? 'var(--warm)' : 'rgba(255,255,255,0.28)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.35s ease', flexShrink: 0,
              }}
            />
          ))}

          <button onClick={() => cfGo(1)} aria-label="Siguiente"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.28)',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              color: '#fff', cursor: 'pointer',
              opacity: 0.88,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.3s', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Ver todos */}
        <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>
          <a href="#directorio-grid" style={{
            fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', textDecoration: 'none',
          }}>
            Ver todos los anuncios →
          </a>
        </div>
      </div>
    );
  }
}
