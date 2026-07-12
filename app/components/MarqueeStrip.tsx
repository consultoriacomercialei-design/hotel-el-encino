'use client';

/* ─────────────────────────────────────────────────────────
 * MarqueeStrip
 * Continuous horizontal scrolling text separator.
 * Seen in heliasoils.com, petertarka.com, editorial luxury sites.
 * Alternates upright text + italic "·" diamonds.
 * ───────────────────────────────────────────────────────── */

interface Props {
  items?: string[];
  speed?: number;      /* seconds for full loop — higher = slower */
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  borderTop?: boolean;
  borderBottom?: boolean;
}

const SIZE_MAP = {
  sm: '0.68rem',
  md: 'clamp(0.78rem, 1.3vw, 0.95rem)',
  lg: 'clamp(1rem, 2vw, 1.4rem)',
};

export default function MarqueeStrip({
  items = ['Santiago', 'Naturaleza', 'Descanso', 'Hotel El Encino', 'Nuevo León', 'Aventura'],
  speed = 28,
  size = 'md',
  theme = 'light',
  borderTop = true,
  borderBottom = true,
}: Props) {
  const ink = theme === 'light' ? 'var(--ink)' : 'var(--paper)';
  const bg  = theme === 'light' ? 'var(--paper)' : 'var(--forest)';
  const border = theme === 'light' ? '1px solid var(--border)' : '1px solid rgba(255,255,255,0.08)';
  const mutedColor = theme === 'light' ? 'var(--warm)' : 'rgba(168,130,84,0.8)';

  /* Duplicate for seamless loop */
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div style={{
      overflow: 'hidden',
      background: bg,
      borderTop: borderTop ? border : undefined,
      borderBottom: borderBottom ? border : undefined,
      padding: '0.9rem 0',
      userSelect: 'none',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        animation: `marquee-roll ${speed}s linear infinite`,
      }}>
        {repeated.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.2rem', paddingRight: '1.2rem' }}>
            <span style={{
              fontFamily: 'var(--serif-italic)',
              fontStyle: 'italic',
              fontSize: SIZE_MAP[size],
              color: ink,
              letterSpacing: '0.01em',
            }}>
              {item}
            </span>
            <span style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.5rem',
              color: mutedColor,
              letterSpacing: '0.06em',
            }}>
              ✦
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-roll {
          from { transform: translateX(0); }
          to   { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  );
}
