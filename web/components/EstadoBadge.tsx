import type { Estado } from "@/lib/tipos";

const ESTILO: Record<Estado, { texto: string; clases: string }> = {
  sin_iniciar: { texto: "Sin iniciar", clases: "bg-vw-dsb-10 text-vw-dsb-60" },
  parcial: { texto: "Parcial", clases: "bg-vw-amber/25 text-vw-deep-space" },
  completo: { texto: "Completo", clases: "bg-vw-green/15 text-vw-green" },
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  const { texto, clases } = ESTILO[estado];
  return (
    <span className={`inline-flex shrink-0 items-center px-2 py-0.5 text-xs font-medium ${clases}`}>
      {texto}
    </span>
  );
}

export function etiquetaEstado(estado: Estado): string {
  return ESTILO[estado].texto;
}
