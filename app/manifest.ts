import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hotel El Encino · Directorio Santiago NL',
    short_name: 'Directorio Santiago',
    description: 'Hotel El Encino y Directorio de Santiago, Nuevo León',
    start_url: '/directorio',
    scope: '/',
    display: 'standalone',
    background_color: '#0d221e',
    theme_color: '#0d221e',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
