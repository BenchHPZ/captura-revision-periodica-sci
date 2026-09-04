// Columnas fijas por tipo de bloque, y la rebanada de columnas de fecha
// que hace posible imprimir un mes completo en hojas apaisadas — mismo
// espíritu que web/lib/rag/columnas.ts (D-19: una sola fuente de verdad
// de anchos y conteos), pero resolviendo un problema distinto: ahí el
// número de columnas es fijo por documento (los puntos de la plantilla);
// aquí puede haber hasta 31 columnas de fecha, más de las que caben en
// una sola hoja, así que hay que decidir cuántas caben por tabla y
// repartir el resto en tablas adicionales con salto de página entre
// ellas (ver render.ts).
import type { ColumnaFecha } from "./tipos";

// Presupuesto de ancho en milímetros para Carta apaisada: 279.4mm de
// ancho físico menos 2×8mm de margen ≈ 263mm; se deja margen de
// seguridad para bordes de celda y redondeo.
const ANCHO_PAGINA_APAISADA_MM = 255;
const ANCHO_COLUMNA_FECHA_MM = 8;

const ANCHO_POS_MM = 8;
const ANCHO_NOMBRE_MM = 45;
const ANCHO_CANTIDAD_MM = 12;
const ANCHO_FOTO_MM = 18;
const ANCHO_VERIFICACION_MM = 28;
const ANCHO_DESCRIPCION_MM = 60;

export interface ColumnaFijaChecklist {
  id: string;
  etiqueta: string;
  anchoMM: number;
  clase: string;
}

/** Las columnas fijas (antes de las de fecha) dependen del tipo de
 * bloque: un bloque de equipo trae Cantidad/Foto/Verificación, el
 * sub-checklist mecánico sólo trae Descripción. */
export function columnasFijasDe(tipo: "tabla_verificacion" | "tabla_simple"): ColumnaFijaChecklist[] {
  if (tipo === "tabla_simple") {
    return [
      { id: "pos", etiqueta: "Pos.", anchoMM: ANCHO_POS_MM, clase: "chk-celda-pos" },
      { id: "descripcion", etiqueta: "Descripción", anchoMM: ANCHO_DESCRIPCION_MM, clase: "chk-celda-descripcion" },
    ];
  }
  return [
    { id: "pos", etiqueta: "Pos.", anchoMM: ANCHO_POS_MM, clase: "chk-celda-pos" },
    { id: "nombre", etiqueta: "Equipo", anchoMM: ANCHO_NOMBRE_MM, clase: "chk-celda-nombre" },
    { id: "cantidad", etiqueta: "Cant.", anchoMM: ANCHO_CANTIDAD_MM, clase: "chk-celda-cantidad" },
    { id: "foto", etiqueta: "Foto", anchoMM: ANCHO_FOTO_MM, clase: "chk-celda-foto" },
    { id: "verificacion", etiqueta: "Verificación", anchoMM: ANCHO_VERIFICACION_MM, clase: "chk-celda-verificacion" },
  ];
}

export function anchoColumnaFechaMM(): number {
  return ANCHO_COLUMNA_FECHA_MM;
}

/** Cuántas columnas de fecha caben en una tabla junto a estas columnas
 * fijas, dado el presupuesto de una hoja Carta apaisada. Siempre al
 * menos 1: si las columnas fijas por sí solas ya exceden el presupuesto,
 * la tabla igual se dibuja (se sale del margen antes que perder datos —
 * es la misma prioridad que ANCHO_OBSERVACIONES_MIN_MM en RAG). */
export function columnasFechaPorTabla(columnasFijas: ColumnaFijaChecklist[]): number {
  const anchoFijo = columnasFijas.reduce((suma, c) => suma + c.anchoMM, 0);
  const disponible = ANCHO_PAGINA_APAISADA_MM - anchoFijo;
  return Math.max(1, Math.floor(disponible / ANCHO_COLUMNA_FECHA_MM));
}

/** Reparte columnasFecha en grupos de tamaño columnasFechaPorTabla() —
 * cada grupo se dibuja como su propia <table>, con salto de página entre
 * ellas (ver render.ts). Si columnasFecha viene vacío, regresa un solo
 * grupo vacío para que el bloque igual se imprima con sus columnas fijas. */
export function rebanarColumnasFecha(columnasFecha: ColumnaFecha[], columnasFijas: ColumnaFijaChecklist[]): ColumnaFecha[][] {
  const porTabla = columnasFechaPorTabla(columnasFijas);
  if (columnasFecha.length === 0) return [[]];
  const grupos: ColumnaFecha[][] = [];
  for (let i = 0; i < columnasFecha.length; i += porTabla) {
    grupos.push(columnasFecha.slice(i, i + porTabla));
  }
  return grupos;
}
