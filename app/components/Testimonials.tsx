'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { GoogleReview } from '@/app/lib/google-reviews';

// Fallback hardcoded reviews — used when Google Places API is not configured
const FALLBACK_REVIEWS = [
  {
    name: 'Andrea Lopez',
    date: 'Hace 3 meses',
    rating: 5,
    text: 'Me encantó mi estancia. El personal fue muy amable y profesional. La habitación estaba limpia, espaciosa y con una cama súper cómoda. Además, la ubicación es excelente, cerca de las principales zonas turísticas y con fácil acceso al transporte. Definitivamente volvería a hospedarme aquí y lo recomiendo al 100%.',
    initials: 'AL',
  },
  {
    name: 'Irving Kuri',
    date: 'Hace 3 meses',
    rating: 5,
    text: 'Lugar tranquilo, cómodo y limpio. Tiene todo lo necesario para pasar un gran fin de semana. Yo solo estuve una noche pero no dudo en regresar. Por otro lado Carlos es un gran anfitrión y muy atento a las necesidades de sus huéspedes.',
    initials: 'IK',
  },
  {
    name: 'Jesús Alejandro R.',
    date: 'Hace 2 meses',
    rating: 5,
    text: 'Excelente estancia. El lugar es muy cómodo, limpio y tranquilo. La atención fue impecable y nos hicieron sentir como en casa. Sin duda, un hospedaje totalmente recomendable.',
    initials: 'JA',
  },
];

interface ReviewDisplay {
  name: string;
  date: string;
  rating: number;
  text: string;
  initials: string;
}

interface Props {
  liveReviews?: GoogleReview[];
  summary?: { rating: number; total: number };
}

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginBottom: '1.25rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="var(--warm)" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.5, 0.2, 0.1, 1.14] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function ReviewCard({ review }: { review: ReviewDisplay }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'clamp(1.75rem, 3vw, 2.5rem)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 24px rgba(4,4,4,0.05)',
      height: '100%',
      background: 'var(--paper)',
    }}>
      <StarRating count={review.rating} />
      <p style={{
        fontFamily: 'var(--sans)',
        fontSize: '0.9rem',
        color: 'var(--muted)',
        lineHeight: 1.8,
        flex: 1,
        marginBottom: '1.75rem',
      }}>
        &ldquo;{review.text}&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--forest)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--paper)', letterSpacing: '0.05em' }}>
            {review.initials}
          </span>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.2rem' }}>
            {review.name}
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.03em' }}>
            {review.date} · Google Maps
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewCarousel({ reviews }: { reviews: ReviewDisplay[] }) {
  const [index, setIndex] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const update = () => setPerPage(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const total = reviews.length;
  const maxIndex = Math.max(0, total - perPage);

  const go = (dir: number) => {
    setDirection(dir);
    setIndex(prev => Math.min(Math.max(prev + dir, 0), maxIndex));
  };

  const visible = reviews.slice(index, index + perPage);

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    width: '44px', height: '44px', borderRadius: '50%',
    border: `1.5px solid ${disabled ? 'rgba(133,109,71,0.15)' : 'rgba(133,109,71,0.40)'}`,
    background: disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
    color: disabled ? 'rgba(133,109,71,0.25)' : 'var(--warm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem', transition: 'all 0.2s', flexShrink: 0,
    boxShadow: disabled ? 'none' : '0 2px 12px rgba(133,109,71,0.15)',
  });

  return (
    <div>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${perPage}, 1fr)`,
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
            marginBottom: '2rem',
          }}
        >
          {visible.map((review) => (
            <ReviewCard key={review.name + review.date} review={review} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {total > perPage && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <button style={navBtn(index === 0)} onClick={() => go(-1)} disabled={index === 0} aria-label="Anterior">
            ←
          </button>
          {/* Dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                aria-label={`Ir a reseña ${i + 1}`}
                style={{
                  width: i === index ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '4px',
                  background: i === index ? 'var(--warm)' : 'rgba(133,109,71,0.25)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.3s', padding: 0,
                }}
              />
            ))}
          </div>
          <button style={navBtn(index === maxIndex)} onClick={() => go(1)} disabled={index === maxIndex} aria-label="Siguiente">
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Testimonials({ liveReviews, summary }: Props) {
  // Build display list: live Google reviews when available, fallback to hardcoded
  const reviews: ReviewDisplay[] = liveReviews && liveReviews.length > 0
    ? liveReviews.slice(0, 6).map(r => ({
        name:    r.author_name,
        date:    r.relative_time,
        rating:  r.rating,
        text:    r.text,
        initials: r.initials,
      }))
    : FALLBACK_REVIEWS;

  const displayRating = summary?.rating?.toFixed(1) ?? '5.0';
  const displayTotal  = summary?.total ?? 23;

  return (
    <section
      id="resenas"
      style={{
        background: 'var(--paper)',
        padding: 'clamp(5rem, 10vw, 10rem) 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
          <FadeIn>
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--warm)',
              marginBottom: '1rem',
            }}>
              Lo que dicen nuestros huéspedes
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', flexWrap: 'wrap' }}>
              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.4rem, 4vw, 4rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}>
                Reseñas<br />
                <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>reales</em>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '3rem',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}>
                  {displayRating}
                </span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="var(--warm)" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  letterSpacing: '0.05em',
                }}>
                  {displayTotal} reseñas en Google
                </span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Carousel */}
        <ReviewCarousel reviews={reviews} />

        {/* CTA to Google Maps */}
        <FadeIn delay={0.2}>
          <div style={{ textAlign: 'center', marginTop: 'clamp(2rem, 4vw, 3.5rem)' }}>
            <a
              href="https://www.google.com/maps/place/Hotel+El+Encino+Santiago/@25.4219673,-100.1599007,17z"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--paper)',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)',
                backdropFilter: 'blur(20px) saturate(180%) brightness(1.03)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(1.03)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderTop: '1px solid rgba(255,255,255,0.45)',
                boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 4px 20px rgba(133,109,71,0.35)',
                padding: '14px 40px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-block',
                transition: 'all 0.35s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'linear-gradient(135deg, rgba(13,34,30,0.85) 0%, rgba(13,34,30,0.65) 100%)';
                el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.35), 0 4px 20px rgba(4,4,4,0.25)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)';
                el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 4px 20px rgba(133,109,71,0.35)';
              }}
            >
              Ver todas las reseñas en Google
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
