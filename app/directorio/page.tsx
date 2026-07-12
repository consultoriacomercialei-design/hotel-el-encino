import type { Metadata } from 'next';
import { listings, type Listing, type Category, CATEGORY_LABEL } from './data';
import { events as staticEvents, type GuiaEvent } from './events';
import GuiaClient from './GuiaClient';
import type { HeroSlide } from './GuiaHeroCompact';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Directorio Santiago, Nuevo León — Qué hacer, ver y visitar',
  description: 'Guía completa de Santiago, N.L.: Cascada Cola de Caballo, Cañón Matacanes, Presa La Boca, Festival Cielo Mágico y más. Todo a minutos del Hotel El Encino.',
  keywords: [
    'qué hacer en Santiago Nuevo León',
    'atracciones Santiago NL',
    'turismo Santiago Nuevo León',
    'Cola de Caballo cascada',
    'Matacanes tour',
    'Festival Cielo Mágico Santiago',
    'Presa La Boca Santiago',
    'conoce Santiago Nuevo León',
    'eventos Santiago NL',
  ],
  openGraph: {
    title: 'Directorio Santiago, N.L. — Qué hacer, ver y visitar',
    description: 'Cascada Cola de Caballo, Cañón Matacanes, Presa La Boca, Cielo Mágico y más — descubre todo lo que Santiago, Nuevo León tiene para ofrecer.',
    url: 'https://hotelelencino.com/directorio',
    images: [{ url: '/cielo-magico-festival.jpg', width: 4592, height: 3056, alt: 'Directorio Santiago, Nuevo León' }],
  },
  alternates: { canonical: '/directorio' },
};

const schemaPage = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Directorio Santiago, Nuevo León',
  description: 'Guía completa de atracciones, actividades y lugares de interés en Santiago, N.L.',
  url: 'https://hotelelencino.com/directorio',
  publisher: {
    '@type': 'Hotel',
    name: 'Hotel El Encino Santiago',
    url: 'https://hotelelencino.com',
  },
};

interface DbEvent {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  time_start?: string;
  location: string;
  short_desc: string;
  price: string;
  photo_url?: string;
  organizer_name?: string;
}

interface DbListing {
  slug: string; name: string; category: string;
  short_desc: string; long_desc: string; address: string;
  price_range: string; hours: string; src: string;
  phone: string | null; whatsapp: string | null; website: string | null;
  instagram: string | null; facebook: string | null;
  tier: string; created_at: string;
  lat: number | null; lng: number | null;
  img_focus?: string | null;
}

async function fetchDbListings(): Promise<Listing[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_listings?status=eq.active&order=created_at.desc&limit=100`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const rows: DbListing[] = await res.json();
    return rows.map(r => ({
      slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: r.name,
      category: (r.category as Category) || 'servicios',
      categoryLabel: CATEGORY_LABEL[(r.category as Category)] ?? r.category,
      shortDesc: r.short_desc || '',
      longDesc: r.long_desc || r.short_desc || '',
      address: r.address || 'Santiago, N.L.',
      distanceKm: 0,
      distanceMin: 0,
      priceRange: r.price_range || '',
      hours: r.hours || '',
      src: r.src || '/santiago-plaza.webp',
      alt: r.name,
      website: r.website || null,
      phone: r.phone || null,
      whatsapp: r.whatsapp || null,
      instagram: r.instagram || null,
      facebook: r.facebook || null,
      tier: (r.tier as Listing['tier']) || 'free',
      duration: '',
      tips: [],
      tag: null,
      lat: r.lat ?? 25.4219,
      lng: r.lng ?? -100.1573,
      imgFocus: r.img_focus ?? undefined,
      isUserListing: true,
      created_at: r.created_at,
    }));
  } catch { return []; }
}

async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_listings?tier=in.(hero,featured)&status=eq.active&src=not.is.null&select=src,name&limit=8`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const rows: { src: string; name: string }[] = await res.json();
    return rows.filter(r => r.src).map(r => ({ src: r.src, name: r.name }));
  } catch { return []; }
}

async function fetchDbEvents(): Promise<GuiaEvent[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_events?status=eq.active&end_date=gte.${today}&order=start_date.asc&limit=50`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Cache-Control': 'no-store' },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const rows: DbEvent[] = await res.json();
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      category: (r.category as GuiaEvent['category']) ?? 'comunidad',
      startDate: r.start_date,
      endDate: r.end_date,
      time: r.time_start ?? undefined,
      location: r.location,
      shortDesc: r.short_desc,
      price: r.price ?? 'Entrada libre',
      src: r.photo_url ?? '/santiago-plaza.webp',
      alt: r.title,
      organizer: r.organizer_name ?? undefined,
      tag: undefined,
    }));
  } catch {
    return [];
  }
}

export default async function ConoceSantiagoPage() {
  const today = new Date(); today.setHours(0,0,0,0);

  // Filter static events that haven't ended
  const futureStatic = staticEvents.filter(
    e => new Date(e.endDate + 'T23:59:59') >= today
  );

  const [dbEvents, dbListings] = await Promise.all([fetchDbEvents(), fetchDbListings()]);

  // Merge events: DB wins over static (deduped by title)
  const seenEvents = new Set(dbEvents.map(e => e.title.toLowerCase()));
  const merged = [
    ...dbEvents,
    ...futureStatic.filter(e => !seenEvents.has(e.title.toLowerCase())),
  ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Merge listings: DB wins over static (deduped by slug)
  const staticSlugs = new Set(listings.map(l => l.slug));
  const mergedListings = [
    ...listings,
    ...dbListings.filter(l => !staticSlugs.has(l.slug)),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaPage) }}
      />
      <GuiaClient listings={mergedListings} events={merged} />
    </>
  );
}
