"use client";

import { VisorDocumento } from "@/components/VisorDocumento";

interface Props {
  html: string;
  htmlCompleto: string;
  modo: "vacio" | "lleno";
  hrefVacio: string;
  hrefLleno: string;
  volverHref?: string;
}

/** Delgado a propósito: la lógica de impresión por iframe oculto vivía
 * aquí hasta que el tipo "checklist" necesitó lo mismo — se generalizó a
 * web/components/VisorDocumento.tsx (ver docs/decisiones.md D-22). Este
 * archivo sigue existiendo para no tocar el import en
 * sistemas/[clave]/page.tsx. */
export function VisorRAG(props: Props) {
  return <VisorDocumento {...props} />;
}
