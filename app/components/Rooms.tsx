'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import type { RoomPrices } from '@/app/lib/hotel-config';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const rooms = [
  {
    name: 'Habitación Doble',
    type: 'Entre semana · Lun–Jue',
    price: '$1,500',
    period: 'por noche',
    desc: 'Dos camas Queen Size para hasta 4 personas. Perfecta para parejas, familia con hijos o grupos de amigos que buscan comodidad durante la semana.',
    src: '/IMG_4881.PNG',
    amenities: ['2 camas Queen Size', 'Hasta 4 personas', 'WiFi', 'Estacionamiento', 'Cafetera'],
    badge: null,
  },
  {
    name: 'Habitación Doble',
    type: 'Fin de semana · Vie–Dom',
    price: '$2,500',
    period: 'por noche',
    desc: 'Las mismas dos camas Queen Size para tu escapada de fin de semana. Explora Cola de Caballo, la Presa La Boca y el centro histórico de Santiago.',
    src: '/IMG_4880.PNG',
    amenities: ['2 camas Queen Size', 'Hasta 4 personas', 'WiFi', 'Estacionamiento', 'Cafetera'],
    badge: null,
  },
  {
    name: 'Temporada especial',
    type: 'Cielo Mágico · Semana Santa · Otros',
    price: 'Desde $2,000',
    period: 'por noche',
    desc: 'Durante festivales y temporada alta la habitación puede tener tarifa diferenciada. Consulta disponibilidad con anticipación — se agotan rápido.',
    src: '/IMG_4876.PNG',
    amenities: ['2 camas Queen Size', 'Hasta 4 personas', 'WiFi', 'Estacionamiento', 'Cafetera'],
    badge: 'Alta demanda',
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

function RoomCard({ room, index }: { room: (typeof rooms)[0]; index: number }) {
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
      style={{ cursor: 'default', display: 'flex', flexDirection: 'column' }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        aspectRatio: '4/3',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.25rem',
        flexShrink: 0,
      }}>
        <motion.div
          animate={{ scale: hovered ? 1.04 : 1 }}
          transition={{ duration: 0.7, ease: [0.5, 0.2, 0.1, 1.14] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={room.src}
            alt={room.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={95}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>

        {/* Alta demanda badge — top left only when present */}
        {room.badge && (
          <div style={{
            position: 'absolute',
            top: '0.875rem',
            left: '0.875rem',
            background: 'linear-gradient(135deg, rgba(133,109,71,0.82) 0%, rgba(133,109,71,0.62) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255,255,255,0.30)',
            borderTop: '1px solid rgba(255,255,255,0.52)',
            padding: '4px 12px',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.45), 0 2px 12px rgba(133,109,71,0.28)',
          }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'var(--paper)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {room.badge}
            </span>
          </div>
        )}

        {/* Price badge — bottom left, always visible */}
        <div style={{
          position: 'absolute',
          bottom: '0.875rem',
          left: '0.875rem',
          background: 'rgba(10,10,10,0.62)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255,255,255,0.18)',
          padding: '5px 13px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}>
          <span style={{ fontFamily: 'var(--serif-italic)', fontSize: '1rem', color: 'rgba(255,255,255,0.96)', fontWeight: 400 }}>
            {room.price}
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
            MXN / noche
          </span>
        </div>

        {/* Hover overlay with amenities */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.32 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4,4,4,0.52)',
            backdropFilter: 'blur(3px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
            gap: '0.75rem',
          }}
        >
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'rgba(250,250,250,0.92)', lineHeight: 1.65, textAlign: 'center' }}>
            {room.desc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
            {room.amenities.map((a) => (
              <span key={a} style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.62rem',
                color: 'rgba(255,255,255,0.90)',
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.28)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '0.04em',
              }}>
                {a}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.63rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--warm)',
          marginBottom: '0.35rem',
        }}>
          {room.type}
        </p>
        <h3 style={{
          fontFamily: 'var(--serif)',
          fontSize: '1.4rem',
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: '0.4rem',
        }}>
          {room.name}
        </h3>
        <p style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.8rem',
          color: 'var(--muted)',
          letterSpacing: '0.02em',
          marginBottom: '1.25rem',
          flex: 1,
        }}>
          {room.price === 'Consultar' ? 'Disponibilidad a consultar' : `${room.price} MXN · ${room.period}`}
        </p>

        {/* Reservar Ahora — CTA por tarjeta */}
        <button
          onClick={() => window.dispatchEvent(new Event('open-booking-modal'))}
          style={{
            width: '100%',
            fontFamily: 'var(--sans)',
            fontSize: '0.68rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--paper)',
            background: 'linear-gradient(135deg, rgba(133,109,71,0.88) 0%, rgba(133,109,71,0.68) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderTop: '1px solid rgba(255,255,255,0.44)',
            padding: '13px 24px',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.42), 0 4px 14px rgba(133,109,71,0.28)',
            transition: 'background 0.25s ease, box-shadow 0.25s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'linear-gradient(135deg, rgba(133,109,71,1.0) 0%, rgba(133,109,71,0.85) 100%)';
            el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.42), 0 8px 28px rgba(133,109,71,0.46)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.88) 0%, rgba(133,109,71,0.68) 100%)';
            el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.42), 0 4px 14px rgba(133,109,71,0.28)';
          }}
        >
          Reservar Ahora
        </button>
      </div>
    </motion.article>
  );
}

export default function Rooms({ prices }: { prices: RoomPrices }) {
  // Precios en vivo desde la config del hotel (misma fuente que el modal).
  const priced = [
    { ...rooms[0], price: money(prices.weekday) },
    { ...rooms[1], price: money(prices.weekend) },
    { ...rooms[2], price: `Desde ${money(prices.semana_santa)}` },
  ];
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
          {priced.map((room, i) => (
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
            <button
              onClick={() => window.dispatchEvent(new Event('open-booking-modal'))}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--paper)',
                background: 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)',
                backdropFilter: 'blur(20px) saturate(180%) brightness(1.03)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(1.03)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderTop: '1px solid rgba(255,255,255,0.45)',
                padding: '16px 44px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-block',
                transition: 'all 0.35s ease',
                cursor: 'pointer',
                boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 4px 20px rgba(133,109,71,0.35)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'linear-gradient(135deg, rgba(133,109,71,1.0) 0%, rgba(133,109,71,0.82) 100%)';
                el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 8px 32px rgba(133,109,71,0.5)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'linear-gradient(135deg, rgba(133,109,71,0.80) 0%, rgba(133,109,71,0.58) 100%)';
                el.style.boxShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.48), 0 4px 20px rgba(133,109,71,0.35)';
              }}
            >
              Reservar Ahora
            </button>

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
