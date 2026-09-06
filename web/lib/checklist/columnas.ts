// Columnas fijas por tipo de bloque, y la rebanada de columnas de fecha
// que hace posible imprimir un mes completo — mismo espíritu que
// web/lib/rag/columnas.ts (D-19: una sola fuente de verdad de anchos y
// conteos), pero resolviendo un problema distinto: ahí el número de
// columnas es fijo por documento (los puntos de la plantilla); aquí puede
// haber hasta 31 columnas de fecha, más de las que caben en una hoja, así
// que hay que decidir cuántas caben y repartir el resto en tablas
// adicionales (ver ./paginas.ts y render.ts).
//
// El ancho de la hoja ya no se supone aquí: llega como ConfiguracionPagina
// desde web/lib/documentos/pagina.ts, que es la única fuente que alimenta
// a la vez el @page del CSS y este presupuesto (ver docs/decisiones.md D-25).
import { presupuestoColumnasMM, type ConfiguracionPagina } from "../documentos/pagina";
import type { ColumnaFecha } from "./tipos";

/** Lo que este motor reserva para bordes de celda y redondeo. No es una
 * propiedad de la hoja: son decenas de columnas angostas, cada una con su
 * borde, a diferencia de RAG (que no reserva nada porque su columna de
 * Observaciones absorbe el sobrante). */
export const HOLGURA_CHECKLIST_MM = 8;

const ANCHO_COLUMNA_FECHA_MM = 8;

/** Ancho de la columna de etiquetas del encabezado de hoja
 * ("Fecha"/"Grupo"/"Nombre"/"Firma") cuando el grupo no trae ningún bloque
 * con columnas fijas de las que heredarlo — una portada o una bitácora
 * solas. Suficiente para que las cuatro etiquetas quepan en un renglón. */
export const ANCHO_ETIQUETA_MIN_MM = 20;

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

export type TipoBloqueConColumnasFijas = "tabla_verificacion" | "tabla_simple";

/** La columna que absorbe el sobrante cuando hay que estirar la zona fija
 * de un bloque para igualar la de otro que comparte hoja con él (ver
 * columnasFijasDe): siempre la de texto libre, la única que gana algo real
 * con más ancho. */
const ID_COLUMNA_FLEXIBLE: Record<TipoBloqueConColumnasFijas, string> = {
  tabla_verificacion: "nombre",
  tabla_simple: "descripcion",
};

export function presupuestoChecklistMM(pagina: ConfiguracionPagina): number {
  return presupuestoColumnasMM(pagina, HOLGURA_CHECKLIST_MM);
}

export function anchoColumnaFechaMM(): number {
  return ANCHO_COLUMNA_FECHA_MM;
}

export function anchoFijoDe(columnas: ColumnaFijaChecklist[]): number {
  return columnas.reduce((suma, c) => suma + c.anchoMM, 0);
}

/** Las columnas fijas (antes de las de fecha) dependen del tipo de
 * bloque: un bloque de equipo trae Cantidad/Foto/Verificación, el
 * sub-checklist mecánico sólo trae Descripción.
 *
 * `anchoObjetivoMM` estira la zona fija hasta ese ancho, dándole el
 * sobrante a la columna de texto libre. Lo usa un grupo de hoja que mezcla
 * bloques de tipos distintos: sus zonas fijas deben sumar lo MISMO para
 * que las columnas de fecha de todos empiecen en el mismo milímetro y
 * queden bajo la fila "Fecha" del encabezado de hoja (ver
 * docs/decisiones.md D-25). */
export function columnasFijasDe(tipo: TipoBloqueConColumnasFijas, anchoObjetivoMM?: number): ColumnaFijaChecklist[] {
  const base: ColumnaFijaChecklist[] =
    tipo === "tabla_simple"
      ? [
          { id: "numero", etiqueta: "#", anchoMM: ANCHO_POS_MM, clase: "chk-celda-pos" },
          { id: "descripcion", etiqueta: "Descripción", anchoMM: ANCHO_DESCRIPCION_MM, clase: "chk-celda-descripcion" },
        ]
      : [
          { id: "numero", etiqueta: "#", anchoMM: ANCHO_POS_MM, clase: "chk-celda-pos" },
          { id: "nombre", etiqueta: "Equipo", anchoMM: ANCHO_NOMBRE_MM, clase: "chk-celda-nombre" },
          { id: "cantidad", etiqueta: "Cant.", anchoMM: ANCHO_CANTIDAD_MM, clase: "chk-celda-cantidad" },
          { id: "foto", etiqueta: "Foto", anchoMM: ANCHO_FOTO_MM, clase: "chk-celda-foto" },
          { id: "verificacion", etiqueta: "Verificación", anchoMM: ANCHO_VERIFICACION_MM, clase: "chk-celda-verificacion" },
        ];

  if (anchoObjetivoMM === undefined) return base;
  const sobrante = anchoObjetivoMM - anchoFijoDe(base);
  if (sobrante <= 0) return base;
  const idFlexible = ID_COLUMNA_FLEXIBLE[tipo];
  return base.map((c) => (c.id === idFlexible ? { ...c, anchoMM: c.anchoMM + sobrante } : c));
}

/** Cuántas columnas de fecha caben junto a una zona fija de este ancho.
 * Siempre al menos 1: si la zona fija por sí sola ya excede el
 * presupuesto, la tabla igual se dibuja (se sale del margen antes que
 * perder datos — misma prioridad que ANCHO_OBSERVACIONES_MIN_MM en RAG). */
export function columnasFechaPorTabla(anchoFijoMM: number, pagina: ConfiguracionPagina): number {
  const disponible = presupuestoChecklistMM(pagina) - anchoFijoMM;
  return Math.max(1, Math.floor(disponible / ANCHO_COLUMNA_FECHA_MM));
}

/** Reparte columnasFecha en grupos que sí caben a lo ancho — cada grupo se
 * dibuja como su propia <table> de hoja, con salto de página entre ellas
 * (ver ./paginas.ts). Si columnasFecha viene vacío, regresa un solo grupo
 * vacío para que el bloque igual se imprima con sus columnas fijas. */
export function rebanarColumnasFecha(
  columnasFecha: ColumnaFecha[],
  anchoFijoMM: number,
  pagina: ConfiguracionPagina,
): ColumnaFecha[][] {
  if (columnasFecha.length === 0) return [[]];
  const porTabla = columnasFechaPorTabla(anchoFijoMM, pagina);
  const grupos: ColumnaFecha[][] = [];
  for (let i = 0; i < columnasFecha.length; i += porTabla) {
    grupos.push(columnasFecha.slice(i, i + porTabla));
  }
  return grupos;
}

/** El ancho de columna de fecha para un grupo que NO se rebana (portada o
 * bitácora solas): sus columnas de fecha aparecen únicamente en las filas
 * de encabezado y cierre de la hoja, así que caben todas juntas si se
 * angostan lo necesario. Nunca más anchas que las normales, para que un
 * documento con pocas columnas no las infle. */
export function anchoColumnaFechaAjustadoMM(
  totalColumnasFecha: number,
  anchoFijoMM: number,
  pagina: ConfiguracionPagina,
): number {
  if (totalColumnasFecha === 0) return ANCHO_COLUMNA_FECHA_MM;
  const disponible = presupuestoChecklistMM(pagina) - anchoFijoMM;
  return Math.min(ANCHO_COLUMNA_FECHA_MM, disponible / totalColumnasFecha);
}
