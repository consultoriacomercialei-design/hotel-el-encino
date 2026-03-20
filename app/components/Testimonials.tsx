'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const reviews = [
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

export default function Testimonials() {
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
                  5.0
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
                  23 reseñas en Google
                </span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Reviews grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(1.5rem, 3vw, 2.5rem)',
          marginBottom: 'clamp(3rem, 5vw, 5rem)',
        }}>
          {reviews.map((review, i) => (
            <FadeIn key={review.name} delay={i * 0.1}>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(1.75rem, 3vw, 2.5rem)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(4,4,4,0.05)',
                height: '100%',
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
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--forest)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: 'var(--sans)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--paper)',
                      letterSpacing: '0.05em',
                    }}>
                      {review.initials}
                    </span>
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'var(--sans)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      marginBottom: '0.2rem',
                    }}>
                      {review.name}
                    </p>
                    <p style={{
                      fontFamily: 'var(--sans)',
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      letterSpacing: '0.03em',
                    }}>
                      {review.date} · Google Maps
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* CTA to Google Maps */}
        <FadeIn delay={0.2}>
          <div style={{ textAlign: 'center' }}>
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
                background: 'var(--warm)',
                border: '1px solid var(--warm)',
                padding: '14px 40px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-block',
                transition: 'all 0.35s ease',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(133,109,71,0.3)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--ink)';
                el.style.borderColor = 'var(--ink)';
                el.style.boxShadow = '0 8px 32px rgba(4,4,4,0.2)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--warm)';
                el.style.borderColor = 'var(--warm)';
                el.style.boxShadow = '0 4px 24px rgba(133,109,71,0.3)';
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
