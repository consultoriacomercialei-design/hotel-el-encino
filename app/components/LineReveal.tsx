'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/* ─────────────────────────────────────────────────────────
 * LineReveal — word-by-word slide-up from below
 * The classic editorial reveal: each word lives in an
 * overflow:hidden container and slides up into view.
 * Seen in heliasoils.com, naya-studio-dubai, petertarka.
 * ───────────────────────────────────────────────────────── */
interface Props {
  /** Plain string to split into words */
  text: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  delay?: number;
  stagger?: number;
  /** px — how far each word travels (default 110%) */
  distance?: string;
  style?: React.CSSProperties;
  /** Style applied to each word's inner span */
  wordStyle?: React.CSSProperties;
  margin?: string;
}

export function LineReveal({
  text,
  tag: Tag = 'h2',
  delay = 0,
  stagger = 0.055,
  distance = '108%',
  style,
  wordStyle,
  margin = '-80px',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin } as Parameters<typeof useInView>[1]);

  const words = text.split(' ');

  return (
    <div ref={ref} style={style}>
      <Tag style={{
        display: 'flex', flexWrap: 'wrap',
        gap: '0 0.28em',
        ...wordStyle,
      } as React.CSSProperties}>
        {words.map((word, i) => (
          <span
            key={i}
            style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 'inherit' }}
          >
            <motion.span
              style={{ display: 'inline-block' }}
              initial={{ y: distance }}
              animate={inView ? { y: '0%' } : { y: distance }}
              transition={{
                duration: 0.80,
                delay: delay + i * stagger,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </Tag>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * MultiLineReveal — line-by-line reveal for complex headings
 * Pass each line as a separate item in `lines`.
 * Supports mixing plain strings and JSX (for italic em, etc.)
 * ───────────────────────────────────────────────────────── */
interface MultiLineProps {
  lines: React.ReactNode[];
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  lineStyle?: React.CSSProperties;
  margin?: string;
}

export function MultiLineReveal({
  lines,
  delay = 0,
  stagger = 0.15,
  style,
  lineStyle,
  margin = '-80px',
}: MultiLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin } as Parameters<typeof useInView>[1]);

  return (
    <div ref={ref} style={style}>
      {lines.map((line, i) => (
        <div key={i} style={{ overflow: 'hidden', display: 'block', lineHeight: 'inherit' }}>
          <motion.div
            style={{ display: 'block', ...lineStyle }}
            initial={{ y: '105%' }}
            animate={inView ? { y: '0%' } : { y: '105%' }}
            transition={{
              duration: 0.85,
              delay: delay + i * stagger,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {line}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * CoverReveal — image reveal via a sweeping cover overlay
 * The cover element slides out (left, right, up, or down)
 * exposing the content beneath — classic editorial transition.
 * ───────────────────────────────────────────────────────── */
interface CoverRevealProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  color?: string;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
  margin?: string;
}

export function CoverReveal({
  children,
  direction = 'right',
  color = 'var(--warm)',
  delay = 0,
  duration = 0.85,
  style,
  margin = '-60px',
}: CoverRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin } as Parameters<typeof useInView>[1]);

  const exitMap: Record<string, { x?: string; y?: string }> = {
    left:  { x: '-101%' },
    right: { x: '101%' },
    up:    { y: '-101%' },
    down:  { y: '101%' },
  };

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {children}
      {/* Sweeping cover */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: color,
          transformOrigin: direction === 'right' ? 'left center'
            : direction === 'left' ? 'right center'
            : direction === 'down' ? 'top center'
            : 'bottom center',
          zIndex: 2,
        }}
        initial={{ x: 0, y: 0 }}
        animate={inView ? exitMap[direction] : { x: 0, y: 0 }}
        transition={{
          duration,
          delay,
          ease: [0.77, 0, 0.175, 1],
        }}
      />
    </div>
  );
}
