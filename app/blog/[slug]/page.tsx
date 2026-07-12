import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { blogPosts, getBlogPost, getRecentPosts } from '../data';
import BlogCard from '../BlogCard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    keywords: post.keywords,
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `https://hotelelencino.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.coverAlt }],
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getRecentPosts(6).filter(p => p.slug !== post.slug).slice(0, 3);
  const formattedDate = new Date(post.publishedAt + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const schemaArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    image: `https://hotelelencino.com${post.coverImage}`,
    url: `https://hotelelencino.com/blog/${post.slug}`,
    author: {
      '@type': 'Organization',
      name: 'Hotel El Encino Santiago',
      url: 'https://hotelelencino.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hotel El Encino Santiago',
      url: 'https://hotelelencino.com',
      logo: { '@type': 'ImageObject', url: 'https://hotelelencino.com/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://hotelelencino.com/blog/${post.slug}` },
    keywords: post.keywords.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaArticle) }}
      />

      <style>{`
        .blog-prose h2 {
          font-family: var(--serif);
          font-size: clamp(1.25rem, 2.5vw, 1.65rem);
          font-weight: 400;
          color: var(--paper);
          letter-spacing: -0.02em;
          line-height: 1.25;
          margin: 2.5rem 0 0.85rem;
        }
        .blog-prose h3 {
          font-family: var(--serif-italic);
          font-style: italic;
          font-size: clamp(1.05rem, 2vw, 1.28rem);
          font-weight: 400;
          color: rgba(250,248,242,0.88);
          letter-spacing: -0.015em;
          margin: 2rem 0 0.65rem;
        }
        .blog-prose p {
          font-family: var(--sans);
          font-size: clamp(0.88rem, 1.8vw, 1rem);
          color: rgba(250,248,242,0.72);
          line-height: 1.80;
          margin: 0 0 1.1rem;
        }
        .blog-prose ul, .blog-prose ol {
          padding-left: 1.5rem;
          margin: 0 0 1.25rem;
        }
        .blog-prose li {
          font-family: var(--sans);
          font-size: clamp(0.85rem, 1.7vw, 0.95rem);
          color: rgba(250,248,242,0.68);
          line-height: 1.75;
          margin-bottom: 0.4rem;
        }
        .blog-prose li strong {
          color: rgba(250,248,242,0.92);
        }
        .blog-prose strong {
          color: rgba(250,248,242,0.92);
          font-weight: 600;
        }
        .blog-prose em {
          color: var(--warm);
          font-style: normal;
        }
        .blog-prose blockquote {
          border-left: 3px solid rgba(168,130,84,0.60);
          margin: 2rem 0;
          padding: 1.1rem 1.5rem;
          background: rgba(133,109,71,0.08);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
        }
        .blog-prose blockquote p {
          font-family: var(--serif-italic);
          font-style: italic;
          font-size: clamp(0.95rem, 2vw, 1.15rem);
          color: rgba(250,248,242,0.82);
          margin: 0;
          line-height: 1.6;
        }
        .blog-prose a {
          color: var(--warm);
          text-underline-offset: 3px;
        }
        .blog-prose a:hover { opacity: 0.82; }
      `}</style>

      <main style={{ background: 'var(--forest)', minHeight: '100dvh' }}>

        {/* ── Hero image ── */}
        <div style={{ position: 'relative', height: 'clamp(260px, 45vw, 520px)', overflow: 'hidden' }}>
          <Image
            src={post.coverImage}
            alt={post.coverAlt}
            fill
            priority
            sizes="100vw"
            quality={90}
            style={{ objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,34,30,0.30) 0%, rgba(13,34,30,0.20) 50%, rgba(13,34,30,0.90) 100%)',
          }} />
        </div>

        {/* ── Article container ── */}
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 clamp(1.25rem, 4vw, 2.5rem)' }}>

          {/* Breadcrumb + meta — floats over image */}
          <div style={{ marginTop: '-4rem', position: 'relative', zIndex: 2 }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <Link href="/" style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
              }}>Hotel El Encino</Link>
              <span style={{ color: 'rgba(255,255,255,0.22)' }}>›</span>
              <Link href="/blog" style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
              }}>Blog</Link>
              <span style={{ color: 'rgba(255,255,255,0.22)' }}>›</span>
              <span style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(168,130,84,0.85)',
              }}>{post.category}</span>
            </nav>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
              fontWeight: 400,
              color: 'var(--paper)',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              marginBottom: '1.25rem',
            }}>
              {post.title}
            </h1>

            {/* Meta strip */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              marginBottom: '2.5rem',
            }}>
              <span style={{
                fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(168,130,84,0.80)',
                background: 'rgba(133,109,71,0.15)',
                border: '1px solid rgba(133,109,71,0.30)',
                padding: '4px 12px', borderRadius: 'var(--radius-pill)',
              }}>
                {post.category}
              </span>
              <span style={{
                fontFamily: 'var(--sans)', fontSize: '0.65rem',
                color: 'rgba(250,248,242,0.40)', letterSpacing: '0.04em',
              }}>
                {formattedDate}
              </span>
              <span style={{
                fontFamily: 'var(--sans)', fontSize: '0.65rem',
                color: 'rgba(250,248,242,0.40)', letterSpacing: '0.04em',
              }}>
                {post.readTime} min de lectura
              </span>
            </div>
          </div>

          {/* Article content */}
          <article
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* ── In-article CTA ── */}
          <div style={{
            margin: '3rem 0',
            background: 'linear-gradient(160deg, rgba(133,109,71,0.15) 0%, rgba(133,109,71,0.06) 100%)',
            border: '1px solid rgba(133,109,71,0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(1.5rem, 3vw, 2rem)',
            display: 'flex', flexWrap: 'wrap', gap: '1.25rem',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.4rem',
              }}>
                Planea tu visita a Santiago
              </p>
              <p style={{
                fontFamily: 'var(--serif-italic)', fontStyle: 'italic',
                fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(250,248,242,0.88)', lineHeight: 1.25,
                margin: 0,
              }}>
                Hotel El Encino — centro histórico, a minutos de todo
              </p>
            </div>
            <a
              href="/#reservar"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none',
                background: 'var(--paper)', padding: '12px 22px',
                borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Reservar →
            </a>
          </div>

          {/* Also see — directorio */}
          <div style={{
            marginBottom: '3rem',
            padding: '1.25rem 1.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: '0.72rem',
              color: 'rgba(250,248,242,0.55)', margin: 0, flex: 1, lineHeight: 1.5,
            }}>
              ¿Buscas restaurantes, tours y más en Santiago?
            </p>
            <Link href="/directorio" style={{
              fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--warm)', textDecoration: 'none',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              Ver directorio →
            </Link>
          </div>
        </div>

        {/* ── Related posts ── */}
        {related.length > 0 && (
          <section style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: 'clamp(3rem, 5vw, 4rem) clamp(1.5rem, 5vw, 5rem) clamp(4rem, 8vw, 7rem)',
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1.75rem',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.6)', display: 'inline-block' }} />
                Más artículos que te pueden interesar
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: 'clamp(1rem, 2.5vw, 1.75rem)',
              }}>
                {related.map((p, i) => (
                  <BlogCard key={p.slug} post={p} index={i} theme="dark" />
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
    </>
  );
}
