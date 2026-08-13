"use client";

import Link from "next/link";

interface Props {
  /** Fragmento (sin <style>) para mostrarse embebido en esta página. */
  html: string;
  /** Documento completo y autocontenido — el que de verdad se imprime,
   * libre de los estilos del resto de la app. Su <title> (en render.ts)
   * es el nombre que Chrome/Edge sugieren al "Guardar como PDF". */
  htmlCompleto: string;
  modo: "vacio" | "lleno";
  hrefVacio: string;
  hrefLleno: string;
  volverHref: string;
}

/**
 * Imprime htmlCompleto en un iframe oculto en vez de la página actual:
 * así la impresión no arrastra el encabezado de la app ni queda acotada
 * por su ancho. Es también el único camino a PDF (ver docs/decisiones.md
 * D-16 §7.5): no hay botón de descarga directa porque el navegador no
 * deja preseleccionar "Guardar como PDF" ni saltarse su diálogo desde
 * JavaScript — es una frontera de seguridad, no algo que este código
 * pueda evitar. Una vez elegido "Guardar como PDF" aquí, Chrome/Edge lo
 * recuerdan como destino para la próxima impresión.
 */
function imprimir(htmlCompleto: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const documento = iframe.contentWindow?.document;
  if (!documento) {
    document.body.removeChild(iframe);
    return;
  }
  documento.open();
  documento.write(htmlCompleto);
  documento.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Quitar el iframe de inmediato cancela el diálogo de impresión en
    // algunos navegadores; se le da un respiro antes de retirarlo.
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}

export function VisorRAG({ html, htmlCompleto, modo, hrefVacio, hrefLleno, volverHref }: Props) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={volverHref} className="text-sm text-vw-dsb-60 hover:text-vw-vivid-green">
          ← Formatos RAG
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-vw-dsb-20 text-sm">
            <Link
              href={hrefVacio}
              className={`px-3 py-1.5 transition ${
                modo === "vacio" ? "bg-vw-deep-space text-white" : "text-vw-deep-space hover:bg-vw-vg-10"
              }`}
            >
              Vacío
            </Link>
            <Link
              href={hrefLleno}
              className={`px-3 py-1.5 transition ${
                modo === "lleno" ? "bg-vw-deep-space text-white" : "text-vw-deep-space hover:bg-vw-vg-10"
              }`}
            >
              Con lo capturado
            </Link>
          </div>
          <button
            type="button"
            onClick={() => imprimir(htmlCompleto)}
            className="bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* HTML generado por lib/rag/render.ts, no entrada del usuario */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
