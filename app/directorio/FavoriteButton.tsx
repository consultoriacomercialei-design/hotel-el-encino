'use client';

import { useState } from 'react';

interface Props {
  slug: string;
  initialFaved: boolean;
  onNeedAuth: () => void;
  loggedIn: boolean;
  onToggle?: (slug: string, faved: boolean) => void;
}

export default function FavoriteButton({ slug, initialFaved, onNeedAuth, loggedIn, onToggle }: Props) {
  const [faved, setFaved]     = useState(initialFaved);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst]     = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!loggedIn) { onNeedAuth(); return; }
    if (loading) return;
    setLoading(true);
    const willFav = !faved;
    try {
      if (willFav) {
        await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingSlug: slug }),
        });
        setBurst(true);
        setTimeout(() => setBurst(false), 600);
      } else {
        await fetch(`/api/user/favorites?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      }
      setFaved(willFav);
      onToggle?.(slug, willFav);
    } catch { /* fire-and-forget — optimistic UI still ok */ }
    finally { setLoading(false); }
  }

  return (
    <button
      onClick={toggle}
      title={faved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '32px', height: '32px', borderRadius: '50%',
        background: faved ? 'rgba(220,50,50,0.12)' : 'rgba(255,255,255,0.85)',
        border: faved ? '1.5px solid rgba(220,50,50,0.35)' : '1.5px solid rgba(0,0,0,0.10)',
        cursor: 'pointer', flexShrink: 0, backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transform: burst ? 'scale(1.35)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, border 0.2s',
        opacity: loading ? 0.7 : 1,
      } as React.CSSProperties}
    >
      <svg width="15" height="15" viewBox="0 0 24 24"
        fill={faved ? '#dc3232' : 'none'}
        stroke={faved ? '#dc3232' : 'rgba(0,0,0,0.5)'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}
