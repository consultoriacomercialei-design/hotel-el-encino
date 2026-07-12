'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';

/* ─────────────────────────────────────────────────────────
 * ScrollReveal
 * Elements fade + translate in as they enter, out as they leave.
 * Exactly like Apple product pages — tied to scroll progress.
 * ───────────────────────────────────────────────────────── */
interface ScrollRevealProps {
  children: React.ReactNode;
  /* Fraction of element visible before animation starts (0–1) */
  threshold?: number;
  /* How much the element moves (px) on enter/exit */
  distance?: number;
  /* Delay between siblings when used in a staggered list */
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
  /* 'both' = enter + exit animation | 'enter' = only on enter */
  mode?: 'both' | 'enter';
  as?: 'div' | 'section' | 'article' | 'p' | 'h2' | 'h3' | 'span';
}

export function ScrollReveal({
  children,
  distance = 48,
  delay = 0,
  style,
  className,
  mode = 'both',
  as = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 95%', 'end 5%'],
  });

  // Smooth the raw scroll value for silky motion
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.5 });

  const opacityPoints = mode === 'both'
    ? [0, 0.18, 0.82, 1]
    : [0, 0.22, 1, 1];

  const yPoints = mode === 'both'
    ? [distance, 0, 0, -distance * 0.6]
    : [distance, 0, 0, 0];

  const opacity = useTransform(smooth, opacityPoints, [0, 1, 1, 0]);
  const y = useTransform(smooth, opacityPoints, yPoints);

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{ opacity, y, willChange: 'transform, opacity', ...style } as React.CSSProperties}
      className={className}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ─────────────────────────────────────────────────────────
 * ParallaxLayer
 * Moves at a fraction of scroll speed — depth/parallax effect.
 * speed: 0 = no movement, 0.5 = half speed, -0.3 = reverse
 * ───────────────────────────────────────────────────────── */
interface ParallaxLayerProps {
  children: React.ReactNode;
  speed?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function ParallaxLayer({ children, speed = 0.3, style, className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 40, damping: 18, mass: 0.6 });
  const y = useTransform(smooth, [0, 1], [`${-speed * 100}px`, `${speed * 100}px`]);

  return (
    <motion.div
      ref={ref}
      style={{ y, willChange: 'transform', ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
 * ScrollFade
 * Lighter version — only opacity, no movement.
 * Good for background elements or images.
 * ───────────────────────────────────────────────────────── */
export function ScrollFade({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 90%', 'end 10%'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 50, damping: 18 });
  const opacity = useTransform(smooth, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, ...style }}>
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
 * useScrollValue — expose raw scroll progress for custom use
 * ───────────────────────────────────────────────────────── */
export function useScrollValue(): {
  ref: React.RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return { ref, progress: scrollYProgress };
}
