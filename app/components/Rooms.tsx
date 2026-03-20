'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const rooms = [
  {
    name: 'Habitación Doble',
    type: 'Entre semana · Lun–Jue',
    price: '$1,500',
    period: 'por noche',
    desc: 'Espaciosa y cómoda para hasta 3 adultos y 1 menor. Cama de calidad, baño privado y todo lo necesario para descansar.',
    src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=85',
    amenities: ['WiFi alta velocidad', 'Estacionamiento', 'Cafetera'],
  },
  {
    name: 'Habitación Doble',
    type: 'Fin de semana · Vie–Dom',
    price: '$2,500',
    period: 'por noche',
    desc: 'La misma habitación cómoda y limpia para tu fin de semana en Santiago. Ideal para desconectarte y explorar el pueblo.',
    src: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&q=85',
    amenities: ['WiFi alta velocidad', 'Estacionamiento', 'Cafetera'],
  },
  {
    name: 'Grupos y familias',
    type: 'Más de 4 personas',
    price: 'Consultar',
    period: 'habitación adicional',
    desc: 'Para grupos de más de 4 personas, contamos con habitaciones adicionales. Contáctanos para disponibilidad y tarifas especiales.',
    src: 'https://images.unsplash.com/photo-1594563703937-fdc640497dcd?w=900&q=85',
    amenities: ['WiFi alta velocidad', 'Estacionamiento', 'Cafetera'],
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
      style={{ cursor: 'default' }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        aspectRatio: '3/4',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
      }}>
        <motion.div
          animate={{ scale: hovered ? 1.05 : 1 }}
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

        {/* Price badge — glass */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(250,250,250,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255,255,255,0.9)',
          padding: '6px 14px',
          boxShadow: '0 2px 12px rgba(4,4,4,0.1)',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}>
          <span style={{ fontFamily: 'var(--serif-italic)', fontSize: '1.1rem', color: 'var(--warm)', fontWeight: 400 }}>
            {room.price}
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            MXN
          </span>
        </div>

        {/* Hover overlay with amenities */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4,4,4,0.5)',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '1.5rem',
          }}
        >
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'rgba(250,250,250,0.9)', lineHeight: 1.6, marginBottom: '1rem' }}>
            {room.desc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {room.amenities.map((a) => (
              <span key={a} style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.65rem',
                color: 'var(--paper)',
                background: 'rgba(133,109,71,0.7)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '0.05em',
              }}>
                {a}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Info */}
      <div>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--warm)',
          marginBottom: '0.4rem',
        }}>
          {room.type}
        </p>
        <h3 style={{
          fontFamily: 'var(--serif)',
          fontSize: '1.5rem',
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: '0.5rem',
        }}>
          {room.name}
        </h3>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.82rem',
          color: 'var(--muted)',
          letterSpacing: '0.03em',
        }}>
          {room.price === 'Consultar' ? 'Disponibilidad a consultar' : `${room.price} MXN · ${room.period}`}
        </p>
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
                Habitaciones & Tarifas
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
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--serif-italic)', color: 'var(--muted)' }}>mereces</em>
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
              Todas las habitaciones incluyen WiFi de alta velocidad, estacionamiento y cafetera sin costo adicional.
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
            <RoomCard key={`${room.name}-${i}`} room={room} index={i} />
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
              fontFamily: 'var(--serif-italic)',
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
                padding: '16px 44px',
                borderRadius: 'var(--radius-pill)',
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

            {/* Disclaimer legal — discreto */}
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.68rem',
              color: 'rgba(107,107,107,0.6)',
              marginTop: '1.5rem',
              maxWidth: '560px',
              margin: '1.5rem auto 0',
              lineHeight: 1.6,
              letterSpacing: '0.01em',
            }}>
              * Las tarifas mostradas corresponden a temporada regular. Durante festivales, eventos especiales,
              puentes y temporada alta (incluyendo Santiago Cielo Mágico, Semana Santa, Fiestas Patrias y Navidad/Año Nuevo),
              las tarifas pueden variar sin previo aviso. Consulta disponibilidad y precio exacto al momento de tu reservación.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
