import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { blogPosts, BLOG_CATEGORIES, getRecentPosts } from './data';
import BlogCard from './BlogCard';

export const metadata: Metadata = {
  title: 'Blog de Viajes — Santiago, Nuevo León | Hotel El Encino',
  description: 'Guías de viaje, tips de aventura y todo lo que necesitas saber para explorar Santiago, Nuevo León al máximo. Artículos escritos por el equipo de Hotel El Encino.',
  keywords: [
    'blog Santiago Nuevo León',
    'guías de viaje Santiago NL',
    'qué hacer Santiago Nuevo León',
    'turismo Santiago NL blog',
    'Cola de Caballo guía',
    'Matacanes aventura',
  ],
  openGraph: {
    title: 'Blog — Guías de Santiago, Nuevo León | Hotel El Encino',
    description: 'Guías de viaje, aventura y cultura en Santiago, N.L.',
    url: 'https://hotelelencino.com/blog',
    images: [{ url: '/santiago-aerea.jpeg', width: 1200, height: 630, alt: 'Blog Hotel El Encino — Santiago NL' }],
  },
  alternates: { canonical: '/blog' },
};

const schemaBlog = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Blog — Hotel El Encino Santiago',
  description: 'Guías de viaje y turismo en Santiago, Nuevo León',
  url: 'https://hotelelencino.com/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Hotel El Encino Santiago',
    url: 'https://hotelelencino.com',
    logo: { '@type': 'ImageObject', url: 'https://hotelelencino.com/logo.png' },
  },
};

export default function BlogPage() {
  const posts = getRecentPosts(12);
  const featured = posts.filter(p => p.featured);
  const rest = posts.filter(p => !p.featured);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBlog) }}
      />

      <main style={{ background: 'var(--forest)', minHeight: '100dvh' }}>

        {/* ── Hero header ── */}
        <section style={{
          paddingTop: 'clamp(5rem, 10vw, 8rem)',
          paddingBottom: 'clamp(3rem, 5vw, 4rem)',
          padding: 'clamp(5rem, 10vw, 8rem) clamp(1.5rem, 5vw, 5rem) clamp(3rem, 5vw, 4rem)',
          maxWidth: '1400px', margin: '0 auto',
        }}>
          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
            <Link href="/" style={{
              fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', textDecoration: 'none',
            }}>
              Hotel El Encino
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: '0.7rem' }}>›</span>
            <span style={{
              fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(168,130,84,0.85)',
            }}>
              Blog
            </span>
          </nav>

          <div style={{ overflow: 'hidden', lineHeight: '0.95' }}>
            <h1 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              fontWeight: 400,
              color: 'var(--paper)',
              letterSpacing: '-0.025em',
              lineHeight: '0.95',
              margin: 0,
            }}>
              Guías & Artículos{' '}
              <span style={{
                fontFamily: 'var(--serif-italic)', fontStyle: 'italic',
                color: 'rgba(250,250,250,0.38)',
              }}>
                de Santiago
              </span>
            </h1>
          </div>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)',
            color: 'rgba(250,248,242,0.55)', lineHeight: 1.7,
            maxWidth: '540px', marginTop: '1.25rem',
          }}>
            Todo lo que necesitas saber para explorar Santiago, Nuevo León: cascadas, cañones, festivales, gastronomía y los mejores rincones que la sierra tiene para ofrecer.
          </p>

          {/* Category pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1.75rem' }}>
            {Object.entries(BLOG_CATEGORIES).map(([slug, label]) => (
              <span key={slug} style={{
                fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '5px 14px', borderRadius: 'var(--radius-pill)',
              }}>
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Featured posts ── */}
        {featured.length > 0 && (
          <section style={{
            maxWidth: '1400px', margin: '0 auto',
            padding: '0 clamp(1.5rem, 5vw, 5rem) clamp(3rem, 5vw, 4rem)',
          }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--warm)',
              marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.6)', display: 'inline-block' }} />
              Artículos destacados
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: 'clamp(1rem, 2.5vw, 1.75rem)',
            }}>
              {featured.map((post, i) => (
                <BlogCard key={post.slug} post={post} index={i} theme="dark" size="featured" />
              ))}
            </div>
          </section>
        )}

        {/* ── All posts ── */}
        {rest.length > 0 && (
          <section style={{
            padding: 'clamp(3rem, 5vw, 4rem) clamp(1.5rem, 5vw, 5rem)',
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)',
                marginBottom: '1.5rem',
              }}>
                Más artículos
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: 'clamp(1rem, 2.5vw, 1.75rem)',
              }}>
                {rest.map((post, i) => (
                  <BlogCard key={post.slug} post={post} index={i} theme="dark" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA — hotel booking ── */}
        <section style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: 'clamp(3rem, 5vw, 4rem) clamp(1.5rem, 5vw, 5rem) clamp(4rem, 8vw, 7rem)',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.09) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderTop: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(2rem, 4vw, 3rem)',
            display: 'flex', flexWrap: 'wrap', gap: '2rem',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.5rem',
              }}>
                Tu base en Santiago
              </p>
              <p style={{
                fontFamily: 'var(--serif-italic)', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                fontStyle: 'italic', color: 'var(--paper)', lineHeight: 1.25, maxWidth: '420px',
              }}>
                Hospédate en el centro histórico y despierta listo para explorar
              </p>
            </div>
            <a
              href="/#reservar"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontFamily: 'var(--sans)', fontSize: '0.7rem', letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none',
                background: 'var(--paper)', padding: '14px 28px',
                borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
                flexShrink: 0, transition: 'opacity 0.25s',
              }}
            >
              Reservar habitación →
            </a>
          </div>
        </section>

      </main>
    </>
  );
}
