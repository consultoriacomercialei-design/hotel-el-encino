'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: '¿El estacionamiento tiene costo adicional?',
    a: 'No. El estacionamiento privado dentro del hotel está incluido en todas las tarifas, sin costo extra.',
  },
  {
    q: '¿El desayuno está incluido?',
    a: 'No está incluido en la tarifa base, pero puedes agregarlo al hacer tu reservación. El desayuno continental para 2 personas (café, fruta y pan) tiene un costo adicional de $200 MXN.',
  },
  {
    q: '¿Cuántas personas pueden hospedarse en una habitación?',
    a: 'Hasta 4 personas. La habitación cuenta con 2 camas Queen Size, ideal para parejas, familias o grupos de amigos.',
  },
  {
    q: '¿A qué hora es el check-in y el check-out?',
    a: 'Check-in: 3:00 PM · Check-out: 12:00 PM. Si necesitas entrar antes o salir después, puedes agregar Early Check-in o Late Check-out al reservar, sujeto a disponibilidad.',
  },
  {
    q: '¿Cómo confirmo mi reservación?',
    a: 'Si pagas en línea con tarjeta o Mercado Pago, tu reservación se confirma automáticamente y recibes un correo al instante. Si prefieres pagar al llegar, tienes 2 horas para confirmar por WhatsApp — de lo contrario el lugar se libera.',
  },
  {
    q: '¿Tienen alberca, spa o restaurante?',
    a: 'No contamos con alberca, spa ni restaurante dentro del hotel. Sin embargo, hay excelentes opciones gastronómicas a pasos del hotel en el centro histórico de Santiago.',
  },
  {
    q: '¿Aceptan mascotas?',
    a: 'Por el momento no aceptamos mascotas en el hotel.',
  },
  {
    q: '¿Puedo cancelar mi reservación?',
    a: 'Puedes cancelar contactándonos por WhatsApp. Si pagaste en línea, coordinaremos el reembolso contigo directamente. Para más detalles sobre política de cancelación, escríbenos al +52 (81) 2381 6588.',
  },
];

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.5, 0.2, 0.1, 1.14] }}
    >
      {children}
    </motion.div>
  );
}

function FAQItem({ faq, index }: { faq: (typeof faqs)[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.06, ease: [0.5, 0.2, 0.1, 1.14] }}
      style={{
        borderBottom: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'clamp(1rem, 2vw, 1.4rem) 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: '1.5rem',
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <span style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(0.88rem, 1.5vw, 1rem)',
          color: open ? 'var(--warm)' : 'var(--ink)',
          letterSpacing: '0.01em',
          lineHeight: 1.5,
          transition: 'color 0.25s ease',
          fontWeight: open ? 500 : 400,
        }}>
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{
            flexShrink: 0,
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `1px solid ${open ? 'var(--warm)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: open ? 'var(--warm)' : 'var(--muted)',
            transition: 'border-color 0.25s ease, color 0.25s ease',
          }}
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="5" y1="1" x2="5" y2="9" />
            <line x1="1" y1="5" x2="9" y2="5" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(0.82rem, 1.4vw, 0.92rem)',
              color: 'var(--muted)',
              lineHeight: 1.75,
              paddingBottom: 'clamp(1rem, 2vw, 1.4rem)',
              maxWidth: '640px',
            }}>
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <section
      id="preguntas-frecuentes"
      style={{
        background: 'var(--paper)',
        padding: 'clamp(5rem, 10vw, 10rem) 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* Two-column layout on desktop */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 'clamp(3rem, 6vw, 8rem)',
          alignItems: 'start',
        }}>

          {/* Left — header */}
          <div style={{ position: 'sticky', top: '6rem' }}>
            <FadeIn>
              <p style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--warm)',
                marginBottom: '1rem',
              }}>
                Preguntas frecuentes
              </p>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                marginBottom: '1.5rem',
              }}>
                Todo lo que<br />
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--serif-italic)', color: 'var(--muted)' }}>
                  necesitas saber
                </em>
              </h2>
            </FadeIn>
            <FadeIn delay={0.14}>
              <p style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.88rem',
                color: 'var(--muted)',
                lineHeight: 1.7,
                marginBottom: '2rem',
                maxWidth: '300px',
              }}>
                ¿Tienes otra duda? Escríbenos por WhatsApp, respondemos rápido.
              </p>
              <a
                href="https://wa.me/528123816588"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '4px',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--warm)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--warm)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            </FadeIn>
          </div>

          {/* Right — accordion */}
          <div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {faqs.map((faq, i) => (
                <FAQItem key={i} faq={faq} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
