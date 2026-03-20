'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const pillars = [
  {
    number: '01',
    title: 'Tranquilidad',
    desc: 'En el corazón de Santiago, lejos del estrés del día a día. Cada rincón de El Encino fue pensado para que el cuerpo y la mente descansen de verdad.',
  },
  {
    number: '02',
    title: 'Comodidad',
    desc: 'Habitaciones limpias, espaciosas y con camas de primera. Cuidamos cada detalle para que tu estancia sea exactamente lo que necesitas.',
  },
  {
    number: '03',
    title: 'Hospitalidad',
    desc: 'Atención personalizada y un equipo que se preocupa por ti. En El Encino te hacemos sentir como en casa desde el primer momento.',
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
  const imgInView = useInView(imgRef, { once: true, margin: '-60px' });

  return (
    <section id="concepto" style={{ background: 'var(--paper)', padding: 'clamp(5rem, 10vw, 10rem) 0' }}>
      {/* Top divider */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5rem' }}>
        <div style={{ width: '1px', height: '60px', background: 'var(--warm)' }} />
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Header */}
        <FadeIn>
          <p style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--warm)',
            marginBottom: '1.5rem',
          }}>
            Nuestro Concepto
          </p>
        </FadeIn>

        {/* Split layout: text + image */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: 'clamp(3rem, 6vw, 7rem)',
          alignItems: 'center',
          marginBottom: 'clamp(5rem, 8vw, 9rem)',
        }}>
          <FadeIn delay={0.1}>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              marginBottom: '2rem',
            }}>
              Tu refugio en el<br />
              <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>centro de Santiago</em>
            </h2>
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
          </FadeIn>

          {/* Image */}
          <motion.div
            ref={imgRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={imgInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              position: 'relative',
              aspectRatio: '4/5',
              overflow: 'hidden',
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1000&q=85"
              alt="Interior acogedor Hotel El Encino Santiago"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            {/* Warm accent overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '30%',
              background: 'linear-gradient(to top, rgba(13,34,30,0.4), transparent)',
            }} />
          </motion.div>
        </div>

        {/* Three pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '0',
          borderTop: '1px solid var(--border)',
        }}>
          {pillars.map((p, i) => (
            <FadeIn key={p.number} delay={i * 0.12}>
              <div style={{
                padding: 'clamp(2.5rem, 4vw, 4rem) clamp(1.5rem, 3vw, 3rem)',
                borderRight: i < pillars.length - 1 ? '1px solid var(--border)' : 'none',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '3rem',
                  fontWeight: 400,
                  color: 'var(--border)',
                  display: 'block',
                  marginBottom: '1rem',
                  lineHeight: 1,
                }}>
                  {p.number}
                </span>
                <h3 style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  marginBottom: '1rem',
                  letterSpacing: '-0.01em',
                }}>
                  {p.title}
                </h3>
                <p style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '0.9rem',
                  color: 'var(--muted)',
                  lineHeight: 1.75,
                }}>
                  {p.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
