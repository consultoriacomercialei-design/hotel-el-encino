'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedPosts } from '../blog/data';

export default function BlogPreview() {
  const posts = getFeaturedPosts(3);

  return (
    <section style={{
      background: '#f8f6f1',
      padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 5vw, 5rem)',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: '1.5rem', flexWrap: 'wrap',
          marginBottom: 'clamp(2rem, 4vw, 3rem)',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--warm)',
              marginBottom: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ width: '24px', height: '1px', background: 'rgba(133,109,71,0.7)', display: 'inline-block' }} />
              Guías & Artículos
            </p>
            <h2 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Descubre Santiago{' '}
              <span style={{
                fontFamily: 'var(--serif-italic)', fontStyle: 'italic',
                color: 'rgba(13,34,30,0.32)',
              }}>
                como local
              </span>
            </h2>
          </div>
          <Link
            href="/blog"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--forest)', textDecoration: 'none',
              border: '1px solid rgba(13,34,30,0.20)',
              padding: '10px 20px', borderRadius: 'var(--radius-pill)',
              transition: 'all 0.25s',
              flexShrink: 0,
              background: 'transparent',
            }}
          >
            Ver todos los artículos
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(1rem, 2.5vw, 1.75rem)',
        }}>
          {posts.map((post, i) => {
            const formattedDate = new Date(post.publishedAt + 'T12:00:00').toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long',
            });

            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <article style={{
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column',
                  height: '100%',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Cover */}
                  <div style={{ position: 'relative', aspectRatio: '3/2', overflow: 'hidden' }}>
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={80}
                      style={{ objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(6,14,12,0.55) 0%, transparent 55%)',
                    }} />
                    {/* Category */}
                    <div style={{
                      position: 'absolute', top: '0.75rem', left: '0.75rem',
                      background: 'rgba(13,34,30,0.75)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '4px 10px',
                    }}>
                      <span style={{
                        fontFamily: 'var(--sans)', fontSize: '0.52rem', letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)',
                      }}>
                        {post.category}
                      </span>
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '0.75rem', right: '0.75rem',
                      fontFamily: 'var(--sans)', fontSize: '0.55rem',
                      color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em',
                    }}>
                      {post.readTime} min
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: 'clamp(1rem, 2vw, 1.4rem)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <p style={{
                      fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--warm)',
                    }}>
                      {formattedDate}
                    </p>
                    <h3 style={{
                      fontFamily: 'var(--serif)', fontSize: 'clamp(0.95rem, 1.8vw, 1.12rem)',
                      fontWeight: 400, color: 'var(--ink)',
                      letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
                    }}>
                      {post.title}
                    </h3>
                    <p style={{
                      fontFamily: 'var(--sans)', fontSize: '0.76rem',
                      color: 'var(--muted)', lineHeight: 1.65, flex: 1,
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical' as const,
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    } as React.CSSProperties}>
                      {post.excerpt}
                    </p>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      marginTop: '0.25rem', color: 'var(--forest)',
                    }}>
                      <span style={{
                        fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}>Leer artículo</span>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
