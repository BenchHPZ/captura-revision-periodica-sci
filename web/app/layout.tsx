import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Captura SCI",
  description: "Captura de evidencias — Revisión periódica mensual de sistemas contra incendio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
