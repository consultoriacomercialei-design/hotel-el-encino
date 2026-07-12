'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ScrollReveal } from './ScrollReveal';
import { MultiLineReveal, CoverReveal } from './LineReveal';
import Image from 'next/image';

const pillars = [
  {
    number: '01',
    title: 'Tranquilidad',
    desc: 'En el corazón de Santiago, lejos del estrés del día a día. Cada rincón de El Encino fue pensado para que el cuerpo y la mente descansen de verdad.',
    src: '/IMG_4876.PNG',
    alt: 'Terraza exterior Hotel El Encino Santiago',
  },
  {
    number: '02',
    title: 'Comodidad',
    desc: 'Habitaciones limpias, espaciosas y con camas de primera. Cuidamos cada detalle para que tu estancia sea exactamente lo que necesitas.',
    src: '/IMG_4880.PNG',
    alt: 'Habitación doble Hotel El Encino Santiago',
  },
  {
    number: '03',
    title: 'Hospitalidad',
    desc: 'Atención personalizada y un equipo que se preocupa por ti. En El Encino te hacemos sentir como en casa desde el primer momento.',
    src: '/IMG_4878.PNG',
    alt: 'Entrada Hotel El Encino Santiago',
  },
];

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.5, 0.2, 0.1, 1.14] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default function Concept() {
  const imgRef = useRef(null);

  return (
    <section id="concepto" style={{ background: 'var(--paper)', padding: 'clamp(5rem, 10vw, 10rem) 0', overflow: 'hidden' }}>
      {/* Top divider */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5rem' }}>
        <div style={{ width: '1px', height: '60px', background: 'var(--warm)' }} />
      </div>

      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)', marginBottom: 'clamp(3rem, 5vw, 5rem)' }}>
        <ScrollReveal mode="enter">
          <p style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--warm)',
          }}>
            Nuestro Concepto
          </p>
        </ScrollReveal>
      </div>

      {/* Split layout: text + image, consistent padding both sides */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 clamp(1.5rem, 5vw, 5rem)',
        marginBottom: 'clamp(5rem, 8vw, 9rem)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: 'clamp(3rem, 6vw, 7rem)',
          alignItems: 'center',
        }}>
          {/* Text column */}
          <div style={{ paddingRight: 'clamp(1rem, 3vw, 3rem)' }}>
            {/* Headline — line by line reveal */}
            <MultiLineReveal
              delay={0}
              stagger={0.18}
              style={{ marginBottom: '2rem' }}
              lineStyle={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
              lines={[
                'Tu refugio en el',
                <em key="2" style={{ fontStyle: 'italic', fontFamily: 'var(--serif-italic)', color: 'var(--muted)' }}>centro de Santiago</em>,
              ]}
            />
            <ScrollReveal mode="enter">
              <p style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(0.9rem, 1.3vw, 1rem)',
                color: 'var(--muted)',
                lineHeight: 1.8,
                maxWidth: '480px',
                marginBottom: '2rem',
              }}>
                Hotel El Encino Santiago nació con una misión sencilla: ofrecerte un lugar cálido, limpio y tranquilo en el corazón de uno de los pueblos más bonitos de Nuevo León.
              </p>
              <p style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(0.9rem, 1.3vw, 1rem)',
                color: 'var(--muted)',
                lineHeight: 1.8,
                maxWidth: '480px',
              }}>
                A pasos de las principales atracciones de Santiago, con acceso fácil y una atención que marca la diferencia. Aquí el descanso no es una promesa — es la experiencia de cada huésped.
              </p>
            </ScrollReveal>
          </div>

          {/* Image column — CoverReveal sweeps warm color away to expose photo */}
          <CoverReveal
            direction="right"
            color="var(--warm)"
            delay={0.3}
            duration={0.95}
            style={{
              position: 'relative',
              aspectRatio: '4/5',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 64px rgba(4,4,4,0.14)',
            }}
          >
            <div ref={imgRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image
                src="/iglesia.jpeg"
                alt="Parroquia de Santiago Apóstol, Santiago Nuevo León"
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                quality={90}
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(to top, rgba(13,34,30,0.5), transparent)',
              }} />
            </div>
          </CoverReveal>
        </div>
      </div>

      {/* Three pillars */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.25rem',
        }}>
          {pillars.map((p, i) => (
            <FadeIn key={p.number} delay={i * 0.12}>
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                aspectRatio: '3/4',
                cursor: 'default',
              }}>
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  quality={95}
                  style={{ objectFit: 'cover' }}
                />

                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(4,4,4,0.85) 0%, rgba(4,4,4,0.3) 50%, rgba(4,4,4,0.05) 100%)',
                }} />

                <div style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1.25rem',
                  right: '1.25rem',
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.16) 100%)',
                  backdropFilter: 'blur(52px) saturate(200%) brightness(1.05)',
                  WebkitBackdropFilter: 'blur(52px) saturate(200%) brightness(1.05)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.38)',
                  borderTop: '1px solid rgba(255,255,255,0.62)',
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -0.5px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(4,4,4,0.22)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '10%',
                    right: '10%',
                    height: '0.5px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.85) 60%, transparent)',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,210,140,0.95)',
                    display: 'block',
                    marginBottom: '0.4rem',
                  }}>
                    {p.number}
                  </span>
                  <h3 style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '1.4rem',
                    fontWeight: 400,
                    color: 'var(--paper)',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.01em',
                  }}>
                    {p.title}
                  </h3>
                  <p style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '0.82rem',
                    color: 'rgba(250,250,250,0.82)',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                    minHeight: 'calc(0.82rem * 1.6 * 3)',
                  }}>
                    {p.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
