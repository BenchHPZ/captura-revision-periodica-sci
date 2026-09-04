// CSS compartido entre TODOS los tipos de documento imprimible: paleta de
// marca y reglas genéricas de tabla. Extraído de web/lib/rag/estilos.ts
// cuando el tipo "checklist" necesitó la misma base con una orientación
// de página distinta (ver docs/decisiones.md D-22). Como cadena, no como
// módulo .css, por la misma razón que el resto de lib/rag/: debe poder
// incrustarse tanto en <style dangerouslySetInnerHTML> como en un .html
// autocontenido escrito a disco.
export const ESTILOS_BASE_DOCUMENTO = /* css */ `
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

  .doc-tabla, .doc-tabla * {
    box-sizing: border-box;
  }

  .doc-tabla {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 1.5pt solid var(--vw-deep-space);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--vw-deep-space);
    font-size: 8pt;
    line-height: 1.3;
  }

  .doc-tabla th,
  .doc-tabla td {
    border: 0.75pt solid var(--vw-dsb-20);
    padding: 1.5pt 3pt;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
  }

  /* thead/tfoot se repiten nativamente en cada página impresa — ver
     docs/decisiones.md D-16. No hace falta programarlo, sólo declararlo. */
  .doc-tabla thead {
    display: table-header-group;
  }
  .doc-tabla tfoot {
    display: table-footer-group;
  }

  .doc-franja-superior td,
  .doc-titulo-fila td,
  .doc-instrucciones-fila td {
    border-left: none;
    border-right: none;
    padding: 3pt 4pt;
  }
  .doc-franja-superior td {
    border-top: none;
    padding-bottom: 2pt;
  }

  .doc-encabezado-linea {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 6pt;
  }

  .doc-clasificacion {
    display: inline-block;
    justify-self: start;
    border: 1pt solid var(--vw-deep-space);
    padding: 1pt 6pt;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .doc-logo {
    justify-self: center;
    line-height: 0;
  }
  .doc-logo svg {
    height: 9mm;
    width: auto;
    display: block;
  }

  .doc-titulo-fila td {
    text-align: center;
    border-top: none;
    padding-top: 0;
  }
  .doc-titulo {
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .doc-meta {
    margin-top: 1pt;
    color: var(--vw-dsb-60);
    font-size: 7pt;
  }

  .doc-instrucciones-fila td {
    border-top: none;
    padding-top: 1pt;
  }
  .doc-instrucciones {
    margin: 0;
    padding-left: 12pt;
    font-size: 7.5pt;
  }
  .doc-instrucciones li {
    margin-bottom: 1pt;
  }

  .doc-franja-pie td {
    border-left: none;
    border-right: none;
    border-bottom: none;
    padding: 3pt 4pt 2pt;
    font-size: 6.5pt;
    color: var(--vw-dsb-60);
    text-align: center;
  }

  @media screen {
    body {
      background: var(--vw-dsb-10);
      margin: 0;
      padding: 16px;
    }
  }

  @media print {
    body {
      margin: 0;
    }
  }
`;
