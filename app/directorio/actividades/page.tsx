import type { Metadata } from 'next';
import Link from 'next/link';
import { listings, CATEGORY_LABEL, CATEGORY_ICON, type Category } from '../data';
import { ActividadCard } from '../GuiaCard';

export const metadata: Metadata = {
  title: 'Actividades y atracciones en Santiago, N.L. — Guía completa',
  description: 'Cascada Cola de Caballo, Cañón Matacanes, Presa La Boca, El Cielito, Festival Cielo Mágico y Catedral. Todo lo que puedes hacer en Santiago, Nuevo León.',
  alternates: { canonical: '/directorio/actividades' },
  openGraph: {
    title: 'Actividades en Santiago, N.L.',
    description: 'Guía completa de qué hacer en Santiago, Nuevo León. Naturaleza, aventura, gastronomía y cultura.',
    url: 'https://hotelelencino.com/directorio/actividades',
    images: [{ url: 'https://hotelelencino.com/cascada.jpeg', width: 1200, height: 800, alt: 'Actividades y atracciones en Santiago, Nuevo León' }],
  },
};

export default function ActividadesPage() {
  const categories = [...new Set(listings.map(l => l.category))] as Category[];

  return (
    <main style={{ background: 'var(--paper)', minHeight: '100dvh' }}>
      {/* Header */}
      <section style={{
        background: 'var(--forest)',
        padding: 'clamp(5rem, 10vw, 8rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 5vw, 5rem)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2rem' }}>
            <Link href="/" style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,250,250,0.4)', textDecoration: 'none' }}>Hotel El Encino</Link>
            <span style={{ color: 'rgba(250,250,250,0.2)', fontSize: '0.7rem' }}>›</span>
            <Link href="/directorio" style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,250,250,0.4)', textDecoration: 'none' }}>Directorio Santiago</Link>
            <span style={{ color: 'rgba(250,250,250,0.2)', fontSize: '0.7rem' }}>›</span>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,250,250,0.7)' }}>Actividades</span>
          </nav>
          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 'clamp(2.4rem, 5vw, 4.5rem)',
            fontWeight: 400, color: 'var(--paper)', lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            Actividades &<br />
            <em style={{ fontStyle: 'italic', color: 'rgba(250,250,250,0.5)' }}>atracciones</em>
          </h1>
        </div>
      </section>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>
        {categories.map(cat => {
          const items = listings.filter(l => l.category === cat);
          return (
            <section key={cat} style={{ padding: 'clamp(2.5rem, 4vw, 4rem) 0', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{
                fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)',
              }}>
                {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '1.5rem',
              }}>
                {items.map(item => (
                  <ActividadCard key={item.slug} item={item} />
                ))}
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <section style={{ padding: 'clamp(3rem, 5vw, 5rem) 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif-italic)', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontStyle: 'italic', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            ¿Listo para explorar Santiago?
          </p>
          <Link href="/#habitaciones" style={{
            fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--paper)', textDecoration: 'none',
            background: 'var(--warm)', padding: '14px 36px', borderRadius: 'var(--radius-pill)',
            display: 'inline-block',
          }}>
            Reservar habitación
          </Link>
        </section>
      </div>
    </main>
  );
}
