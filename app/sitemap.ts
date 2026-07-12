import { MetadataRoute } from 'next';
import { listings } from './directorio/data';

async function fetchDbListingSlugs(): Promise<string[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/guia_listings?status=eq.active&select=slug&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ slug: string }>;
    return rows.map(r => r.slug).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticSlugs = new Set(listings.map(l => l.slug));
  const dbSlugs     = await fetchDbListingSlugs();

  // All listing URLs (static + DB, deduplicated)
  const allListingUrls: MetadataRoute.Sitemap = [
    ...listings.map(l => ({
      url: `https://hotelelencino.com/directorio/actividades/${l.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...dbSlugs
      .filter(slug => !staticSlugs.has(slug))
      .map(slug => ({
        url: `https://hotelelencino.com/directorio/actividades/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      })),
  ];

  return [
    {
      url: 'https://hotelelencino.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://hotelelencino.com/directorio',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://hotelelencino.com/directorio/actividades',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://hotelelencino.com/privacidad',
      lastModified: new Date('2026-04-06'),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: 'https://hotelelencino.com/terminos',
      lastModified: new Date('2026-04-06'),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    ...allListingUrls,
  ];
}
