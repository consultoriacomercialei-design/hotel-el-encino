import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel El Encino Santiago",
  description:
    "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. Habitaciones limpias, cómodas y atención personalizada.",
  keywords: [
    "Hotel El Encino",
    "hotel Santiago Nuevo León",
    "hospedaje Santiago NL",
    "hotel centro Santiago",
    "hotel barato Santiago",
    "hospedaje Nuevo León",
  ],
  authors: [{ name: "Hotel El Encino Santiago" }],
  creator: "Hotel El Encino Santiago",
  metadataBase: new URL("https://hotelelencino.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://hotelelencino.com",
    siteName: "Hotel El Encino Santiago",
    title: "Hotel El Encino Santiago",
    description:
      "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte.",
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
      "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte.",
    images: [
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85",
    ],
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
