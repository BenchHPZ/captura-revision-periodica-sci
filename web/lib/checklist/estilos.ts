// CSS del documento checklist. Arranca de ESTILOS_BASE_DOCUMENTO (paleta
// + mecánica genérica de tabla, compartida con RAG — ver
// docs/decisiones.md D-22) y agrega lo propio: orientación apaisada,
// columnas de fecha, filas expandidas por verificación, la franja de
// portada con fotos de identificación.
import { ESTILOS_BASE_DOCUMENTO } from "../documentos/estilos-base";

export const ESTILOS_CHECKLIST = /* css */ `
  ${ESTILOS_BASE_DOCUMENTO}

  .chk-doc {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  }

  .chk-tabla {
    margin-bottom: 6mm;
  }
  /* Varias hojas de la misma rebanada de fecha ya no fuerzan un salto de
     página entre sí (ver docs/decisiones.md D-24) — sin este ajuste se
     verían como cajas separadas con huecos en vez de una tabla continua.
     Sólo se fusionan los bordes entre dos tablas consecutivas que NO
     tengan un salto forzado entre ellas (.chk-salto-pagina marca dónde sí
     empieza una sección/rebanada nueva). */
  .chk-tabla:has(+ .chk-tabla:not(.chk-salto-pagina)) {
    margin-bottom: 0;
    border-bottom: none;
  }
  .chk-tabla + .chk-tabla:not(.chk-salto-pagina) {
    border-top: none;
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

  .chk-etiqueta-fila {
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

  /* La portada ya es una <table class="doc-tabla chk-tabla chk-portada">
     más (ver docs/decisiones.md D-24) — el borde y el margen los pone
     .doc-tabla/.chk-tabla; aquí sólo el padding de la celda que envuelve
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

  /* Apaisada a propósito — pedido explícito del usuario para este tipo
     de documento (a diferencia de RAG, que es vertical). */
  @media print {
    @page {
      size: letter landscape;
      margin: 8mm;
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
