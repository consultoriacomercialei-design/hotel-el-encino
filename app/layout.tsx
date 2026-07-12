import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fetchGoogleReviews } from "./lib/google-reviews";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d221e',   // forest — status bar color on iOS + Android Chrome
};

export const metadata: Metadata = {
  title: "Hotel El Encino Santiago",
  description:
    "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. Habitaciones dobles desde $1,800 MXN. WiFi, estacionamiento y cafetera incluidos.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  keywords: [
    "Hotel El Encino",
    "hotel Santiago Nuevo León",
    "hospedaje Santiago NL",
    "hotel centro Santiago",
    "hotel barato Santiago NL",
    "hospedaje Nuevo León",
    "hotel cerca Cola de Caballo",
    "hotel Santiago Cielo Magico",
  ],
  authors: [{ name: "Hotel El Encino Santiago" }],
  creator: "Hotel El Encino Santiago",
  metadataBase: new URL("https://hotelelencino.com"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://hotelelencino.com",
    siteName: "Hotel El Encino Santiago",
    title: "Hotel El Encino Santiago",
    description:
      "Un lugar en el corazón de Santiago, Nuevo León. Habitaciones dobles desde $1,800 MXN. WiFi, estacionamiento y cafetera incluidos.",
    images: [
      {
        url: "/67fd7781e8040-DJI_20241029162952_0279_D-min_gmxdot_jpg.jpeg",
        width: 2016,
        height: 1134,
        alt: "Vista aérea Hotel El Encino Santiago, Nuevo León",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hotel El Encino Santiago",
    description:
      "Habitaciones dobles desde $1,800 MXN en el centro de Santiago, N.L.",
    images: ["/67fd7781e8040-DJI_20241029162952_0279_D-min_gmxdot_jpg.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Directorio Santiago',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
  other: {
    "apple-domain-verification": "mrx-m1v4cnZEiYmrPi5U9z15iwkGwnTWCKvH0xnlDWw",
    "facebook-domain-verification": "evz0pc11uayzosee0zplu68n2xcfcn",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const googleData = await fetchGoogleReviews();

  const schemaHotel = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Hotel El Encino Santiago",
    "description": "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. WiFi de alta velocidad, estacionamiento y cafetera en habitación incluidos.",
    "url": "https://hotelelencino.com",
    "identifier": "hotel-el-encino-santiago",
    "telephone": "+52-81-1999-9318",
    "logo": {
      "@type": "ImageObject",
      "url": "https://hotelelencino.com/logo.png",
      "width": 512,
      "height": 512
    },
    "image": [
      "https://hotelelencino.com/67fd7781e8040-DJI_20241029162952_0279_D-min_gmxdot_jpg.jpeg",
      "https://hotelelencino.com/IMG_4881.PNG"
    ],
    "checkInTime": "14:00",
    "checkOutTime": "12:00",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Hermenegildo Galeana 200",
      "addressLocality": "Santiago",
      "addressRegion": "Nuevo León",
      "postalCode": "67310",
      "addressCountry": "MX"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 25.4219673,
      "longitude": -100.1573258
    },
    "aggregateRating": googleData ? {
      "@type": "AggregateRating",
      "ratingValue": googleData.rating,
      "reviewCount": googleData.user_ratings_total,
      "bestRating": 5,
      "worstRating": 1
    } : {
      "@type": "AggregateRating",
      "ratingValue": 5.0,
      "reviewCount": 23,
      "bestRating": 5,
      "worstRating": 1
    },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "WiFi de Alta Velocidad", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Estacionamiento", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Cafetera en habitación", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "LGBTQ+ Friendly", "value": true }
    ],
    "sameAs": [
      "https://www.instagram.com/elencinohospedaje",
      "https://www.facebook.com/hotelencinosantiago"
    ],
    "containsPlace": [
      {
        "@type": "HotelRoom",
        "name": "Habitación Doble",
        "description": "Habitación doble para hasta 3 adultos y 1 menor. Incluye WiFi de alta velocidad, estacionamiento y cafetera en habitación sin costo adicional.",
        "occupancy": {
          "@type": "QuantitativeValue",
          "value": 4
        },
        "amenityFeature": [
          { "@type": "LocationFeatureSpecification", "name": "WiFi", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Cafetera", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Baño privado", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Estacionamiento", "value": true }
        ]
      }
    ]
  };

  return (
    <html lang="es" className="h-full">
      <head>
        {/* 1 — dataLayer init: MUST precede GTM so any pre-GTM pushes are queued */}
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || [];` }} />
        {/* 2 — Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P54RH6VP');`,
          }}
        />
        {/* 3 — gtag.js loader (GA4 + Google Ads) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-J2M8VKW704" />
        {/* 4 — gtag function + property configs */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-J2M8VKW704');
              gtag('config', 'AW-18050215750');
            `,
          }}
        />
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaHotel) }}
        />
      </head>
      <body className="min-h-full">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P54RH6VP"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
