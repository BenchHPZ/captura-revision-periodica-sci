"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", etiqueta: "Tablero" },
  { href: "/capturar", etiqueta: "Capturar" },
  { href: "/rag", etiqueta: "RAG" },
  { href: "/recepcion", etiqueta: "Recepción" },
  { href: "/configuracion", etiqueta: "Configuración" },
];

// Antes el encabezado tenía un solo elemento interactivo (cerrar sesión):
// cinco de las once rutas no tenían ninguna forma de volver al inicio.
// Ver docs/decisiones.md D-21.
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {ENLACES.map((e) => {
        const activo = e.href === "/" ? pathname === "/" : pathname.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            className={`px-3 py-1.5 text-sm transition ${
              activo ? "bg-vw-vivid-green text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
