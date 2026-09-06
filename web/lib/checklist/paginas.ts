// Cómo se reparten los bloques de un checklist en hojas físicas.
//
// Antes cada bloque abría hoja nueva sin excepción, y además cada sección
// dentro de un bloque era su propia <table> con el encabezado completo
// repetido (D-24) — así que dos secciones que compartían hoja imprimían el
// membrete dos veces. Ahora los bloques consecutivos que no piden hoja
// propia forman un GRUPO DE HOJA, que se imprime como una sola tabla
// externa: su <thead>/<tfoot> son el encabezado y el pie de página, y el
// navegador los repite una vez por hoja. Ver docs/decisiones.md D-25.
import { ANCHO_ETIQUETA_MIN_MM, anchoColumnaFechaAjustadoMM, anchoColumnaFechaMM, anchoFijoDe, columnasFijasDe, rebanarColumnasFecha } from "./columnas";
import type { ConfiguracionPagina } from "../documentos/pagina";
import type { BloqueChecklist, ColumnaFecha } from "./tipos";

export interface GrupoHoja {
  indice: number;
  bloques: BloqueChecklist[];
}

/** Los bloques cuyos RENGLONES usan las columnas de fecha. Una portada o
 * una bitácora también llevan columnas de fecha en el encabezado y el pie
 * de la hoja (Fecha/Grupo arriba, Nombre/Firma abajo), pero su contenido
 * no depende de ellas. */
export function bloqueUsaColumnasFecha(bloque: BloqueChecklist): boolean {
  return bloque.tipo === "tabla_verificacion" || bloque.tipo === "tabla_simple";
}

/** Agrupa la lista ORDENADA de bloques en grupos de hoja: uno con
 * hojaPropia abre grupo nuevo; uno sin ella se une al grupo anterior.
 *
 * El primer bloque siempre abre grupo, sin importar su valor — no hay hoja
 * anterior a la cual unirse. El valor se conserva igual en la base y
 * sobrevive al ida y vuelta de exportar/importar; es el constructor quien
 * deshabilita la casilla en la primera fila para que no parezca que hace
 * algo. */
export function agruparBloquesEnHojas(bloques: BloqueChecklist[]): GrupoHoja[] {
  const grupos: GrupoHoja[] = [];
  for (const bloque of bloques) {
    const ultimo = grupos[grupos.length - 1];
    if (!ultimo || bloque.hojaPropia) {
      grupos.push({ indice: grupos.length, bloques: [bloque] });
    } else {
      ultimo.bloques.push(bloque);
    }
  }
  return grupos;
}

export interface RepartoHoja {
  /** Ancho común de la zona fija (antes de las columnas de fecha) para
   * TODOS los bloques del grupo. Es lo único que deben compartir para que
   * sus columnas de fecha caigan bajo la fila "Fecha" del encabezado de
   * hoja; cómo subdivide cada bloque esa zona es cosa suya, porque cada
   * uno imprime su propia tabla interna con su propio <colgroup>. */
  anchoFijoMM: number;
  anchoFechaMM: number;
  /** Una rebanada por tabla de hoja: cuando las columnas de fecha no caben
   * todas a lo ancho, se reparten en varias hojas. */
  rebanadas: ColumnaFecha[][];
}

/** El ancho de zona fija que necesita el bloque más exigente del grupo.
 * Un grupo sin bloques de tabla (una portada o una bitácora solas) no
 * hereda ninguno: usa el mínimo con el que las etiquetas del encabezado de
 * hoja caben en un renglón. */
function anchoFijoDeGrupo(grupo: GrupoHoja): number {
  const anchos = grupo.bloques
    .filter(bloqueUsaColumnasFecha)
    .map((b) => anchoFijoDe(columnasFijasDe(b.tipo as "tabla_verificacion" | "tabla_simple")));
  return anchos.length > 0 ? Math.max(...anchos) : ANCHO_ETIQUETA_MIN_MM;
}

export function repartoDeGrupo(
  grupo: GrupoHoja,
  columnasFecha: ColumnaFecha[],
  pagina: ConfiguracionPagina,
): RepartoHoja {
  const anchoFijoMM = anchoFijoDeGrupo(grupo);

  // Rebanar sólo tiene sentido si algún bloque del grupo usa las columnas
  // de fecha en sus renglones: una hoja de portada o de bitácora las lleva
  // únicamente en el encabezado y el pie, así que caben todas juntas
  // angostándolas — y rebanarla repetiría su contenido (la cuadrícula de
  // fotos, los renglones en blanco) una vez por rebanada, que es
  // justamente lo que no queremos.
  if (!grupo.bloques.some(bloqueUsaColumnasFecha)) {
    return {
      anchoFijoMM,
      anchoFechaMM: anchoColumnaFechaAjustadoMM(columnasFecha.length, anchoFijoMM, pagina),
      rebanadas: [columnasFecha],
    };
  }

  return {
    anchoFijoMM,
    anchoFechaMM: anchoColumnaFechaMM(),
    rebanadas: rebanarColumnasFecha(columnasFecha, anchoFijoMM, pagina),
  };
}
