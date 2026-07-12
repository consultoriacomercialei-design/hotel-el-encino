'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackCtaClick } from '@/app/lib/analytics';

/* ─────────────────────────────────────────────────────────────────────────
 * iOS 26 Liquid Glass pill
 *
 * The "glass" look comes from the box-shadow stack that creates the
 * illusion of a thick curved glass wall — like looking at a glass tube.
 * The interior is nearly transparent; the edge catches light.
 *
 * Animation: clean spring drop from the navbar bottom.
 * No exaggerated squash/stretch — the material IS the effect.
 * ───────────────────────────────────────────────────────────────────────── */

const GLASS_CSS = `
/* ── Specular sweep — fires once when pill lands ── */
@keyframes _sweep {
  from { transform: translateX(-140%); opacity: 0;   }
  30%  { opacity: 0.7; }
  to   { transform: translateX(240%);  opacity: 0;   }
}
._sweep {
  position: absolute; inset: -1px; width: 38%;
  background: linear-gradient(95deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
  border-radius: inherit; pointer-events: none;
  animation: _sweep 0.6s 0.1s ease-out both;
}

/* ── Counter entrance ── */
@keyframes _countIn {
  from { transform: scale(0.2); opacity: 0; filter: blur(6px); }
  to   { transform: scale(1);   opacity: 1; filter: blur(0); }
}
._countIn {
  display: inline-block;
  animation: _countIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
}
`;

function Counter({ target }: { target: number }) {
  const [val, setVal]       = useState(0);
  const [show, setShow]     = useState(false);
  const started             = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    setShow(true);
    const duration = 1500, step = 16;
    let cur = 0;
    const inc = target / (duration / step);
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, step);
    return () => clearInterval(t);
  }, [target]);

  if (target === 0) return <span style={{ opacity: 0.4 }}>—</span>;
  return <span key={show ? 'v' : 'd'} className={show ? '_countIn' : ''}>{val.toLocaleString('es-MX')}</span>;
}

/* ── Icons ── */
const IgIcon  = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const FbIcon  = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const MapIcon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────
 * True liquid glass: heavy blur absorbs background colors, minimal fill.
 * Same material for pill AND panel → consistent with navbar/header look.
 * ───────────────────────────────────────────────────────────────────── */
const LG: React.CSSProperties = {
  background:           'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.12) 100%)',
  backdropFilter:       'blur(48px) saturate(180%) brightness(1.05)',
  WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.05)',
  border:               '1px solid rgba(255,255,255,0.38)',
  boxShadow:            'inset 0 0.5px 0 rgba(255,255,255,0.80), 0 8px 32px rgba(0,0,0,0.14)',
};

const LG_PANEL: React.CSSProperties = { ...LG };

/* ── Detect luminance of the background BEHIND the pill ─────────────────
 * Uses elementsFromPoint (returns all stacked elements) so we can skip
 * the pill itself and read the actual page background color.
 * Returns 0 (dark) … 1 (light); threshold 0.35 = flip to dark text.
 * ─────────────────────────────────────────────────────────────────────── */
function bgLuminance(pillSelector: string): number {
  const x = window.innerWidth  / 2;
  const y = 78 + 18;                          // pill center-y (top:78px + half height 18)
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.closest(pillSelector)) continue;   // skip the pill & its wrappers
    const bg = window.getComputedStyle(el).backgroundColor;
    const m  = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) continue;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    if (r === 0 && g === 0 && b === 0) continue;   // transparent/unset
    // WCAG relative luminance
    return [r, g, b].reduce((lum, c, i) => {
      const s   = c / 255;
      const lin = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      return lum + lin * [0.2126, 0.7152, 0.0722][i];
    }, 0);
  }
  return 0;  // assume dark if nothing found
}

export default function SocialFloat() {
  const [anchored, setAnchored] = useState(false);
  const [lightBg,  setLightBg]  = useState(false);
  const [counts, setCounts]     = useState({ instagram: 0, facebook: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const sample = () => {
      const y  = window.scrollY;
      const vh = window.innerHeight;
      const nowAnchored = y > vh * 0.35;
      setAnchored(nowAnchored);
      if (nowAnchored) {
        // rAF so DOM is painted before we sample
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setLightBg(bgLuminance('[data-pill]') > 0.35);
        });
      } else {
        setLightBg(false);
      }
    };
    window.addEventListener('scroll', sample, { passive: true });
    sample();
    return () => { window.removeEventListener('scroll', sample); cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    fetch('/api/social').then(r => r.json())
      .then(d => { if (d.instagram || d.facebook) setCounts(d); })
      .catch(() => {});
  }, []);

  /* text color adapts: white over hero (dark), ink over page content (light) */
  const textColor  = lightBg ? 'rgba(15,15,15,0.82)'  : 'rgba(255,255,255,0.88)';
  const mutedColor = lightBg ? 'rgba(15,15,15,0.45)'  : 'rgba(255,255,255,0.45)';
  const hoverColor = lightBg ? 'rgba(15,15,15,1)'     : '#fff';
  const divColor   = lightBg ? 'rgba(0,0,0,0.15)'     : 'rgba(255,255,255,0.22)';

  const link = (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    color: textColor, textDecoration: 'none',
    fontFamily: 'var(--sans)', fontSize: '0.68rem', fontWeight: 500,
    letterSpacing: '0.02em', padding: '0 12px', height: '100%',
    transition: 'color 0.3s',
  });

  return (
    <>
      <style>{GLASS_CSS}</style>

      <AnimatePresence mode="wait">

        {/* ── ANCHORED PILL ─────────────────────────────────────────────── */}
        {anchored && (
          <div key="wrap" data-pill style={{
            position: 'fixed', top: '78px', left: 0, right: 0,
            zIndex: 45, display: 'flex', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <motion.div
              key="anchored"
              initial={{ y: -44, scale: 0.08, opacity: 0 }}
              animate={{ y: 0,   scale: 1,    opacity: 1 }}
              exit={{    y: -24, scale: 0.5,  opacity: 0,
                transition: { duration: 0.2, ease: 'easeIn' } }}
              transition={{
                type: 'spring',
                stiffness: 380, damping: 26, mass: 0.9,
                scale:   { stiffness: 300, damping: 22, mass: 1.1 },
                opacity: { duration: 0.1 },
              }}
              style={{
                pointerEvents: 'auto',
                transformOrigin: 'top center',
                ...LG,
                borderRadius: '999px',
                height: '36px',
                display: 'flex', alignItems: 'center',
                padding: '0 4px',
                overflow: 'visible',
                whiteSpace: 'nowrap',
                position: 'relative',
                color: textColor,
                transition: 'color 0.3s',
              }}
            >
              {/* specular sweep on entry */}
              <span className="_sweep" aria-hidden />

              <a href="https://www.instagram.com/elencinohospedaje"
                target="_blank" rel="noopener noreferrer"
                style={link()}
                onClick={() => trackCtaClick('instagram', 'social_pill')}
                onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                onMouseLeave={e => (e.currentTarget.style.color = textColor)}
              >
                <IgIcon /><Counter target={counts.instagram} />
                <span style={{ color: mutedColor, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.3s' }}>seg.</span>
              </a>

              <div style={{ width: '1px', height: '16px', background: divColor, flexShrink: 0, transition: 'background 0.3s' }} />

              <a href="https://www.facebook.com/hotelencinosantiago"
                target="_blank" rel="noopener noreferrer"
                style={link()}
                onClick={() => trackCtaClick('facebook', 'social_pill')}
                onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                onMouseLeave={e => (e.currentTarget.style.color = textColor)}
              >
                <FbIcon /><Counter target={counts.facebook} />
                <span style={{ color: mutedColor, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.3s' }}>seg.</span>
              </a>

              <div style={{ width: '1px', height: '16px', background: divColor, flexShrink: 0, transition: 'background 0.3s' }} />

              <a href="https://www.google.com/maps/place/Hotel+El+Encino+Santiago/@25.4219673,-100.1599007,17z"
                target="_blank" rel="noopener noreferrer"
                style={{ ...link(), color: mutedColor, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                onMouseLeave={e => (e.currentTarget.style.color = mutedColor)}
              >
                <MapIcon />Maps
              </a>
            </motion.div>
          </div>
        )}

        {/* ── FLOATING PANEL (hero, right side) ────────────────────────── */}
        {!anchored && (
          <motion.div
            key="float"
            initial={{ opacity: 0, x: 40, scale: 0.3 }}
            animate={{ opacity: 1, x: 0,  scale: 1   }}
            exit={{    opacity: 0, x: 28, scale: 0.5,
              transition: { duration: 0.22 } }}
            transition={{
              type: 'spring', stiffness: 320, damping: 26, mass: 0.85,
              opacity: { duration: 0.18 },
            }}
            className="social-float-panel"
            style={{
              position: 'fixed', right: '1.25rem', top: '30%', zIndex: 40,
              ...LG_PANEL,
              borderRadius: '20px',
              display: 'flex', flexDirection: 'column',
              transformOrigin: 'top right',
            }}
          >
            {['instagram','facebook','maps'].map((net, i) => {
              const isIG   = net === 'instagram';
              const isFB   = net === 'facebook';
              const isMaps = net === 'maps';
              return (
                <div key={net}>
                  {i > 0 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 12px' }} />}
                  <a
                    href={isIG   ? 'https://www.instagram.com/elencinohospedaje'
                        : isFB   ? 'https://www.facebook.com/hotelencinosantiago'
                        : 'https://www.google.com/maps/place/Hotel+El+Encino+Santiago/@25.4219673,-100.1599007,17z'}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => trackCtaClick(isIG ? 'instagram' : isFB ? 'facebook' : 'website', 'social_panel')}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '4px', padding: isMaps ? '12px 18px' : '14px 18px',
                      color: isMaps ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)',
                      textDecoration: 'none', transition: 'background 0.25s, color 0.25s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isMaps ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)'; }}
                  >
                    {isIG && <><IgIcon s={15}/><span style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', fontWeight: 500, lineHeight: 1 }}><Counter target={counts.instagram}/></span><span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, lineHeight: 1 }}>seguidores</span></>}
                    {isFB && <><FbIcon s={15}/><span style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', fontWeight: 500, lineHeight: 1 }}><Counter target={counts.facebook}/></span><span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, lineHeight: 1 }}>seguidores</span></>}
                    {isMaps && <><MapIcon s={15}/><span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, lineHeight: 1 }}>mapa</span></>}
                  </a>
                </div>
              );
            })}
          </motion.div>
        )}

      </AnimatePresence>
    </>
  );
}
