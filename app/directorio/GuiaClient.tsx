'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { type Listing, type Category, CATEGORY_LABEL, CATEGORY_ICON } from './data';
import { type GuiaEvent, EVENT_CATEGORY_LABEL } from './events';
import { GuiaCard } from './GuiaCard';
import FeaturedCarousel, { SocialFollowersCompact } from './FeaturedCarousel';
import { trackDirectorySearch, trackCategoryFilter } from '../lib/analytics';
import { getRecentPosts } from '../blog/data';
import BlogCard from '../blog/BlogCard';
import UserAuthModal from './UserAuthModal';
import FavoriteButton from './FavoriteButton';
import UserDashboard from './UserDashboard';

const MiniGamesSection = dynamic(() => import('./games/MiniGamesSection'), { ssr: false });
const InstallPrompt    = dynamic(() => import('../components/InstallPrompt'), { ssr: false });

const MapaTab = dynamic(() => import('./MapaTab'), { ssr: false });

interface Props {
  listings: Listing[];
  events: GuiaEvent[];
}

type Tab = 'directorio' | 'eventos' | 'mapa' | 'blog';

/* ─── Helpers ────────────────────────────────────────────── */

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  if (startDate === endDate) return start.toLocaleDateString('es-MX', opts);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.toLocaleDateString('es-MX', opts)}`;
  }
  return `${start.toLocaleDateString('es-MX', opts)} – ${end.toLocaleDateString('es-MX', opts)}`;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/* ─── Event Card ─────────────────────────────────────────── */
function EventCard({ event }: { event: GuiaEvent }) {
  const days = getDaysUntil(event.startDate);
  const urgency = days <= 7 ? 'urgent' : days <= 30 ? 'soon' : 'future';
  const urgencyColor = urgency === 'urgent' ? '#e05e3c' : urgency === 'soon' ? 'var(--warm)' : 'var(--muted)';

  return (
    <article style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Photo */}
      <div style={{ position: 'relative', aspectRatio: '16/9' }}>
        <Image
          src={event.src} alt={event.alt} fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={80}
          style={{ objectFit: 'cover' }}
        />
        {/* Date badge */}
        <div style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem',
          background: 'rgba(13,34,30,0.82)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 'var(--radius-md)', padding: '6px 12px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1px',
          }}>
            {new Date(event.startDate + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
          </p>
          <p style={{
            fontFamily: 'var(--serif)', fontSize: '1.4rem', color: 'var(--paper)',
            lineHeight: 1, fontWeight: 400,
          }}>
            {new Date(event.startDate + 'T12:00:00').getDate()}
          </p>
        </div>
        {event.tag && (
          <div style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: urgency === 'urgent'
              ? 'rgba(224,94,60,0.88)'
              : 'rgba(133,109,71,0.85)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--sans)', fontSize: '0.6rem',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: 'var(--paper)',
          }}>
            {event.tag}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 'clamp(1rem, 2vw, 1.4rem)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{
          fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.35rem',
        }}>
          {EVENT_CATEGORY_LABEL[event.category]}
        </p>
        <h3 style={{
          fontFamily: 'var(--serif)', fontSize: '1.15rem', fontWeight: 400,
          color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: '0.5rem',
          lineHeight: 1.3,
        }}>
          {event.title}
        </h3>
        <p style={{
          fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)',
          lineHeight: 1.6, marginBottom: '1rem', flex: 1,
        }}>
          {event.shortDesc}
        </p>

        {/* Meta row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
          paddingTop: '0.75rem', borderTop: '1px solid var(--border)',
        }}>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: '0.7rem',
            color: urgencyColor, fontWeight: 500,
          }}>
            {formatDateRange(event.startDate, event.endDate)}
            {event.time && ` · ${event.time}h`}
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'var(--muted)' }}>
            {event.price}
          </span>
        </div>
        {event.organizer && (
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'rgba(0,0,0,0.32)',
            marginTop: '0.35rem',
          }}>
            Por: {event.organizer}
          </p>
        )}
      </div>
    </article>
  );
}

/* ─── Tier Showcase ──────────────────────────────────────── */
function TierShowcase() {
  return (
    <div style={{
      background: 'var(--forest)',
      borderRadius: 'var(--radius-lg)',
      padding: 'clamp(1.5rem, 3vw, 2.25rem)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Organic accent */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(133,109,71,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.5rem',
          }}>
            ¿Tienes un negocio en Santiago?
          </p>
          <p style={{
            fontFamily: 'var(--serif-italic)', fontSize: 'clamp(1rem, 2vw, 1.3rem)',
            fontStyle: 'italic', color: 'rgba(250,250,250,0.92)', lineHeight: 1.3,
            marginBottom: '1rem',
          }}>
            Aparece en el directorio —<br />completamente gratis para empezar
          </p>
          {/* Value props */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {['Restaurantes', 'Tours', 'Tiendas', 'Servicios', 'Experiencias'].map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.10)',
                padding: '3px 10px', borderRadius: 'var(--radius-pill)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href="/mi-negocio/registro"
            className="guia-anunciate-pill"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none',
              background: 'var(--paper)', padding: '12px 24px',
              borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
            }}
          >
            Anúnciate gratis
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a
            href="/mi-negocio/login"
            style={{
              fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)',
              textDecoration: 'none', paddingLeft: '4px',
            }}
          >
            Ya tengo cuenta →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── User context type ───────────────────────────────────── */
interface UserCtx {
  loggedIn: boolean;
  id?: string;
  email?: string;
  displayName?: string | null;
  avatarEmoji?: string;
  hasProfile?: boolean;
  isAdvertiser?: boolean;
  advertiserSlug?: string | null;
  sessionSource?: 'dir' | 'guia' | null;
}

/* ─── Main Component ─────────────────────────────────────── */
export default function GuiaClient({ listings, events }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('directorio');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  // ── User / Auth state ───────────────────────────────────
  const [userCtx, setUserCtx]         = useState<UserCtx>({ loggedIn: false });
  const [userLoaded, setUserLoaded]   = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [favorites, setFavorites]     = useState<Set<string>>(new Set());

  // Fetch user context once on mount
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then((d: UserCtx) => { setUserCtx(d); setUserLoaded(true); })
      .catch(() => setUserLoaded(true));
  }, []);

  // Fetch favorites when user is logged in
  useEffect(() => {
    if (!userCtx.loggedIn) { setFavorites(new Set()); return; }
    fetch('/api/user/favorites')
      .then(r => r.json())
      .then(d => setFavorites(new Set(d.favorites ?? [])))
      .catch(() => {});
  }, [userCtx.loggedIn]);

  function handleAuthSuccess() {
    setAuthModalOpen(false);
    // Reload user context
    fetch('/api/user/me').then(r => r.json()).then(setUserCtx).catch(() => {});
  }

  function handleLogout() {
    setUserCtx({ loggedIn: false });
    setFavorites(new Set());
  }

  function requestInstallPrompt() {
    window.dispatchEvent(new CustomEvent('encino:requestInstall'));
  }

  // Read URL params on first mount (from deep-links e.g. /directorio?cat=restaurantes&q=pizza)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const cat = params.get('cat') as Category | null;
    if (q) setSearchQuery(q);
    if (cat && cat in CATEGORY_LABEL) setActiveCategory(cat);
  }, []);

  // GA4: track search queries (debounced 1.2s)
  useEffect(() => {
    if (!searchQuery) return;
    const t = setTimeout(() => trackDirectorySearch(searchQuery), 1200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // GA4: track category filter changes
  useEffect(() => {
    if (activeCategory !== 'all') trackCategoryFilter(activeCategory);
  }, [activeCategory]);

  // All known categories (even if empty), plus counts
  const allCategories = Object.keys(CATEGORY_LABEL) as Category[];
  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of listings) map[l.category] = (map[l.category] ?? 0) + 1;
    return map;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return listings.filter(l => {
      const matchSearch = !q ||
        l.name.toLowerCase().includes(q) ||
        l.shortDesc.toLowerCase().includes(q) ||
        CATEGORY_LABEL[l.category].toLowerCase().includes(q);
      const matchCat = activeCategory === 'all' || l.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [listings, searchQuery, activeCategory]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events
      .filter(e => new Date(e.endDate + 'T23:59:59') >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events]);

  const showCarousel = !searchQuery && activeCategory === 'all';
  const recentListings = useMemo(() => listings.filter(l => l.isUserListing).slice(0, 4), [listings]);

  /**
   * carouselItems — curated list for "Lo mejor de Santiago":
   * 1. Featured/Hero DB listings (paid — they get priority)
   * 2. Classic landmark statics (Cola de Caballo, Matacanes, Presa La Boca…)
   * 3. Most recent free DB listings
   * Hotel El Encino is excluded here — it's hardcoded as the left card in FeaturedCarousel.
   */
  const carouselItems = useMemo(() => {
    const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const nonHotel = listings.filter(l => l.slug !== 'hotel-el-encino');

    // Priority 1: paid tiers (Hero / Destacado)
    const paid = nonHotel.filter(l => l.isUserListing && (l.tier === 'hero' || l.tier === 'featured'));

    // Priority 2: DB listings < 14 days old ("Nuevo") — cap at 3 slots
    const freshDb = nonHotel.filter(l =>
      l.isUserListing && l.tier === 'free' &&
      l.created_at && (now - new Date(l.created_at).getTime()) < TWO_WEEKS
    ).slice(0, 3);

    // Priority 3: older DB listings — rotate (newest first)
    const olderDb = nonHotel.filter(l =>
      l.isUserListing && l.tier === 'free' &&
      (!l.created_at || (now - new Date(l.created_at).getTime()) >= TWO_WEEKS)
    );

    // Landmark statics — used as fallback to fill remaining slots
    const landmarks = nonHotel.filter(l => !l.isUserListing);

    // Give landmarks at most 2 slots when any user listing exists
    const hasUserListings = paid.length + freshDb.length + olderDb.length > 0;
    const maxLandmarks = hasUserListings ? 2 : 4;

    const seen = new Set<string>();
    return [
      ...paid,
      ...freshDb,
      ...landmarks.slice(0, maxLandmarks),
      ...olderDb,           // older DB listings rotate in after landmarks
      ...landmarks.slice(maxLandmarks),
    ].filter(l => {
      if (seen.has(l.slug)) return false;
      seen.add(l.slug);
      return true;
    }).slice(0, 8);
  }, [listings]);

  const marqueeItems = useMemo(
    () => listings.filter(l => l.slug !== 'hotel-el-encino'),
    [listings]
  );

  /* ── Category scroll ─────────────────────────────────── */
  const catScrollRef = useRef<HTMLDivElement>(null);
  const [catPct, setCatPct] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const onCatScroll = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCatPct(max > 0 ? el.scrollLeft / max : 0);
    setCanLeft(el.scrollLeft > 6);
    setCanRight(el.scrollLeft < max - 6);
  }, []);

  const scrollCats = (dir: 'l' | 'r') =>
    catScrollRef.current?.scrollBy({ left: dir === 'r' ? 320 : -320, behavior: 'smooth' });

  return (
    <>
      <style>{`
        .guia-cat-pill:hover { background: var(--forest) !important; color: var(--paper) !important; border-color: var(--forest) !important; }
        .guia-hotel-cta:hover { background: var(--forest) !important; }
        .guia-anunciate-pill:hover { opacity: 0.82; }
      `}</style>

      <main style={{ background: 'var(--forest)', minHeight: '100dvh' }}>

        {/*
          Safe-area forest fill — sits BELOW the glass pill (z-index 49).
          iOS/Android backdrop-filter samples from the compositor backdrop, which can
          be the body background (white) instead of the main background (forest) when
          they're on different GPU layers. This opaque layer forces the blur to see
          forest, eliminating the white/gray strip at the top.
        */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'max(env(safe-area-inset-top, 0px), 12px)',
          background: 'var(--forest)',
          zIndex: 49,
          pointerEvents: 'none',
        }} />

        {/* ── Fixed glass pill — visible from load, floats over hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.2, 0, 0.1, 1] }}
          style={{
            position: 'fixed', top: 'max(10px, env(safe-area-inset-top))', left: 0, right: 0, zIndex: 50,
            display: 'flex', justifyContent: 'center',
            padding: '0 clamp(0.75rem, 3vw, 2rem)',
            pointerEvents: 'auto',
          }}
        >
          {/* Glass pill — darker over map for contrast, minimal on map tab */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: activeTab === 'mapa' ? 'rgba(13,34,30,0.88)' : 'rgba(13,34,30,0.18)',
            backdropFilter: 'blur(28px) saturate(200%) brightness(0.95)',
            WebkitBackdropFilter: 'blur(28px) saturate(200%) brightness(0.95)',
            borderRadius: '22px',
            border: '1px solid rgba(255,255,255,0.16)',
            borderTop: '1px solid rgba(255,255,255,0.28)',
            boxShadow: activeTab === 'mapa'
              ? '0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'
              : '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
            overflow: 'hidden',
            maxWidth: '680px', width: '100%',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}>

            {/* Row 1: Directorio | Eventos | Mapa | Blog */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 6px 6px', gap: '4px' }}>
              {(
                [
                  { id: 'directorio' as Tab, label: 'Directorio', badge: null as number | null },
                  { id: 'eventos' as Tab, label: 'Eventos', badge: upcomingEvents.length > 0 ? upcomingEvents.length : null },
                  { id: 'mapa' as Tab, label: 'Mapa', badge: null as number | null },
                  { id: 'blog' as Tab, label: 'Blog', badge: null as number | null },
                ]
              ).map(({ id, label, badge }) => (
                <button
                  key={id}
                  className="guia-tab-btn"
                  onClick={() => setActiveTab(id)}
                  style={{
                    fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: 'pointer',
                    padding: '6px 14px', whiteSpace: 'nowrap', flexShrink: 0,
                    background: activeTab === id ? 'rgba(13,34,30,0.60)' : 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    border: activeTab === id ? '1px solid rgba(255,255,255,0.22)' : '1px solid transparent',
                    borderRadius: '999px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    transition: 'background 0.22s, border-color 0.22s',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {label}
                  {badge != null && (
                    <span style={{
                      background: 'rgba(133,109,71,0.70)',
                      border: '1px solid rgba(255,255,255,0.20)',
                      color: '#fff', borderRadius: '999px',
                      fontSize: '0.52rem', padding: '1px 5px',
                    }}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Row 3: Search pill — hidden on map tab */}
            <div style={{ padding: '4px 10px 8px', display: activeTab === 'mapa' ? 'none' : undefined }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '999px',
                padding: '7px 7px 7px 16px',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.55)" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Busca lugar, actividad, restaurante..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="guia-search-input"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--sans)', fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em',
                  } as React.CSSProperties}
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                      cursor: 'pointer', borderRadius: '999px', padding: '5px 12px',
                      fontFamily: 'var(--sans)', fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <div style={{
                    background: 'rgba(133,109,71,0.65)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '999px',
                    padding: '7px 16px',
                    fontFamily: 'var(--sans)', fontSize: '0.62rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.95)', whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}>
                    Buscar
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Event ticker — hidden on map tab */}
            {upcomingEvents.length > 0 && activeTab !== 'mapa' && (
              <div
                style={{
                  position: 'relative', height: '42px', overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
                onClick={() => setActiveTab('eventos')}
              >
                {/* Left label + strong fade to block ticker text behind it */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '96px', zIndex: 2,
                  background: 'linear-gradient(90deg, rgba(8,20,18,0.92) 62%, transparent 100%)',
                  pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  paddingLeft: '12px', gap: '2px',
                }}>
                  <span style={{
                    fontFamily: 'var(--sans)', fontSize: '0.5rem', letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(168,130,84,0.95)', fontWeight: 700,
                    lineHeight: 1,
                  }}>Eventos</span>
                  <span style={{
                    fontFamily: 'var(--sans)', fontSize: '0.45rem', letterSpacing: '0.08em',
                    color: 'rgba(220,60,60,0.90)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '3px', lineHeight: 1,
                  }}>
                    <span style={{
                      display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
                      background: '#e03c3c',
                      boxShadow: '0 0 4px rgba(224,60,60,0.7)',
                      animation: 'live-pulse 1.8s ease-in-out infinite',
                    }} />
                    Live
                  </span>
                </div>
                {/* Right fade */}
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: '24px', zIndex: 2,
                  background: 'linear-gradient(-90deg, rgba(13,34,30,0.55) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                {/* Scrolling track */}
                <div style={{
                  display: 'flex', alignItems: 'center', height: '100%',
                  animation: 'guia-ticker 18s linear infinite',
                  whiteSpace: 'nowrap',
                  paddingLeft: '96px',
                }}>
                  {[...upcomingEvents, ...upcomingEvents].map((ev, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      fontFamily: 'var(--sans)', fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.82)', letterSpacing: '0.01em',
                      padding: '0 20px', fontWeight: 500,
                    }}>
                      <span style={{
                        display: 'inline-block', width: '5px', height: '5px',
                        borderRadius: '50%', background: 'rgba(168,130,84,0.9)', flexShrink: 0,
                      }} />
                      {ev.title}
                      <span style={{
                        fontFamily: 'var(--sans)', fontSize: '0.6rem',
                        color: 'rgba(255,255,255,0.38)', fontWeight: 400,
                      }}>
                        · {formatDateRange(ev.startDate, ev.endDate)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          <style>{`
            @keyframes guia-ticker {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @keyframes live-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.4; transform: scale(0.7); }
            }
            .guia-search-input::placeholder { color: rgba(255,255,255,0.38); }
            .guia-tab-btn { -webkit-tap-highlight-color: transparent; }
            .guia-tab-btn:hover { opacity: 0.80 !important; }
            .guia-tab-btn:active { transform: scale(0.97) !important; transition: transform 120ms cubic-bezier(0.23,1,0.32,1) !important; }
          `}</style>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ══════════ DIRECTORIO TAB ══════════ */}
          {activeTab === 'directorio' && (
            <motion.div
              key="directorio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >

              {/* ── Conoce Santiago — editorial spotlight section ── */}
              {showCarousel && (
                <section style={{ background: 'var(--forest)', paddingBottom: 'clamp(3rem, 5vw, 5rem)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 175px)', overflow: 'hidden' }}>
                  <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                    {/* Editorial header */}
                    <div style={{
                      padding: '0 clamp(1.5rem, 5vw, 5rem)',
                      marginBottom: 'clamp(2rem, 4vw, 3rem)',
                    }}>
                      {/* Top row: label + anúnciate link */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <p style={{
                          fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.22em',
                          textTransform: 'uppercase', color: 'var(--warm)',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{ color: 'rgba(168,130,84,0.55)' }}>✦</span>
                          Directorio Santiago, N.L.
                        </p>
                        {userCtx.loggedIn ? (
                          <button
                            onClick={() => setDashboardOpen(true)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              textDecoration: 'none',
                              background: 'rgba(133,109,71,0.14)',
                              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                              border: '1px solid rgba(133,109,71,0.38)',
                              borderTop: '1px solid rgba(255,255,255,0.22)',
                              borderRadius: '999px', padding: '7px 18px',
                              fontFamily: 'var(--sans)', fontSize: '0.58rem',
                              letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                              color: 'rgba(168,130,84,0.90)', cursor: 'pointer',
                            } as React.CSSProperties}
                          >
                            {userCtx.avatarEmoji ?? '🎮'} {userCtx.displayName ?? 'Mi cuenta'}
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </button>
                        ) : (
                          <a
                            href="/mi-negocio/registro"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              textDecoration: 'none',
                              background: 'rgba(133,109,71,0.14)',
                              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                              border: '1px solid rgba(133,109,71,0.38)',
                              borderTop: '1px solid rgba(255,255,255,0.22)',
                              borderRadius: '999px', padding: '7px 18px',
                              fontFamily: 'var(--sans)', fontSize: '0.58rem',
                              letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                              color: 'rgba(168,130,84,0.90)', transition: 'background 0.25s',
                            }}
                            className="guia-anunciate-pill"
                          >
                            ✦ Anúnciate aquí
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </a>
                        )}
                      </div>

                      {/* Main row: title + social followers */}
                      <div style={{
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                        gap: 'clamp(1.5rem, 4vw, 3rem)', flexWrap: 'wrap',
                      }}>
                        {/* Title — single line on desktop */}
                        <div style={{ flex: '1 1 auto', overflow: 'hidden', lineHeight: '0.95' }}>
                          <motion.h2
                            initial={{ y: '105%' }}
                            animate={{ y: '0%' }}
                            transition={{ duration: 1.0, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                            style={{
                              fontFamily: 'var(--serif)',
                              fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
                              fontWeight: 400, color: 'var(--paper)',
                              letterSpacing: '-0.025em', lineHeight: '0.95',
                              margin: 0, whiteSpace: 'nowrap',
                            }}
                          >
                            Directorio{' '}
                            <span style={{
                              fontFamily: 'var(--serif-italic)', fontStyle: 'italic',
                              color: 'rgba(250,250,250,0.42)',
                            }}>
                              Destacado
                            </span>
                          </motion.h2>
                        </div>

                        {/* Social followers — prominent, right-aligned */}
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                          style={{ flex: '0 0 auto', paddingBottom: '4px' }}
                        >
                          <SocialFollowersCompact />
                        </motion.div>
                      </div>

                      {/* Horizontal rule — sweeps in */}
                      <div style={{ overflow: 'hidden', height: '1px', marginTop: '1.5rem' }}>
                        <motion.div
                          initial={{ scaleX: 0, transformOrigin: 'left center' }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 1.1, delay: 0.4, ease: [0.77, 0, 0.175, 1] }}
                          style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.09)' }}
                        />
                      </div>
                    </div>

                    <FeaturedCarousel items={carouselItems} />
                  </div>
                </section>
              )}

              {/* ── Recientes — user-submitted listings ── */}
              {recentListings.length > 0 && showCarousel && (
                <section style={{ background: 'var(--forest)', padding: 'clamp(1.5rem, 3vw, 2.5rem) 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(168,130,84,0.9)', display: 'inline-block', flexShrink: 0 }} />
                          Nuevos en el directorio
                        </p>
                      </div>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                        {recentListings.length} {recentListings.length === 1 ? 'anuncio' : 'anuncios'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
                      {recentListings.map(item => (
                        <div key={item.slug} style={{ position: 'relative' }}>
                          <GuiaCard item={item} />
                          <FavoriteButton
                            slug={item.slug}
                            initialFaved={favorites.has(item.slug)}
                            loggedIn={userCtx.loggedIn}
                            onNeedAuth={() => setAuthModalOpen(true)}
                            onToggle={(slug, faved) => setFavorites(prev => {
                              const next = new Set(prev);
                              if (faved) next.add(slug); else next.delete(slug);
                              return next;
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Categories — forest full-width ── */}
              <section style={{ background: 'var(--forest)', paddingTop: showCarousel ? 'clamp(1.75rem, 3.5vw, 2.75rem)' : 'calc(env(safe-area-inset-top, 0px) + 175px)', paddingBottom: 'clamp(1.75rem, 3.5vw, 2.75rem)', borderTop: showCarousel ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

                  {/* Label + arrows */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{
                      fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: 'var(--warm)',
                    }}>
                      Explorar por categoría
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['l', 'r'] as const).map(dir => (
                        <button key={dir} onClick={() => scrollCats(dir)}
                          disabled={dir === 'l' ? !canLeft : !canRight}
                          style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: (dir === 'l' ? !canLeft : !canRight) ? 'default' : 'pointer',
                            background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.22)',
                            boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.4)',
                            color: (dir === 'l' ? !canLeft : !canRight) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
                            transition: 'opacity 0.2s',
                            fontSize: '13px',
                          } as React.CSSProperties}
                        >
                          {dir === 'l' ? '←' : '→'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scroll row */}
                  <div
                    ref={catScrollRef}
                    onScroll={onCatScroll}
                    style={{
                      display: 'flex', gap: '8px', overflowX: 'auto',
                      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
                      paddingBottom: '2px',
                    } as React.CSSProperties}
                  >
                    {/* Todos */}
                    {[{ id: 'all', label: 'Todos', count: listings.length } as const,
                      ...allCategories.map(cat => ({ id: cat, label: CATEGORY_LABEL[cat], count: countByCategory[cat] ?? 0 }))
                    ].map(({ id, label, count }) => {
                      const isActive = activeCategory === id;
                      const isEmpty = count === 0 && id !== 'all';
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveCategory(isActive ? 'all' : id as Category | 'all')}
                          style={{
                            flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer',
                            fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '9px 17px', borderRadius: 'var(--radius-pill)',
                            transition: 'all 0.22s',
                            ...(isActive ? {
                              background: 'rgba(255,255,255,0.95)',
                              color: 'var(--forest)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,1)',
                              border: '1px solid rgba(255,255,255,0.9)',
                            } : {
                              background: 'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.09) 100%)',
                              backdropFilter: 'blur(24px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                              border: '1px solid rgba(255,255,255,0.20)',
                              borderTop: '1px solid rgba(255,255,255,0.38)',
                              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(0,0,0,0.12)',
                              color: isEmpty ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.82)',
                            }),
                          } as React.CSSProperties}
                        >
                          {label}
                          <span style={{
                            marginLeft: '7px', fontSize: '0.58rem',
                            background: isActive ? 'rgba(13,34,30,0.12)' : isEmpty ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.14)',
                            padding: '1px 6px', borderRadius: '999px',
                            color: isActive ? 'var(--forest)' : isEmpty ? 'rgba(255,255,255,0.28)' : 'var(--warm)',
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scroll progress bar */}
                  <div style={{ height: '2px', background: 'rgba(255,255,255,0.10)', borderRadius: '1px', marginTop: '12px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '1px',
                      background: 'rgba(255,255,255,0.50)',
                      width: '22%',
                      transform: `translateX(${catPct * 356}%)`,
                      transition: 'transform 0.12s linear',
                    }} />
                  </div>
                </div>
              </section>

              {/* Mini Games Section — full bleed, between forest strip and white content */}
              {showCarousel && (
                <MiniGamesSection
                  userCtx={userCtx}
                  onNeedAuth={() => setAuthModalOpen(true)}
                  onEngaged={requestInstallPrompt}
                />
              )}

              {/* ── White content ── */}
              <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 5vw, 5rem) 0' }}>
                <style>{`div::-webkit-scrollbar{display:none}`}</style>

                {/* Grid */}
                <section id="directorio-grid" style={{ paddingBottom: 'clamp(4rem, 8vw, 8rem)' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)', flexWrap: 'wrap', gap: '1rem',
                  }}>
                    <h2 style={{
                      fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
                      fontWeight: 400, color: 'rgba(250,248,242,0.95)', letterSpacing: '-0.02em',
                    }}>
                      {searchQuery
                        ? `Resultados para "${searchQuery}"`
                        : activeCategory !== 'all'
                          ? CATEGORY_LABEL[activeCategory]
                          : 'Todos los anuncios'}
                    </h2>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {filteredListings.length} {filteredListings.length === 1 ? 'anuncio' : 'anuncios'}
                    </span>
                  </div>

                  {filteredListings.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                      gap: 'clamp(1.25rem, 2.5vw, 2rem)',
                    }}>
                      {filteredListings.map(item => (
                        <div key={item.slug} style={{ position: 'relative' }}>
                          <GuiaCard item={item} />
                          <FavoriteButton
                            slug={item.slug}
                            initialFaved={favorites.has(item.slug)}
                            loggedIn={userCtx.loggedIn}
                            onNeedAuth={() => setAuthModalOpen(true)}
                            onToggle={(slug, faved) => setFavorites(prev => {
                              const next = new Set(prev);
                              if (faved) next.add(slug); else next.delete(slug);
                              return next;
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center', padding: 'clamp(3rem, 6vw, 5rem) 0',
                      color: 'var(--muted)',
                    }}>
                      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                        No encontramos resultados
                      </p>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem' }}>
                        Prueba con otra búsqueda o{' '}
                        <button
                          onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warm)', textDecoration: 'underline', fontFamily: 'var(--sans)', fontSize: '0.82rem' }}
                        >
                          ver todos
                        </button>
                      </p>
                    </div>
                  )}
                </section>

                {/* Footer: A-Z + auto-scroll listings */}
                <section style={{
                  borderTop: '1px solid var(--border)',
                  padding: 'clamp(2.5rem, 5vw, 4rem) 0',
                  overflow: 'hidden',
                }}>
                  {/* A-Z alphabet navigation */}
                  <p style={{
                    fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em',
                    textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.6)', display: 'inline-block' }} />
                    Explorar por letra
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                      <button
                        key={letter}
                        onClick={() => { setSearchQuery(letter); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        style={{
                          fontFamily: 'var(--sans)', fontSize: '0.72rem', letterSpacing: '0.06em',
                          color: 'rgba(255,255,255,0.62)', background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)', borderRadius: '6px',
                          padding: '6px 10px', cursor: 'pointer', minWidth: '34px',
                          textAlign: 'center', lineHeight: 1,
                        }}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  {/* Auto-scroll marquee */}
                  <style>{`
                    @keyframes guia-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .guia-marquee-track { animation: guia-marquee 26s linear infinite; }
                    .guia-marquee-track:hover { animation-play-state: paused; }
                  `}</style>
                  <div style={{
                    overflow: 'hidden',
                    maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
                  }}>
                    <div className="guia-marquee-track" style={{ display: 'flex', gap: '12px', width: 'max-content' }}>
                      {[...marqueeItems, ...marqueeItems].map((item, i) => (
                        <Link
                          key={`mq-${i}`}
                          href={`/directorio/actividades/${item.slug}`}
                          style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            width: '155px', height: '195px', borderRadius: 'var(--radius-md)',
                            overflow: 'hidden', textDecoration: 'none', flexShrink: 0,
                            position: 'relative',
                            background: item.src
                              ? `url(${item.src}) center/cover no-repeat`
                              : 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }} />
                          <div style={{ position: 'relative', padding: '0 10px 10px' }}>
                            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.56rem', color: 'rgba(255,255,255,0.48)', marginBottom: '3px', letterSpacing: '0.04em' }}>
                              {CATEGORY_ICON[item.category]} {item.categoryLabel}
                            </p>
                            <p style={{
                              fontFamily: 'var(--sans)', fontSize: '0.72rem', fontWeight: 500,
                              color: 'rgba(255,255,255,0.92)', lineHeight: 1.2,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                            } as React.CSSProperties}>
                              {item.name}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {/* ══════════ EVENTOS TAB ══════════ */}
          {activeTab === 'eventos' && (
            <motion.div
              key="eventos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

                <section style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 175px) 0 clamp(4rem, 8vw, 7rem)' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    marginBottom: 'clamp(2rem, 4vw, 3rem)', flexWrap: 'wrap', gap: '1.5rem',
                  }}>
                    <div>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.5rem',
                      }}>
                        Próximos eventos
                      </p>
                      <h2 style={{
                        fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                        fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em',
                      }}>
                        ¿Qué pasa en Santiago?
                      </h2>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--muted)',
                        marginTop: '0.5rem', lineHeight: 1.6,
                      }}>
                        Eventos publicados por la comunidad · Aprobados por el equipo de Hotel El Encino
                      </p>
                    </div>
                    {/* Submit CTA */}
                    <a
                      href="/directorio/eventos/nuevo"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)', textDecoration: 'none',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.20)',
                        padding: '11px 22px', borderRadius: 'var(--radius-pill)',
                        whiteSpace: 'nowrap', transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                      className="guia-cat-pill"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Publica tu evento
                    </a>
                  </div>

                  {/* Events grid */}
                  {upcomingEvents.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                      gap: 'clamp(1.25rem, 2.5vw, 2rem)',
                    }}>
                      {upcomingEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
                      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                        No hay eventos próximos
                      </p>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem' }}>
                        ¿Organizas algo en Santiago?{' '}
                        <a href="/directorio/eventos/nuevo" style={{ color: 'var(--warm)' }}>
                          Publícalo gratis
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Info strip */}
                  <div style={{
                    marginTop: 'clamp(2.5rem, 5vw, 4rem)',
                    background: 'var(--forest)', borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(1.5rem, 3vw, 2.5rem)',
                    display: 'flex', flexWrap: 'wrap', gap: '2rem',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.18em',
                        textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '0.5rem',
                      }}>
                        ¿Cómo funciona?
                      </p>
                      <p style={{
                        fontFamily: 'var(--serif-italic)', fontSize: '1.1rem', fontStyle: 'italic',
                        color: 'rgba(250,250,250,0.88)', marginBottom: '0.4rem',
                      }}>
                        Cualquier persona puede publicar un evento
                      </p>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: '0.78rem', color: 'rgba(250,250,250,0.45)',
                        lineHeight: 1.7, maxWidth: '420px',
                      }}>
                        Llena el formulario — se publica de inmediato si pasa el filtro automático.
                        Los eventos se eliminan automáticamente al día siguiente de que terminan. Completamente gratis.
                      </p>
                    </div>
                    <a
                      href="/directorio/eventos/nuevo"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none',
                        background: 'var(--paper)', padding: '12px 24px',
                        borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
                        transition: 'opacity 0.25s', flexShrink: 0,
                      }}
                    >
                      Publicar mi evento →
                    </a>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {/* ══════════ MAPA TAB ══════════ */}
          {activeTab === 'mapa' && (
            <motion.div
              key="mapa"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'relative' }}
            >
              <MapaTab listings={listings} />
            </motion.div>
          )}

          {/* ══════════ BLOG TAB ══════════ */}
          {activeTab === 'blog' && (
            <motion.div
              key="blog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {(() => {
                const blogPosts = getRecentPosts(6);
                const featured = blogPosts.filter(p => p.featured);
                const rest = blogPosts.filter(p => !p.featured);
                return (
                  <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

                    {/* ── Blog hero header ── */}
                    <section style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 165px) 0 clamp(2.5rem, 5vw, 4rem)' }}>
                      <p style={{
                        fontFamily: 'var(--sans)', fontSize: '0.6rem', letterSpacing: '0.22em',
                        textTransform: 'uppercase', color: 'var(--warm)',
                        marginBottom: '0.85rem',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.6)', display: 'inline-block' }} />
                        Guías & Artículos
                      </p>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
                        <h2 style={{
                          fontFamily: 'var(--serif)',
                          fontSize: 'clamp(1.5rem, 3vw, 2.4rem)',
                          fontWeight: 400, color: 'var(--paper)',
                          letterSpacing: '-0.025em', lineHeight: '0.95', margin: 0,
                        }}>
                          Descubre{' '}
                          <span style={{ fontFamily: 'var(--serif-italic)', fontStyle: 'italic', color: 'rgba(250,250,250,0.38)' }}>
                            Santiago
                          </span>
                        </h2>
                        <a
                          href="/blog"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            fontFamily: 'var(--sans)', fontSize: '0.62rem', letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: 'rgba(168,130,84,0.85)', textDecoration: 'none',
                            background: 'rgba(133,109,71,0.12)',
                            border: '1px solid rgba(133,109,71,0.35)',
                            padding: '7px 16px', borderRadius: 'var(--radius-pill)',
                          }}
                        >
                          Ver todos →
                        </a>
                      </div>
                      <div style={{ overflow: 'hidden', height: '1px', marginTop: '1.25rem' }}>
                        <motion.div
                          initial={{ scaleX: 0, transformOrigin: 'left center' }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 1.0, delay: 0.2, ease: [0.77, 0, 0.175, 1] }}
                          style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.09)' }}
                        />
                      </div>
                    </section>

                    {/* ── Featured articles ── */}
                    {featured.length > 0 && (
                      <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
                        <p style={{
                          fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.18em',
                          textTransform: 'uppercase', color: 'rgba(250,248,242,0.38)',
                          marginBottom: '1.25rem',
                        }}>
                          Artículos destacados
                        </p>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                          gap: 'clamp(1rem, 2.5vw, 1.75rem)',
                        }}>
                          {featured.map((post, i) => (
                            <BlogCard key={post.slug} post={post} index={i} theme="dark" size="featured" />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── More articles ── */}
                    {rest.length > 0 && (
                      <section style={{ marginBottom: 'clamp(4rem, 8vw, 7rem)' }}>
                        <p style={{
                          fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.18em',
                          textTransform: 'uppercase', color: 'rgba(250,248,242,0.38)',
                          marginBottom: '1.25rem',
                        }}>
                          Más artículos
                        </p>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                          gap: 'clamp(1rem, 2.5vw, 1.5rem)',
                        }}>
                          {rest.map((post, i) => (
                            <BlogCard key={post.slug} post={post} index={i} theme="dark" />
                          ))}
                        </div>
                      </section>
                    )}

                  </div>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Overlays ─────────────────────────────────────── */}
      <UserAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <UserDashboard
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        userCtx={userCtx}
        onLogout={handleLogout}
      />
      <InstallPrompt />
    </>
  );
}
