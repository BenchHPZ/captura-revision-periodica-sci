// CSS del documento RAG, como cadena — no un módulo .css, para que la
// misma definición se pueda incrustar tanto en una página de la app
// (<style dangerouslySetInnerHTML>) como en un .html autocontenido escrito
// a disco (ver docs/decisiones.md D-16). Colores tomados literales de
// web/tailwind.config.ts — no se inventan aquí, para que la identidad
// visual del documento no diverja de la del resto de la app (RNF-05).
//
// Fondo claro en todo el documento, a propósito: los RAG de origen son
// blancos de punta a punta, con el verde reservado a los divisores de
// sección — ver las fotos de referencia que dieron forma a este diseño
// (docs/decisiones.md D-15 §7.4).
import { PAGINA_POR_DEFECTO, reglaPaginaCss, type ConfiguracionPagina } from "../documentos/pagina";

export function estilosRag(pagina: ConfiguracionPagina = PAGINA_POR_DEFECTO): string {
  return /* css */ `
  :root {
    --vw-deep-space: #002733;
    --vw-vivid-green: #008C82;
    --vw-dsb-60: #667D85;
    --vw-dsb-20: #CCD4D6;
    --vw-dsb-10: #E5E9EB;
    --vw-amber: #FCCD22;
    --vw-red: #DA0C1F;
    --vw-green: #64A844;
  }

  .rag-doc, .rag-doc * {
    box-sizing: border-box;
  }

  .rag-doc {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--vw-deep-space);
    font-size: 8pt;
    line-height: 1.3;
  }

  /* La tabla de hoja: su thead es el membrete y su tfoot el pie con las
     firmas, repetidos por el navegador en cada página. Dentro, una tabla
     por zona (.rag-tabla) — ver docs/decisiones.md D-25. */
  .rag-hoja {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 1.5pt solid var(--vw-deep-space);
  }
  /* Sin padding ni borde: las tablas de zona empiezan justo en el borde
     de la hoja. Dos clases a propósito, para ganarle a ".rag-hoja td". */
  .rag-hoja td.rag-hoja-celda {
    padding: 0;
    border: 0;
  }

  .rag-tabla {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 0;
  }

  .rag-hoja th,
  .rag-hoja td {
    border: 0.75pt solid var(--vw-dsb-20);
    padding: 1.5pt 3pt;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
  }

  /* thead/tfoot se repiten nativamente en cada página impresa — ver
     docs/decisiones.md D-16. No hace falta programarlo, sólo declararlo.
     Aplica igual a la tabla de hoja (membrete y firmas) y a las de zona
     (banner y encabezados de columna). */
  .rag-hoja thead,
  .rag-tabla thead {
    display: table-header-group;
  }
  .rag-hoja tfoot,
  .rag-tabla tfoot {
    display: table-footer-group;
  }

  /* ---------------------------------------------------------- encabezado */

  .rag-franja-superior td,
  .rag-titulo-fila td,
  .rag-instrucciones-fila td {
    border-left: none;
    border-right: none;
    padding: 3pt 4pt;
  }
  .rag-franja-superior td {
    border-top: none;
    padding-bottom: 2pt;
  }

  .rag-encabezado-linea {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 6pt;
  }

  .rag-clasificacion {
    display: inline-block;
    justify-self: start;
    border: 1pt solid var(--vw-deep-space);
    padding: 1pt 6pt;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .rag-logo {
    justify-self: center;
    line-height: 0;
  }
  .rag-logo svg {
    height: 9mm;
    width: auto;
    display: block;
  }

  .rag-titulo-fila td {
    text-align: center;
    border-top: none;
    padding-top: 0;
  }
  .rag-titulo {
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .rag-meta {
    margin-top: 1pt;
    color: var(--vw-dsb-60);
    font-size: 7pt;
  }

  .rag-instrucciones-fila td {
    border-top: none;
    padding-top: 1pt;
  }
  .rag-instrucciones {
    margin: 0;
    padding-left: 12pt;
    font-size: 7.5pt;
  }
  .rag-instrucciones li {
    margin-bottom: 1pt;
  }

  /* ------------------------------------------------------- columnas fijas */

  .rag-celda-id {
    text-align: center;
    color: var(--vw-dsb-60);
    white-space: nowrap;
  }
  .rag-celda-numeracion {
    font-weight: 700;
    white-space: nowrap;
  }
  .rag-celda-ubicacion {
    white-space: nowrap;
  }
  /* Tamaño menor a propósito: es una ayuda a la ubicación, no el dato
     principal del renglón — no compite en jerarquía con Numeración. */
  .rag-celda-referencia {
    white-space: normal;
    font-size: 7pt;
  }
  .rag-celda-tipo {
    white-space: nowrap;
    text-align: center;
  }
  .rag-celda-obs {
    white-space: normal;
  }

  /* ---------------------------------------------- puntos de revisión */

  .rag-encabezado-principal th {
    background: var(--vw-dsb-10);
    font-weight: 700;
    text-align: center;
  }
  .rag-celda-id,
  .rag-celda-numeracion,
  .rag-celda-ubicacion,
  .rag-celda-referencia,
  .rag-celda-tipo,
  .rag-celda-obs {
    background: var(--vw-dsb-10);
  }
  thead .rag-celda-id,
  thead .rag-celda-numeracion,
  thead .rag-celda-ubicacion,
  thead .rag-celda-referencia,
  thead .rag-celda-tipo,
  thead .rag-celda-obs {
    text-align: center;
    font-weight: 700;
  }

  /* Etiqueta del punto en vertical: ahorra ancho de columna a cambio de
     alto de encabezado — ver docs/decisiones.md D-15 §7.4. La altura es
     FIJA a propósito: sin tope, una etiqueta larga estira el encabezado
     hacia abajo y, como el encabezado se repite en cada hoja, ese exceso
     se paga en todas. Con el tope, la etiqueta larga se parte en dos
     renglones verticales (cabe de sobra en los 10mm de la columna) y
     todas las columnas quedan a la misma altura. */
  .rag-punto-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: normal;
    overflow-wrap: break-word;
    height: 18mm;
    vertical-align: bottom;
    text-align: left;
    padding: 2pt 1pt;
    font-size: 6.5pt;
    line-height: 1.15;
  }
  .rag-celda-punto-simple {
    font-size: 7pt;
  }

  /* La respuesta se escribe dentro de la única celda del punto — ya no
     hay sub-columnas SI/NO que marcar con "X". */
  .rag-respuesta {
    text-align: center;
    font-weight: 700;
    font-size: 7.5pt;
  }
  .rag-respuesta-si {
    color: var(--vw-green);
  }
  .rag-respuesta-no {
    color: var(--vw-red);
  }
  .rag-respuesta-na {
    color: var(--vw-dsb-60);
  }

  /* ------------------------------------------------------------ secciones */

  /* "Enmarcadas como tabla": franja verde a todo lo ancho con regla
     gruesa arriba y abajo, para que cada sección se lea como un bloque
     propio dentro del documento — ver docs/decisiones.md D-15 §7.4. */
  .rag-seccion th {
    background: var(--vw-vivid-green);
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    text-align: left;
    padding: 2pt 4pt;
    border-top: 1.5pt solid var(--vw-deep-space);
    border-bottom: 1.5pt solid var(--vw-deep-space);
  }
  /* Sin break-inside:avoid a propósito — ahora vive en <thead> (una tabla
     por zona, ver D-24), que ya se mueve como unidad atómica al paginar. */

  .rag-renglon {
    break-inside: avoid;
  }
  .rag-renglon:nth-child(even) td {
    background: #fbfcfc;
  }

  /* ------------------------------------------------------------------ pie */

  .rag-franja-pie td {
    border-left: none;
    border-right: none;
    border-bottom: none;
    padding: 3pt 4pt 2pt;
    font-size: 6.5pt;
    color: var(--vw-dsb-60);
    text-align: center;
  }

  .rag-cierre-celda {
    border: none !important;
    padding: 4pt 0 0 !important;
  }
  .rag-cierre-inner {
    width: 100%;
    border-collapse: collapse;
  }
  .rag-cierre-inner td {
    border: 0.75pt solid var(--vw-dsb-20);
    padding: 2pt 4pt;
    vertical-align: bottom;
  }
  .rag-cierre-etiqueta {
    font-size: 6.5pt;
    font-weight: 700;
    color: var(--vw-dsb-60);
    margin-bottom: 8pt;
  }
  .rag-cierre-espacio {
    border-top: 0.75pt solid var(--vw-deep-space);
    height: 11pt;
  }
  .rag-cierre-row {
    break-inside: avoid;
  }
  .rag-cierre-final {
    margin-top: 10pt;
    break-inside: avoid;
  }

  /* -------------------------------------------------------------- pantalla */

  @media screen {
    body {
      background: var(--vw-dsb-10);
      margin: 0;
      padding: 16px;
    }
    .rag-doc {
      max-width: 950px;
      margin: 0 auto;
      background: #ffffff;
      padding: 10mm;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
  }

  /* Tamaño y orientación vienen del formato, no de una constante cableada
     aquí: la misma ConfiguracionPagina alimenta este @page y el
     presupuesto de anchos de ./columnas.ts. Ver docs/decisiones.md D-25. */
  @media print {
    @page {
      ${reglaPaginaCss(pagina)}
      margin: ${pagina.margenMM}mm;
    }
    body {
      margin: 0;
    }
    .rag-doc {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;
}
