// CSS del documento checklist. Arranca de ESTILOS_BASE_DOCUMENTO (paleta
// + mecánica genérica de tabla, compartida con RAG — ver
// docs/decisiones.md D-22) y agrega lo propio: orientación apaisada,
// columnas de fecha, filas expandidas por verificación, la franja de
// portada con fotos de identificación.
import { ESTILOS_BASE_DOCUMENTO } from "../documentos/estilos-base";
import { PAGINA_POR_DEFECTO, reglaPaginaCss, type ConfiguracionPagina } from "../documentos/pagina";

export function estilosChecklist(pagina: ConfiguracionPagina = PAGINA_POR_DEFECTO): string {
  return /* css */ `
  ${ESTILOS_BASE_DOCUMENTO}

  .chk-doc {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  }

  /* ------------------------------------------------------ hoja / sección */

  /* La tabla de hoja: su thead es el encabezado de página y su tfoot el
     pie, repetidos por el navegador en cada página que ocupe. Todo el
     contenido va en una sola celda, como tablas anidadas por sección —
     ver docs/decisiones.md D-25. */
  .chk-hoja {
    margin-bottom: 6mm;
  }
  /* Sin padding ni borde propios: las tablas de sección de adentro deben
     empezar exactamente en el borde izquierdo de la tabla de hoja, o sus
     columnas de fecha dejarían de caer bajo la fila "Fecha" del
     encabezado. Selector con dos clases a propósito, para ganarle a
     ".doc-tabla td" de estilos-base.ts. */
  .doc-tabla td.chk-hoja-celda {
    padding: 0;
    border: 0;
  }
  /* La caja exterior la pone la tabla de hoja; una sección no dibuja la
     suya, o se vería un borde doble entre secciones consecutivas. */
  table.chk-seccion {
    border: 0;
    margin: 0;
  }

  .chk-instrucciones {
    margin: 0;
    padding: 3pt 4pt 3pt 16pt;
    font-size: 7.5pt;
  }

  /* ------------------------------------------------ sección general */

  .chk-general {
    display: flex;
    gap: 16pt;
    justify-content: center;
    margin-top: 2pt;
  }
  .chk-general-campo {
    font-size: 7.5pt;
    font-weight: 700;
    color: var(--vw-dsb-60);
    display: inline-flex;
    align-items: center;
    gap: 4pt;
  }
  .chk-general-caja {
    display: inline-block;
    width: 22mm;
    height: 4mm;
    border: 0.75pt solid var(--vw-deep-space);
  }

  /* --------------------------------------------- fecha / grupo / cierre */

  /* Selector con el ancestro a propósito: ".doc-tabla th" de
     estilos-base.ts fuerza text-align:left y le gana a una clase suelta.
     Se nota desde que la columna de etiquetas es ancha (la zona fija
     completa del grupo, hasta 111mm): alineada a la izquierda, "Fecha"
     quedaba a media hoja de las columnas que rotula. */
  .doc-tabla th.chk-etiqueta-fila {
    background: var(--vw-dsb-10);
    font-size: 7pt;
    font-weight: 700;
    text-align: right;
    padding-right: 6pt;
    white-space: nowrap;
  }
  .chk-fila-columna td {
    background: var(--vw-dsb-10);
  }
  .chk-celda-marca {
    background: #ffffff;
  }
  .chk-celda-cierre {
    height: 9mm;
    vertical-align: bottom;
    border-top: 0.75pt solid var(--vw-deep-space);
  }

  /* ------------------------------------------------- columnas fijas */

  .chk-encabezado-principal th {
    background: var(--vw-dsb-10);
    font-weight: 700;
    text-align: center;
    font-size: 7pt;
  }
  .chk-celda-pos {
    text-align: center;
    white-space: nowrap;
    font-weight: 700;
  }
  .chk-celda-nombre,
  .chk-celda-descripcion {
    white-space: normal;
  }
  .chk-celda-cantidad {
    text-align: center;
    white-space: nowrap;
  }
  .chk-celda-foto {
    text-align: center;
    padding: 1pt;
  }
  .chk-foto {
    max-width: 100%;
    max-height: 14mm;
    display: block;
    margin: 0 auto;
    object-fit: contain;
  }
  .chk-celda-verificacion {
    font-size: 7pt;
    white-space: normal;
  }

  /* ---------------------------------------------------------- categorías */

  .chk-categoria th {
    background: var(--vw-vivid-green);
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    text-align: left;
    padding: 2pt 4pt;
    border-top: 1.5pt solid var(--vw-deep-space);
    border-bottom: 1.5pt solid var(--vw-deep-space);
  }
  /* Sin break-inside:avoid a propósito — ahora vive en <thead>, que ya
     se mueve como unidad atómica al paginar (D-24), la regla no tenía
     efecto adicional. */

  /* Banner interno (2º nivel de agrupación, p. ej. categoría dentro de
     ubicación física) — más claro que .chk-categoria a propósito, para
     que se lea subordinado al externo sin competir con él. */
  .chk-subgrupo th {
    background: var(--vw-dsb-20);
    color: var(--vw-deep-space);
    font-size: 7.5pt;
    font-weight: 700;
    text-align: left;
    padding: 1.5pt 4pt 1.5pt 8pt;
    border-bottom: 0.75pt solid var(--vw-deep-space);
  }
  /* Ídem — ya vive en <thead>, ver nota junto a .chk-categoria arriba. */

  .chk-renglon {
    break-inside: avoid;
  }
  .chk-renglon:nth-child(even) td {
    background: #fbfcfc;
  }

  /* -------------------------------------------------------------- bitácora */

  .chk-bitacora th {
    background: var(--vw-dsb-10);
    font-weight: 700;
    text-align: center;
    font-size: 7pt;
  }

  /* --------------------------------------------------------------- portada */

  /* La portada es una sección más dentro de la hoja (ver
     docs/decisiones.md D-25): el encabezado, las filas de Fecha/Grupo y
     las de Nombre/Firma se las pone la tabla de hoja, igual que a
     cualquier otro bloque. Aquí sólo el padding de la celda que envuelve
     la cuadrícula de fotos. */
  .chk-portada-celda-grid {
    padding: 4mm;
  }
  .chk-portada-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4mm;
  }
  .chk-portada-tarjeta {
    border: 0.75pt solid var(--vw-dsb-20);
  }
  .chk-portada-imagen {
    height: 32mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vw-dsb-10);
  }
  .chk-portada-imagen img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .chk-portada-vacio {
    font-size: 7pt;
    color: var(--vw-dsb-60);
  }
  .chk-portada-etiqueta {
    text-align: center;
    padding: 1.5pt;
    font-size: 7.5pt;
    font-weight: 700;
  }

  /* -------------------------------------------------------------- pantalla */

  @media screen {
    .chk-doc {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      padding: 10mm;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
  }

  /* Tamaño y orientación vienen del formato, no de una constante cableada
     aquí: la misma ConfiguracionPagina alimenta este @page y el
     presupuesto de anchos de ./columnas.ts, así que no se pueden
     desincronizar. Ver docs/decisiones.md D-25. */
  @media print {
    @page {
      ${reglaPaginaCss(pagina)}
      margin: ${pagina.margenMM}mm;
    }
    .chk-doc {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .chk-salto-pagina {
      page-break-before: always;
    }
  }
`;
}
