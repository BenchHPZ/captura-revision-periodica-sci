// Tamaño y orientación de hoja: una sola fuente de verdad para el CSS que
// se imprime y para el presupuesto en milímetros con el que cada motor
// decide sus anchos de columna.
//
// Antes el supuesto "Carta, margen 8mm" vivía duplicado a mano en cuatro
// lugares que nadie ataba entre sí: el `@page` de checklist/estilos.ts, el
// 255 de checklist/columnas.ts, el presupuesto propio de la portada en
// checklist/render.ts, y el 200 de rag/columnas.ts. Cambiar de hoja exigía
// tocarlos en coordinación y nada avisaba si se desincronizaban — el
// síntoma habría sido un documento que se sale del papel al imprimir, sin
// ningún error visible antes. Ver docs/decisiones.md D-25.
//
// Módulo puro (sin Next, sin React, sin Supabase), igual que
// ./constantes.ts y ./estilos-base.ts, para que los scripts de
// verificación puedan importarlo.

export type ClaveTamanoHoja = "a4" | "carta" | "oficio";
export type OrientacionHoja = "vertical" | "apaisada";

export interface TamanoHoja {
  etiqueta: string;
  /** Lado corto, en vertical. */
  anchoMM: number;
  /** Lado largo, en vertical. */
  altoMM: number;
  /** Palabra clave de `@page size` cuando CSS la reconoce; null obliga a
   * emitir las medidas en milímetros (Oficio no es una palabra clave). */
  palabraClaveCss: string | null;
}

export const TAMANOS_HOJA: Record<ClaveTamanoHoja, TamanoHoja> = {
  a4: { etiqueta: "A4", anchoMM: 210, altoMM: 297, palabraClaveCss: "a4" },
  carta: { etiqueta: "Carta", anchoMM: 215.9, altoMM: 279.4, palabraClaveCss: "letter" },
  oficio: { etiqueta: "Oficio", anchoMM: 216, altoMM: 340, palabraClaveCss: null },
};

export interface ConfiguracionPagina {
  tamano: ClaveTamanoHoja;
  orientacion: OrientacionHoja;
  margenMM: number;
}

export const MARGEN_HOJA_MM = 8;

/** A4 vertical: lo que pidió el área como estándar para documentos
 * nuevos (ver docs/decisiones.md D-25). Sirve de respaldo cuando se arma
 * un documento sin formato detrás (scripts de verificación, pruebas). */
export const PAGINA_POR_DEFECTO: ConfiguracionPagina = {
  tamano: "a4",
  orientacion: "vertical",
  margenMM: MARGEN_HOJA_MM,
};

/** La configuración de un formato de la base. Tipado estructural a
 * propósito: este módulo no conoce `Formato` (es al revés — tipos.ts
 * importa de aquí). El margen no es configurable por formato: 8mm es lo
 * que los tres tamaños toleran sin que la impresora recorte. */
export function paginaDeFormato(formato: { tamano_hoja: ClaveTamanoHoja; orientacion: OrientacionHoja }): ConfiguracionPagina {
  return { tamano: formato.tamano_hoja, orientacion: formato.orientacion, margenMM: MARGEN_HOJA_MM };
}

export function esClaveTamanoHoja(valor: string): valor is ClaveTamanoHoja {
  return valor === "a4" || valor === "carta" || valor === "oficio";
}

export function esOrientacionHoja(valor: string): valor is OrientacionHoja {
  return valor === "vertical" || valor === "apaisada";
}

/** Las dimensiones ya orientadas: en apaisada se intercambian los lados. */
export function dimensionesPagina(pagina: ConfiguracionPagina): { anchoMM: number; altoMM: number } {
  const { anchoMM, altoMM } = TAMANOS_HOJA[pagina.tamano];
  return pagina.orientacion === "apaisada" ? { anchoMM: altoMM, altoMM: anchoMM } : { anchoMM, altoMM };
}

export function anchoUtilMM(pagina: ConfiguracionPagina): number {
  return dimensionesPagina(pagina).anchoMM - 2 * pagina.margenMM;
}

export function altoUtilMM(pagina: ConfiguracionPagina): number {
  return dimensionesPagina(pagina).altoMM - 2 * pagina.margenMM;
}

/** El ancho con el que un motor reparte sus columnas. `holguraMM` es lo
 * que ese motor reserva para bordes de celda y redondeo, no algo de la
 * hoja: checklist necesita ~8mm (tiene decenas de columnas angostas, cada
 * una con su borde), RAG no reserva nada porque su columna de
 * Observaciones absorbe el sobrante.
 *
 * Con Math.round reproduce exactamente los números que hasta ahora estaban
 * tecleados a mano: 255 para Carta apaisada con 8mm de holgura, 200 para
 * Carta vertical sin holgura. Los verificadores lo asertan, para que este
 * cambio de infraestructura sea demostrablemente neutro. */
export function presupuestoColumnasMM(pagina: ConfiguracionPagina, holguraMM: number): number {
  return Math.round(anchoUtilMM(pagina) - holguraMM);
}

/** La regla `@page` correspondiente, para interpolarse en el CSS del
 * documento. */
export function reglaPaginaCss(pagina: ConfiguracionPagina): string {
  const { palabraClaveCss } = TAMANOS_HOJA[pagina.tamano];
  if (palabraClaveCss) {
    const orientacion = pagina.orientacion === "apaisada" ? "landscape" : "portrait";
    return `size: ${palabraClaveCss} ${orientacion};`;
  }
  // Sin palabra clave hay que dar las medidas ya orientadas. Ojo: si el
  // usuario elige otro papel en el diálogo de impresión, el navegador
  // escala el documento y los milímetros dejan de ser milímetros — no hay
  // forma de evitarlo desde el código.
  const { anchoMM, altoMM } = dimensionesPagina(pagina);
  return `size: ${anchoMM}mm ${altoMM}mm;`;
}

export function descripcionPagina(pagina: ConfiguracionPagina): string {
  const orientacion = pagina.orientacion === "apaisada" ? "apaisada" : "vertical";
  return `${TAMANOS_HOJA[pagina.tamano].etiqueta} ${orientacion}, margen ${pagina.margenMM} mm`;
}
