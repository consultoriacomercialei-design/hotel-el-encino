import type { NextConfig } from "next";

// Headers generales (todas las rutas)
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera bloqueada por defecto; se habilita solo en /directorio/ar (ver abajo)
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js necesita unsafe-inline/unsafe-eval en dev; considera nonces en producción
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://www.mercadopago.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://unpkg.com",
      "img-src 'self' data: blob: https://www.mercadopago.com https://lh3.googleusercontent.com https://*.supabase.co https://*.cartocdn.com https://a.basemaps.cartocdn.com https://b.basemaps.cartocdn.com https://c.basemaps.cartocdn.com https://d.basemaps.cartocdn.com https://tiles.openfreemap.org https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google-analytics.com",
      "font-src 'self' https://fonts.gstatic.com https://tiles.openfreemap.org",
      "worker-src blob:",
      "connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://graph.facebook.com https://api.resend.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://maps.googleapis.com https://api.groq.com https://unpkg.com https://*.cartocdn.com https://tiles.openfreemap.org",
      "frame-src https://www.mercadopago.com https://mercadopago.com https://maps.google.com https://www.google.com https://google.com https://www.googletagmanager.com https://bid.g.doubleclick.net",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

// Headers especiales para la ruta AR (necesita cámara)
const arHeaders = [
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "worker-src blob:",
      "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/guia', destination: '/directorio', permanent: true },
      { source: '/guia/actividades', destination: '/directorio/actividades', permanent: true },
      { source: '/guia/actividades/:slug', destination: '/directorio/actividades/:slug', permanent: true },
      { source: '/guia/eventos/nuevo', destination: '/directorio/eventos/nuevo', permanent: true },
    ];
  },
  async headers() {
    return [
      // AR route — habilita cámara, CSP específico para MindAR CDN
      {
        source: "/directorio/ar",
        headers: arHeaders,
      },
      // Todas las demás rutas
      {
        source: "/((?!directorio/ar).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
