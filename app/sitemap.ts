import { MetadataRoute } from 'next';

// El directorio se mudó a directoriosantiago.com (con su propio sitemap).
// Este sitemap solo cubre las páginas del hotel.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://hotelelencino.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://hotelelencino.com/privacidad',
      lastModified: new Date('2026-04-06'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://hotelelencino.com/terminos',
      lastModified: new Date('2026-04-06'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
