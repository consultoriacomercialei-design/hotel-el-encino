'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const rooms = [
  {
    name: 'Habitación Estándar',
    type: 'Confort & Descanso',
    size: 'Doble',
    desc: 'Espaciosa, limpia y equipada con todo lo necesario. Cama cómoda, baño privado y el silencio que necesitas para recargar energías.',
    src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=85',
  },
  {
    name: 'Habitación Superior',
    type: 'Mayor Espacio',
    size: 'Superior',
    desc: 'Más amplitud, mejor vista y todos los detalles cuidados. Ideal para quienes buscan un poco más de comodidad en su estancia.',
    src: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&q=85',
  },
  {
    name: 'Habitación Familiar',
    type: 'Para la Familia',
    size: 'Familiar',
    desc: 'Diseñada para que toda la familia disfrute. Espacio suficiente, camas adicionales y la misma calidez de siempre.',
    src: 'https://images.unsplash.com/photo-1594563703937-fdc640497dcd?w=900&q=85',
  },
  {
    name: 'Suite El Encino',
    type: 'Lo Mejor del Hotel',
    size: 'Suite',
    desc: 'Nuestra habitación más especial. Mayor superficie, zona de estar independiente y atención preferencial. Para una escapada que no olvidarás.',
    src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85',
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

function RoomCard({ room, index }: { room: typeof rooms[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay: index * 0.08, ease: [0.5, 0.2, 0.1, 1.14] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        aspectRatio: '3/4',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}>
        <motion.div
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.7, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={room.src}
            alt={room.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        </motion.div>

        {/* Overlay on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4,4,4,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2rem',
          }}
        >
          <p style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.85rem',
            color: 'rgba(250,250,250,0.9)',
            lineHeight: 1.6,
          }}>
            {room.desc}
          </p>
        </motion.div>

        {/* Size badge */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'var(--warm)',
          color: 'var(--paper)',
          fontFamily: 'var(--sans)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          padding: '6px 12px',
          textTransform: 'uppercase',
        }}>
          {room.size}
        </div>
      </div>

      {/* Info */}
      <div>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--warm)',
          marginBottom: '0.5rem',
        }}>
          {room.type}
        </p>
        <h3 style={{
          fontFamily: 'var(--serif)',
          fontSize: '1.6rem',
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: '0.75rem',
        }}>
          {room.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '32px', height: '1px', background: 'var(--warm)' }} />
          <span style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            letterSpacing: '0.08em',
          }}>
            Ver detalles
          </span>
        </div>
      </div>
    </motion.article>
  );
}

export default function Rooms() {
  return (
    <section
      id="habitaciones"
      style={{
        background: 'var(--paper)',
        padding: 'clamp(5rem, 10vw, 10rem) 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Section header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 'clamp(3rem, 6vw, 6rem)',
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
                Habitaciones
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.4rem, 4vw, 4rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}>
                Descansa como<br />
                <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>mereces</em>
              </h2>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.9rem',
              color: 'var(--muted)',
              maxWidth: '320px',
              lineHeight: 1.7,
            }}>
              Cada habitación fue diseñada para darte comodidad, limpieza y el descanso que buscas en Santiago.
            </p>
          </FadeIn>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: 'clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 3vw, 2.5rem)',
        }}>
          {rooms.map((room, i) => (
            <RoomCard key={room.name} room={room} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <FadeIn delay={0.2}>
          <div style={{
            textAlign: 'center',
            marginTop: 'clamp(4rem, 7vw, 7rem)',
            paddingTop: 'clamp(3rem, 5vw, 5rem)',
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              fontStyle: 'italic',
              color: 'var(--muted)',
              marginBottom: '2rem',
            }}>
              ¿Listo para tu escapada a Santiago?
            </p>
            <a
              href="#contacto"
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--paper)',
                background: 'var(--warm)',
                textDecoration: 'none',
                padding: '18px 48px',
                display: 'inline-block',
                transition: 'all 0.35s ease',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(133,109,71,0.3)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--ink)';
                el.style.boxShadow = '0 8px 32px rgba(4,4,4,0.25)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--warm)';
                el.style.boxShadow = '0 4px 24px rgba(133,109,71,0.3)';
              }}
            >
              Consultar disponibilidad
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
