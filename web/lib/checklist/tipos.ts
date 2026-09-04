// Forma del documento checklist ya armado, lista para imprimirse — mismo
// principio de pureza que web/lib/rag/tipos.ts (sin Next, sin Supabase,
// sin React). No extiende DocumentoRAG: ahí una fila es un elemento de
// catálogo y una columna es un punto de revisión de una plantilla
// compartida, con un único bloque de cierre al final del documento. Aquí
// una fila es un ítem propio del documento (sin relación a
// elementos/sistemas/plantillas), una columna es una fecha de revisión
// repetida con Fecha+Grupo en el encabezado y Nombre+Firma en el pie por
// CADA columna — forzarlo dentro de RenglonRAG/CierreFormato habría hecho
// mentir a 'elementoId' y a 'cierre.repetir' (pensado para un bloque
// único, no por columna). Ver docs/decisiones.md D-22.
import type { EncabezadoFormato } from "../rag/tipos";

export type TipoBloqueChecklist = "portada_fotos" | "tabla_verificacion" | "tabla_simple" | "bitacora_libre";

export interface VerificacionChecklist {
  id: string;
  etiqueta: string;
}

/** Un renglón del checklist: un "Equipo" (con foto de referencia y una o
 * más verificaciones) o una "Descripción" del sub-checklist mecánico
 * (sin foto ni verificaciones). */
export interface ItemChecklist {
  id: string;
  categoria: string | null;
  /** Rótulo tal cual el documento de origen; puede repetirse — no es
   * clave de nada, sólo se imprime. */
  pos: string | null;
  nombre: string;
  cantidad: string | null;
  /** URL firmada, ya resuelta — quien arma el documento resuelve la ruta
   * de Storage contra el depósito (ver docs/decisiones.md D-22). */
  fotoReferenciaUrl: string | null;
  verificaciones: VerificacionChecklist[];
}

export interface ColumnaBitacora {
  id: string;
  etiqueta: string;
}

interface BloqueChecklistBase {
  nombre: string;
}

export interface BloquePortadaFotos extends BloqueChecklistBase {
  tipo: "portada_fotos";
  items: ItemChecklist[];
}

/** Ítems agrupados por 'categoria' — mismo propósito visual que
 * SeccionRAG (franja de sección), pero 'categoria' es texto libre propio
 * del checklist, no un catálogo compartido. */
export interface CategoriaChecklist {
  nombre: string;
  items: ItemChecklist[];
}

export interface BloqueTablaVerificacion extends BloqueChecklistBase {
  tipo: "tabla_verificacion";
  categorias: CategoriaChecklist[];
}

export interface BloqueTablaSimple extends BloqueChecklistBase {
  tipo: "tabla_simple";
  categorias: CategoriaChecklist[];
}

export interface BloqueBitacoraLibre extends BloqueChecklistBase {
  tipo: "bitacora_libre";
  columnas: ColumnaBitacora[];
  filasBlanco: number;
}

export type BloqueChecklist = BloquePortadaFotos | BloqueTablaVerificacion | BloqueTablaSimple | BloqueBitacoraLibre;

/** Una fecha de revisión repetida — la columna que se rebana entre varias
 * tablas para que quepan en el ancho de una hoja apaisada (ver
 * ./columnas.ts). 'etiqueta' queda en blanco a propósito: es el
 * especialista en turno quien anota la fecha real a mano al imprimir el
 * documento vacío, igual que en el papel de origen. */
export interface ColumnaFecha {
  id: string;
}

export interface DocumentoChecklist {
  clave: string;
  nombre: string;
  encabezado: EncabezadoFormato;
  /** Sólo las instrucciones propias de este checklist. */
  instrucciones: string[];
  columnasFecha: ColumnaFecha[];
  bloques: BloqueChecklist[];
  generado: string;
  cicloClave: string | null;
  cicloNombre: string | null;
}
