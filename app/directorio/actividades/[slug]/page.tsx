import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { listings, getListingBySlug, CATEGORY_LABEL, CATEGORY_ICON, type Listing, type Category } from '../../data';
import { GuiaCardSmall } from '../../GuiaCard';
import ListingPhotoClient from './ListingPhotoClient';
import DirectoryPill from '../DirectoryPill';
import ListingAnalytics from '../ListingAnalytics';
import ListingCtaButtons from './ListingCtaButtons';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Fetch 4 most recent user listings for the bottom section */
async function fetchRecentUserListings(): Promise<Listing[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_listings?status=eq.active&order=created_at.desc&limit=6`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: Record<string, string>) => {
      const cat = (r.category as Category) || 'servicios';
      return {
        slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: r.name, category: cat,
        categoryLabel: CATEGORY_LABEL[cat] ?? r.category,
        shortDesc: r.short_desc || '', longDesc: r.long_desc || r.short_desc || '',
        address: r.address || 'Santiago, N.L.',
        distanceKm: 0, distanceMin: 0, duration: '',
        priceRange: r.price_range || '', hours: r.hours || '', tips: [],
        src: r.src || '/santiago-plaza.webp', alt: r.name, tag: null,
        website: r.website || null, phone: r.phone || null,
        whatsapp: r.whatsapp || null, instagram: r.instagram || null, facebook: r.facebook || null,
        tier: (r.tier as Listing['tier']) || 'free',
        lat: 25.4219, lng: -100.1573, isUserListing: true, created_at: r.created_at,
      };
    });
  } catch { return []; }
}

/** Fetch a single listing from Supabase by slug (fallback for DB user listings) */
async function fetchDbListing(slug: string): Promise<Listing | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_listings?slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const r = rows[0];
    const cat = (r.category as Category) || 'servicios';
    return {
      slug: r.slug,
      name: r.name,
      category: cat,
      categoryLabel: CATEGORY_LABEL[cat] ?? r.category,
      shortDesc: r.short_desc || '',
      longDesc: r.long_desc || r.short_desc || '',
      address: r.address || 'Santiago, N.L.',
      distanceKm: 0, distanceMin: 0, duration: '',
      priceRange: r.price_range || '',
      hours: r.hours || '',
      tips: [],
      src: r.src || '/santiago-plaza.webp',
      alt: r.name,
      tag: null,
      website: r.website || null,
      phone: r.phone || null,
      whatsapp: r.whatsapp || null,
      instagram: r.instagram || null,
      facebook: r.facebook || null,
      tier: (r.tier as Listing['tier']) || 'free',
      lat: 25.4219, lng: -100.1573,
      isUserListing: true,
      created_at: r.created_at,
    };
  } catch { return null; }
}

async function getListing(slug: string): Promise<Listing | null> {
  return getListingBySlug(slug) ?? fetchDbListing(slug);
}

export async function generateStaticParams() {
  return listings.map(l => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getListing(slug);
  if (!item) return {};
  return {
    title: `${item.name} — Directorio Santiago, N.L.`,
    description: item.shortDesc,
    keywords: [
      item.name,
      `${item.name} Santiago NL`,
      `${item.name} Nuevo León`,
      'qué hacer Santiago Nuevo León',
      'turismo Santiago NL',
    ],
    openGraph: {
      title: `${item.name} — Santiago, Nuevo León`,
      description: item.shortDesc,
      url: `https://hotelelencino.com/directorio/actividades/${item.slug}`,
      images: [{ url: item.src, alt: item.alt }],
    },
    alternates: { canonical: `/directorio/actividades/${item.slug}` },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const item = await getListing(slug);
  if (!item) notFound();

  const allRecentUser = (await fetchRecentUserListings()).filter(l => l.slug !== item.slug);
  const recentUserListings = allRecentUser.slice(0, 4);

  // same-category suggestions: DB listings first, then static, deduplicated
  const staticSameCat = listings.filter(l => l.slug !== item.slug && l.category === item.category);
  const sameCatSlugs = new Set(allRecentUser.filter(l => l.category === item.category).map(l => l.slug));
  const sameCat = [
    ...allRecentUser.filter(l => l.category === item.category),
    ...staticSameCat.filter(l => !sameCatSlugs.has(l.slug)),
  ].slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: item.name,
    description: item.shortDesc,
    url: `https://hotelelencino.com/directorio/actividades/${item.slug}`,
    image: `https://hotelelencino.com${item.src}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Santiago',
      addressRegion: 'Nuevo León',
      addressCountry: 'MX',
      streetAddress: item.address,
    },
    geo: { '@type': 'GeoCoordinates', latitude: item.lat, longitude: item.lng },
    touristType: item.categoryLabel,
    ...(item.hours ? { openingHours: item.hours } : {}),
    isAccessibleForFree: item.priceRange === 'Acceso libre',
    nearbyLocation: {
      '@type': 'Hotel',
      name: 'Hotel El Encino Santiago',
      url: 'https://hotelelencino.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main style={{ background: 'var(--paper)', minHeight: '100dvh' }}>

        {/* GA4 view_item event */}
        <ListingAnalytics slug={item.slug} name={item.name} category={item.category} />
        {/* Sticky directory pill — fades in after scroll */}
        <DirectoryPill />

        {/* Fixed × close / back button */}
        <Link href="/directorio" style={{
          position: 'fixed',
          top: 'clamp(72px, 8vh, 88px)',
          left: '1rem',
          zIndex: 45,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px',
          background: 'rgba(13,34,30,0.75)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: '50%',
          color: 'rgba(255,255,255,0.72)',
          fontFamily: 'var(--sans)', fontSize: '1.1rem',
          textDecoration: 'none', lineHeight: 1,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>×</Link>

        {/* Breadcrumb + hero */}
        <div style={{
          background: 'var(--forest)',
          padding: 'clamp(4rem, 7vw, 7rem) clamp(1.5rem, 5vw, 5rem) 0',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2rem' }}>
              {[
                { href: '/', label: 'Hotel El Encino' },
                { href: '/directorio', label: 'Directorio Santiago' },
                { href: '/directorio', label: CATEGORY_LABEL[item.category] },
              ].map((crumb, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {i > 0 && <span style={{ color: 'rgba(250,250,250,0.25)', fontSize: '0.7rem' }}>›</span>}
                  <Link href={crumb.href} style={{
                    fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'rgba(250,250,250,0.45)', textDecoration: 'none',
                  }}>
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>

          {/* Hero image + title overlay */}
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ListingPhotoClient
              photos={item.photos && item.photos.length > 0 ? item.photos : [item.src]}
              alt={item.alt}
              name={item.name}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 'clamp(3rem, 6vw, 7rem)',
            padding: 'clamp(3rem, 5vw, 5rem) 0',
          }}>

            {/* Descripción larga */}
            <div>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: 'clamp(0.9rem, 1.3vw, 1rem)',
                color: 'var(--muted)', lineHeight: 1.9, whiteSpace: 'pre-line',
              }}>
                {item.longDesc}
              </p>

              {/* Tips */}
              {item.tips.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                  <p style={{
                    fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem',
                  }}>
                    Tips del hotel
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {item.tips.map((tip, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--warm)', flexShrink: 0, fontSize: '0.85rem', marginTop: '1px' }}>→</span>
                        <span style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Info sidebar */}
            <div>
              {/* Info cards */}
              <div style={{
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 'clamp(1.5rem, 2.5vw, 2rem)',
                marginBottom: '1.5rem',
              }}>
                <p style={{
                  fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1.2rem',
                }}>
                  Información práctica
                </p>
                {[
                  { label: 'Distancia', value: item.distanceMin > 0 ? `${item.distanceKm} km del hotel · ${item.distanceMin} min en auto` : 'En el centro de Santiago' },
                  { label: 'Duración recomendada', value: item.duration },
                  { label: 'Costo aproximado', value: item.priceRange },
                  { label: 'Horario', value: item.hours },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} style={{
                    display: 'flex', flexDirection: 'column', padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>{row.label}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: '0.84rem', color: 'var(--ink)', lineHeight: 1.4 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Contact CTAs — hero/featured only */}
              {(item.tier === 'hero' || item.tier === 'featured') && (
                <ListingCtaButtons
                  phone={item.phone}
                  whatsapp={item.whatsapp}
                  instagram={item.instagram}
                  facebook={item.facebook}
                  website={item.website}
                  slug={item.slug}
                />
              )}

            </div>
          </div>

          {/* Más en esta categoría */}
          {sameCat.length > 0 && (
            <section style={{
              borderTop: '1px solid var(--border)',
              padding: 'clamp(3rem, 5vw, 5rem) 0',
            }}>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: '0.68rem', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '1rem' }}>{CATEGORY_ICON[item.category]}</span>
                Más en {item.categoryLabel}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                gap: '1.5rem',
              }}>
                {sameCat.map(s => (
                  <GuiaCardSmall key={s.slug} item={s} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Bottom full-width: category nav + recent anuncios ── */}
        <section style={{ background: 'var(--forest)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: 'clamp(2.5rem, 5vw, 4rem) 0' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1.5rem, 5vw, 5rem)' }}>

            {/* Category navigation */}
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '24px', height: '1px', background: 'rgba(168,130,84,0.6)', display: 'inline-block' }} />
              Explorar el directorio
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
              <Link href="/directorio" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.72)', textDecoration: 'none', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-pill)' }}>
                Todos los anuncios
              </Link>
              {(Object.entries(CATEGORY_LABEL) as [Category, string][]).map(([key, label]) => (
                <Link key={key} href={`/directorio?cat=${key}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--sans)', fontSize: '0.65rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', padding: '5px 11px', borderRadius: 'var(--radius-pill)', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '0.75rem' }}>{CATEGORY_ICON[key]}</span>
                  {label}
                </Link>
              ))}
            </div>

            {/* Recent user listings */}
            {recentUserListings.length > 0 && (
              <>
                <p style={{ fontFamily: 'var(--sans)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '24px', height: '1px', background: 'rgba(255,255,255,0.18)', display: 'inline-block' }} />
                  Anuncios recientes
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
                  {recentUserListings.map(l => (
                    <GuiaCardSmall key={l.slug} item={l} />
                  ))}
                </div>
              </>
            )}

          </div>
        </section>

      </main>
    </>
  );
}
