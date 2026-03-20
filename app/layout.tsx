import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel El Encino Santiago",
  description:
    "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. Habitaciones dobles desde $1,500 MXN. WiFi, estacionamiento y cafetera incluidos.",
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
      "Un lugar en el corazón de Santiago, Nuevo León. Habitaciones dobles desde $1,500 MXN. WiFi, estacionamiento y cafetera incluidos.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85",
        width: 1200,
        height: 630,
        alt: "Hotel El Encino Santiago",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hotel El Encino Santiago",
    description:
      "Habitaciones dobles desde $1,500 MXN en el centro de Santiago, N.L.",
    images: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85"],
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
};

const schemaHotel = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Hotel El Encino Santiago",
  "description": "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. WiFi de alta velocidad, estacionamiento y cafetera en habitación incluidos.",
  "url": "https://hotelelencino.com",
  "telephone": "+52-81-1999-9318",
  "image": [
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85"
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
  "aggregateRating": {
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaHotel) }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
