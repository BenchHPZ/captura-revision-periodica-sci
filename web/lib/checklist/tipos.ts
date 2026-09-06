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
  /** Segunda dimensión de agrupación, independiente de 'categoria' — ver
   * docs/decisiones.md D-22 y la migración 0009. */
  ubicacionFisica: string | null;
  /** Correlativo 1..N calculado al armar el documento, no tecleado — ver
   * docs/decisiones.md D-24. Reemplaza al viejo 'pos' (texto libre,
   * heredado de transcribir PDFs de origen, que podía repetirse: "63"
   * aparece 6 veces en el checklist real de la ambulancia). Se numera por
   * BLOQUE, de corrido a través de sus categorías/ubicaciones — mismo
   * patrón que RenglonRAG.id en web/lib/rag/documento.ts. */
  numero: number;
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
  /** true: el bloque empieza en hoja nueva. false: continúa en la hoja del
   * bloque anterior, y sólo se parte donde caiga el salto natural por
   * tamaño de papel. Ignorado en el primer bloque (no hay hoja anterior a
   * la cual unirse). Ver docs/decisiones.md D-25 y la migración 0011. */
  hojaPropia: boolean;
}

export interface BloquePortadaFotos extends BloqueChecklistBase {
  tipo: "portada_fotos";
  items: ItemChecklist[];
}

export type CampoAgrupacionChecklist = "categoria" | "ubicacion_fisica";

/** Nodo de agrupación, hasta 2 niveles de anidado según el 'agrupacion'
 * del bloque (ver docs/decisiones.md D-22 y la migración 0009) — mismo
 * propósito visual que SeccionRAG (franja de sección), pero configurable
 * en vez de fijo a un solo campo. Un nodo hoja trae 'items' poblado y
 * 'subgrupos' vacío; un nodo con un nivel más de agrupación debajo trae
 * 'subgrupos' poblado e 'items' vacío. Cuando 'agrupacion' del bloque es
 * [], hay un único nodo raíz implícito con 'nombre: null' (sin banner) y
 * todos los ítems como hoja. */
export interface GrupoChecklist {
  nombre: string | null;
  items: ItemChecklist[];
  subgrupos: GrupoChecklist[];
}

export interface BloqueTablaVerificacion extends BloqueChecklistBase {
  tipo: "tabla_verificacion";
  grupos: GrupoChecklist[];
}

export interface BloqueTablaSimple extends BloqueChecklistBase {
  tipo: "tabla_simple";
  grupos: GrupoChecklist[];
}

export interface BloqueBitacoraLibre extends BloqueChecklistBase {
  tipo: "bitacora_libre";
  columnas: ColumnaBitacora[];
  filasBlanco: number;
  /** Alto en milímetros de cada renglón en blanco — antes no existía y las
   * filas quedaban de ~2.5mm, imposibles de llenar a mano. Ver
   * docs/decisiones.md D-25. */
  altoFilaMM: number;
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
