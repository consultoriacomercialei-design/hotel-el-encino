'use client';

import { useState, useEffect } from 'react';

interface ScoreRow {
  rank: number;
  display_name: string;
  avatar_emoji: string;
  score_seconds: number;
  completed_at: string;
}

interface Props {
  gameSlug: string;
  gameName: string;
  myScore?: number | null;
  refreshKey?: number;
}

function fmt(s: number) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const RANK_GLOW = [
  'rgba(212,168,83,0.22)',   // gold
  'rgba(180,180,200,0.14)',  // silver
  'rgba(180,110,60,0.14)',   // bronze
];
const RANK_BORDER = [
  'rgba(212,168,83,0.45)',
  'rgba(180,180,200,0.25)',
  'rgba(180,110,60,0.25)',
];

export default function GameLeaderboard({ gameSlug, gameName, myScore, refreshKey }: Props) {
  const [data, setData]     = useState<{ leaderboard: ScoreRow[]; myBest: number | null }>({ leaderboard: [], myBest: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/scores?game=${encodeURIComponent(gameSlug)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gameSlug, refreshKey]);

  const best = myScore ?? data.myBest;

  return (
    <div style={{ userSelect: 'none' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🏆</span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.85)' }}>
            Ranking · {gameName}
          </span>
        </div>
        {best && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(42,180,90,0.12)', border: '1px solid rgba(42,180,90,0.28)',
            borderRadius: '999px', padding: '4px 12px',
          }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(80,220,130,0.75)' }}>Tu mejor</span>
            <span style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', fontWeight: 700, color: 'rgba(80,220,130,0.95)' }}>{fmt(best)}</span>
          </div>
        )}
      </div>

      {loading ? (
        /* Skeleton rows */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: '48px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              animation: 'lb-pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
          <style>{`@keyframes lb-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.08} }`}</style>
        </div>
      ) : data.leaderboard.length === 0 ? (
        /* Empty state */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
          padding: '2rem 1rem', borderRadius: '16px',
          background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)',
        }}>
          <span style={{ fontSize: '2rem', lineHeight: 1, filter: 'grayscale(0.3)' }}>🏆</span>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>
            Nadie en el top todavía
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.32)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            Completa el juego y ocupa el #1 de Santiago
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {data.leaderboard.map((row) => {
            const isTop3 = row.rank <= 3;
            const idx    = row.rank - 1;
            return (
              <div key={row.rank} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: isTop3 ? '10px 14px' : '8px 14px',
                borderRadius: isTop3 ? '14px' : '10px',
                background: isTop3 ? RANK_GLOW[idx] : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isTop3 ? RANK_BORDER[idx] : 'rgba(255,255,255,0.07)'}`,
                boxShadow: row.rank === 1 ? '0 4px 20px rgba(212,168,83,0.15)' : 'none',
                transition: 'background 0.2s',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Specular shimmer for #1 */}
                {row.rank === 1 && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                    background: 'linear-gradient(90deg, transparent 10%, rgba(255,215,100,0.6) 50%, transparent 90%)',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Rank badge */}
                <div style={{
                  minWidth: isTop3 ? '28px' : '22px',
                  textAlign: 'center',
                  fontSize: isTop3 ? '1.2rem' : '0.65rem',
                  fontFamily: 'var(--sans)', fontWeight: 700,
                  color: 'rgba(255,255,255,0.35)',
                  lineHeight: 1,
                }}>
                  {isTop3 ? MEDAL[idx] : `#${row.rank}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: isTop3 ? '32px' : '26px', height: isTop3 ? '32px' : '26px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: isTop3 ? '1.1rem' : '0.85rem', lineHeight: 1, flexShrink: 0,
                }}>
                  {row.avatar_emoji || '🎮'}
                </div>

                {/* Name */}
                <span style={{
                  fontFamily: 'var(--sans)',
                  fontSize: isTop3 ? '0.82rem' : '0.76rem',
                  fontWeight: row.rank === 1 ? 700 : isTop3 ? 600 : 400,
                  color: row.rank === 1 ? 'rgba(255,225,140,0.95)' : isTop3 ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.52)',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.display_name}
                </span>

                {/* Time */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--sans)',
                    fontSize: isTop3 ? '0.88rem' : '0.76rem',
                    fontWeight: row.rank === 1 ? 800 : 600,
                    color: row.rank === 1 ? 'rgba(212,168,83,1)' : isTop3 ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.02em',
                  }}>
                    {fmt(row.score_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
