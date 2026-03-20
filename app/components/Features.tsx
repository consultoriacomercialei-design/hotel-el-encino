'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const experiences = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: 'Ubicación Privilegiada',
    desc: 'En el mero centro de Santiago, N.L. A pasos de restaurantes, la parroquia y las principales atracciones del pueblo.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    title: 'Habitaciones Limpias',
    desc: 'Cada cuarto se prepara con detalle: sábanas frescas, baño impecable y todo lo que necesitas para sentirte en casa.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    title: 'Atención Personalizada',
    desc: 'Un equipo atento y profesional dispuesto a ayudarte en todo. Aquí te conocemos por nombre, no por número de habitación.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    title: 'Estacionamiento',
    desc: 'Llega con tu vehículo sin preocupaciones. Contamos con estacionamiento disponible para los huéspedes del hotel.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    ),
    title: 'WiFi de Alta Velocidad',
    desc: 'Mantente conectado durante tu estancia. Internet en todas las habitaciones y áreas comunes del hotel.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: 'Check-in Flexible',
    desc: 'Nos adaptamos a tus horarios. Contáctanos y nos aseguraremos de que tu llegada y salida sean lo más cómoda posible.',
  },
];

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

export default function Features() {
  const imgRef = useRef(null);
  const imgInView = useInView(imgRef, { once: true, margin: '-60px' });

  return (
    <section id="experiencias" style={{ background: 'var(--forest)', padding: 'clamp(5rem, 10vw, 10rem) 0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 'clamp(4rem, 7vw, 7rem)',
          flexWrap: 'wrap',
          gap: '2rem',
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
                Lo que ofrecemos
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.4rem, 4vw, 4rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--paper)',
              }}>
                Todo lo que<br />
                <em style={{ fontStyle: 'italic', color: 'rgba(250,250,250,0.5)' }}>necesitas</em>
              </h2>
            </FadeIn>
          </div>
        </div>

        {/* Split: image + grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'clamp(3rem, 6vw, 7rem)',
          alignItems: 'start',
        }}>

          {/* Image */}
          <motion.div
            ref={imgRef}
            initial={{ opacity: 0, x: -30 }}
            animate={imgInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: [0.5, 0.2, 0.1, 1.14] }}
            style={{
              position: 'relative',
              aspectRatio: '3/4',
              overflow: 'hidden',
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=85"
              alt="Hotel El Encino Santiago, Nuevo León"
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              style={{ objectFit: 'cover' }}
            />
            {/* Quote overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(13,34,30,0.9) 0%, rgba(13,34,30,0.1) 60%)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '2.5rem',
              left: '2.5rem',
              right: '2.5rem',
            }}>
              <p style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                fontStyle: 'italic',
                color: 'rgba(250,250,250,0.9)',
                lineHeight: 1.5,
                marginBottom: '1rem',
              }}>
                &ldquo;Santiago no se visita.<br />Se vive.&rdquo;
              </p>
              <div style={{ width: '32px', height: '1px', background: 'var(--warm)' }} />
            </div>
          </motion.div>

          {/* Features grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '0',
          }}>
            {experiences.map((exp, i) => (
              <FadeIn key={exp.title} delay={i * 0.07}>
                <div style={{
                  padding: 'clamp(1.5rem, 3vw, 2.5rem)',
                  borderBottom: '1px solid rgba(250,250,250,0.08)',
                  borderRight: i % 2 === 0 ? '1px solid rgba(250,250,250,0.08)' : 'none',
                  transition: 'background 0.3s',
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(250,250,250,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ color: 'var(--warm)', marginBottom: '1rem' }}>
                    {exp.icon}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    color: 'var(--paper)',
                    marginBottom: '0.6rem',
                  }}>
                    {exp.title}
                  </h3>
                  <p style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '0.82rem',
                    color: 'rgba(250,250,250,0.5)',
                    lineHeight: 1.7,
                  }}>
                    {exp.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <FadeIn delay={0.1}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0',
            borderTop: '1px solid rgba(250,250,250,0.12)',
            marginTop: 'clamp(4rem, 7vw, 7rem)',
            paddingTop: 'clamp(3rem, 5vw, 5rem)',
          }}>
            {[
              { value: '5.0 ★', label: 'Calificación' },
              { value: '23', label: 'Reseñas Google' },
              { value: '45 min', label: 'De Monterrey' },
              { value: '100%', label: 'Recomendado' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  textAlign: 'center',
                  padding: 'clamp(1.5rem, 3vw, 2.5rem) 1rem',
                  borderRight: i < 3 ? '1px solid rgba(250,250,250,0.12)' : 'none',
                }}
              >
                <p style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                  fontWeight: 400,
                  color: 'var(--paper)',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                }}>
                  {stat.value}
                </p>
                <p style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,250,250,0.4)',
                }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
