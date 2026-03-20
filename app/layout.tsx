import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel El Encino Santiago | Centro Histórico, N.L.",
  description:
    "Un lugar en el corazón de Santiago, Nuevo León, perfecto para descansar y desconectarte. Habitaciones limpias, cómodas y atención personalizada.",
  keywords: ["hotel", "Santiago Nuevo León", "hospedaje", "descanso", "centro histórico", "Hotel El Encino"],
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
