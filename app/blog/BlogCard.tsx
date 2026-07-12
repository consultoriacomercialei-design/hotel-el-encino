'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { BlogPost } from './data';

interface BlogCardProps {
  post: BlogPost;
  index?: number;
  theme?: 'dark' | 'light';
  size?: 'normal' | 'featured';
}

export default function BlogCard({ post, index = 0, theme = 'dark', size = 'normal' }: BlogCardProps) {
  const isDark = theme === 'dark';
  const isFeatured = size === 'featured';

  const formattedDate = new Date(post.publishedAt + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.07) 100%)'
          : '#fff',
        border: isDark
          ? '1px solid rgba(255,255,255,0.12)'
          : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark
          ? 'inset 0 0.5px 0 rgba(255,255,255,0.20)'
          : '0 2px 20px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Cover image */}
        <div style={{
          position: 'relative',
          aspectRatio: isFeatured ? '16/9' : '3/2',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <Image
            src={post.coverImage}
            alt={post.coverAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
            style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(6,14,12,0.65) 0%, transparent 55%)',
          }} />
          {/* Category badge */}
          <div style={{
            position: 'absolute', top: '0.75rem', left: '0.75rem',
            background: isDark
              ? 'rgba(133,109,71,0.80)'
              : 'rgba(13,34,30,0.78)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 12px',
          }}>
            <span style={{
              fontFamily: 'var(--sans)', fontSize: '0.55rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
            }}>
              {post.category}
            </span>
          </div>
          {/* Read time */}
          <div style={{
            position: 'absolute', bottom: '0.75rem', right: '0.75rem',
            fontFamily: 'var(--sans)', fontSize: '0.58rem',
            color: 'rgba(255,255,255,0.70)', letterSpacing: '0.06em',
          }}>
            {post.readTime} min de lectura
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: 'clamp(1rem, 2vw, 1.4rem)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          {/* Date */}
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isDark ? 'rgba(168,130,84,0.80)' : 'var(--warm)',
          }}>
            {formattedDate}
          </p>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--serif)',
            fontSize: isFeatured ? 'clamp(1.1rem, 2vw, 1.35rem)' : 'clamp(0.98rem, 1.8vw, 1.15rem)',
            fontWeight: 400,
            color: isDark ? 'var(--paper)' : 'var(--ink)',
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
            margin: 0,
          }}>
            {post.title}
          </h3>

          {/* Excerpt */}
          <p style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.78rem',
            color: isDark ? 'rgba(250,248,242,0.55)' : 'var(--muted)',
            lineHeight: 1.65,
            flex: 1,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical' as const,
            WebkitLineClamp: 3,
            overflow: 'hidden',
          } as React.CSSProperties}>
            {post.excerpt}
          </p>

          {/* Read more */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            marginTop: '0.25rem',
            color: isDark ? 'var(--warm)' : 'var(--forest)',
          }}>
            <span style={{
              fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Leer artículo
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
