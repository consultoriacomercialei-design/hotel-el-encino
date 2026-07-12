'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

/* ─── 3 highlight attractions for the teaser ─── */
const highlights = [
  {
    name: 'Cascada Cola de Caballo',
    category: 'Naturaleza',
    distance: '14 km · 20 min',
    desc: 'La cascada más icónica de Nuevo León. Una caída de 25 metros en el Parque Nacional, rodeada de sierra y vegetación.',
    src: '/cola-de-caballo.jpeg',
    alt: 'Cascada Cola de Caballo, Parque Nacional, Santiago Nuevo León',
    tag: 'Más visitada',
    href: '/directorio/actividades/cascada-cola-de-caballo',
  },
  {
    name: 'Cañón Matacanes',
    category: 'Aventura Extrema',
    distance: '22 km · 30 min',
    desc: 'Rapel en cascadas, toboganes naturales y saltos al río. El recorrido de aventura más famoso del norte de México.',
    src: '/matacanes.jpg',
    alt: 'Cañón Matacanes, rapel y aventura extrema, Santiago Nuevo León',
    tag: 'Must Do',
    href: '/directorio/actividades/canon-matacanes',
  },
  {
    name: 'Festival Cielo Mágico',
    category: 'Festival Internacional',
    distance: 'En Santiago',
    desc: 'Más de 40 globos aerostáticos tiñen el cielo de Santiago cada octubre. El festival más grande del norte de México.',
    src: '/cielo-magico-festival.jpg',
    alt: 'Festival Santiago Cielo Mágico globos aerostáticos Nuevo León',
    tag: 'Oct – Nov',
    href: '/directorio/actividades/festival-cielo-magico',
  },
];

/* ─── Social counts ─── */
function useSocialStats() {
  const [stats, setStats] = useState({ facebook: 0, instagram: 0 });
  useEffect(() => {
    fetch('/api/social').then(r => r.json()).then(d => {
      if (d.facebook || d.instagram) setStats(d);
    }).catch(() => {});
  }, []);
  return stats;
}

/* ─── Animated number ─── */
function AnimatedNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || target === 0) return;
    let start = 0;
    const inc = target / (1800 / 16);
    const timer = setInterval(() => {
      start += inc;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{target > 0 ? display.toLocaleString('es-MX') : '—'}</span>;
}

/* ─── FadeIn ─── */
function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.5, 0.2, 0.1, 1.14] }} style={style}>
      {children}
    </motion.div>
  );
}

/* ─── Attraction card ─── */
function HighlightCard({ a, index }: { a: typeof highlights[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay: index * 0.09, ease: [0.5, 0.2, 0.1, 1.14] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '3/4', cursor: 'pointer' }}
    >
      <Link href={a.href} style={{ display: 'block', position: 'absolute', inset: 0, zIndex: 2, textDecoration: 'none' }} aria-label={a.name} />
      <motion.div animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.8, ease: [0.5, 0.2, 0.1, 1.14] }}
        style={{ position: 'absolute', inset: 0 }}>
        <Image src={a.src} alt={a.alt} fill
          sizes="(max-width: 768px) 100vw, 33vw"
          quality={90}
          style={{ objectFit: 'cover' }} />
      </motion.div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,4,4,0.88) 0%, rgba(4,4,4,0.25) 55%, rgba(4,4,4,0.05) 100%)' }} />
      {a.tag && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'linear-gradient(135deg, rgba(133,109,71,0.75) 0%, rgba(133,109,71,0.55) 100%)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.4)', color: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 'var(--radius-pill)', zIndex: 1 }}>
          {a.tag}
        </div>
      )}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(4,4,4,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255,255,255,0.15)', padding: '5px 12px', zIndex: 1 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'rgba(250,250,250,0.8)', letterSpacing: '0.08em' }}>{a.distance}</span>
      </div>
      <motion.div animate={{ y: hovered ? -4 : 0 }} transition={{ duration: 0.4, ease: [0.5, 0.2, 0.1, 1.14] }}
        style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', right: '1.25rem', background: 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.14) 100%)', backdropFilter: 'blur(52px) saturate(200%) brightness(1.04)', WebkitBackdropFilter: 'blur(52px) saturate(200%) brightness(1.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.32)', borderTop: '1px solid rgba(255,255,255,0.55)', padding: '1.1rem 1.3rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.50), inset 0 -0.5px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(4,4,4,0.25)', zIndex: 1 }}>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.35rem' }}>{a.category}</p>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)', fontWeight: 400, color: 'var(--paper)', letterSpacing: '-0.01em', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</h3>
        <motion.p animate={{ opacity: hovered ? 1 : 0.6, maxHeight: hovered ? '120px' : '0px' }} transition={{ duration: 0.3 }}
          style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(250,250,250,0.8)', lineHeight: 1.6, overflow: 'hidden' }}>
          {a.desc}
        </motion.p>
      </motion.div>
    </motion.article>
  );
}

/* ─── Social stat cell ─── */
function SocialCell({ href, icon, value, label }: { href?: string; icon: React.ReactNode; value: React.ReactNode; label: string }) {
  const cellStyle: React.CSSProperties = {
    background: 'var(--paper)',
    padding: 'clamp(1.5rem, 3vw, 2rem)',
    display: 'flex', alignItems: 'center', gap: '1.25rem',
    textDecoration: 'none', transition: 'background 0.3s', cursor: href ? 'pointer' : 'default',
    height: '100%', boxSizing: 'border-box',
  };
  const inner = (
    <>
      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border)' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1 }}>{value}</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '4px' }}>{label}</p>
      </div>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={cellStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f5f2ee'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--paper)'; }}>
        {inner}
      </a>
    );
  }
  return <div style={cellStyle}>{inner}</div>;
}

/* ─── Main ─── */
export default function Explore() {
  const social = useSocialStats();

  return (
    <section id="explorar" style={{ background: 'var(--paper)', padding: 'clamp(5rem, 10vw, 10rem) 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(3rem, 6vw, 6rem)', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <FadeIn>
              <p style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem' }}>
                Santiago, Nuevo León · A tu alrededor
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.4rem, 4vw, 4rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                Conoce todo lo que<br />
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--serif-italic)', color: 'var(--muted)' }}>Santiago ofrece</em>
              </h2>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '320px', lineHeight: 1.7 }}>
              Cascada Cola de Caballo, Presa La Boca, Cañón Matacanes y más. El hotel es tu base perfecta para descubrir Nuevo León.
            </p>
          </FadeIn>
        </div>

        {/* ── 3 highlight cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
          {highlights.map((a, i) => <HighlightCard key={a.name} a={a} index={i} />)}
        </div>

        {/* ── CTA → /guia ── */}
        <FadeIn delay={0.15}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(4rem, 8vw, 8rem)' }}>
            <Link href="/directorio" style={{
              fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.18em',
              textTransform: 'uppercase', textDecoration: 'none',
              color: 'var(--paper)',
              background: 'var(--forest)',
              padding: '15px 40px',
              borderRadius: 'var(--radius-pill)',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              transition: 'background 0.25s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--warm)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--forest)'; }}
            >
              Directorio Santiago completo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </FadeIn>

        {/* ── Social proof strip ── */}
        <FadeIn delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}
            className="social-grid">
            {/* Instagram */}
            <SocialCell
              href="https://www.instagram.com/elencinohospedaje"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              }
              value={<AnimatedNumber target={social.instagram} />}
              label="Seguidores · Instagram"
            />
            {/* Facebook */}
            <SocialCell
              href="https://www.facebook.com/hotelencinosantiago"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              }
              value={<AnimatedNumber target={social.facebook} />}
              label="Seguidores · Facebook"
            />
            {/* Google */}
            <SocialCell
              icon={
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              }
              value="5.0 ★"
              label="23 Reseñas · Google"
            />
            {/* WhatsApp */}
            <SocialCell
              href="https://wa.me/528123816588"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              }
              value="WhatsApp"
              label="Reserva directa · Sin comisión"
            />
          </div>
        </FadeIn>

      </div>

      <style>{`
        @media (min-width: 768px) {
          .social-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
