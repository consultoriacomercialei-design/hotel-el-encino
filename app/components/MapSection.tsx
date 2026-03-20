'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

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

export default function MapSection() {
  return (
    <section style={{ background: 'var(--paper)', padding: 'clamp(4rem, 8vw, 8rem) 0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 'clamp(3rem, 5vw, 5rem)',
          alignItems: 'end',
          marginBottom: 'clamp(2.5rem, 4vw, 4rem)',
        }}>
          <div>
            <FadeIn>
              <p style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--warm)',
                marginBottom: '1rem',
              }}>
                Cómo llegar
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}>
                Estamos en el<br />
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--serif-italic)', color: 'var(--muted)' }}>corazón de Santiago</em>
              </h2>
            </FadeIn>
          </div>

          <FadeIn delay={0.15}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Address */}
              <div style={{
                background: 'rgba(133,109,71,0.07)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                border: '1px solid rgba(133,109,71,0.15)',
              }}>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.6rem' }}>
                  Dirección
                </p>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.6 }}>
                  Hermenegildo Galeana 200<br />
                  Col. Centro, Santiago, N.L. 67310
                </p>
              </div>

              {/* Phone + Distance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'var(--paper)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>Teléfono</p>
                  <a href="tel:+528119999318" style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>
                    81 1999 9318
                  </a>
                </div>
                <div style={{
                  background: 'var(--paper)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>De Monterrey</p>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 500 }}>~45 min</p>
                </div>
              </div>

              {/* Google Maps button */}
              <a
                href="https://www.google.com/maps/place/Hotel+El+Encino+Santiago/@25.4219673,-100.1599007,17z"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--paper)',
                  textDecoration: 'none',
                  background: 'var(--warm)',
                  padding: '14px 24px',
                  borderRadius: 'var(--radius-pill)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(133,109,71,0.3)',
                  alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'var(--ink)';
                  el.style.boxShadow = '0 6px 24px rgba(4,4,4,0.2)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'var(--warm)';
                  el.style.boxShadow = '0 4px 20px rgba(133,109,71,0.3)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Abrir en Google Maps
              </a>
            </div>
          </FadeIn>
        </div>

        {/* Map embed */}
        <FadeIn delay={0.2}>
          <div style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(4,4,4,0.10)',
            border: '1px solid var(--border)',
            height: 'clamp(300px, 45vw, 500px)',
            position: 'relative',
          }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3594.0!2d-100.1599007!3d25.4219673!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8662cfde04bb7553%3A0x510ae16fefe5748a!2sHotel%20El%20Encino%20Santiago!5e0!3m2!1ses!2smx!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Hotel El Encino Santiago"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
