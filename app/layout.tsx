import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa Pedrera — Hotel Boutique | Santiago, N.L.",
  description:
    "Un refugio de 9 habitaciones en las faldas de la Sierra Madre. Donde el silencio de la montaña se une al confort contemporáneo.",
  keywords: ["hotel boutique", "Santiago Nuevo León", "Sierra Madre", "lujo", "descanso"],
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
