// Forma del documento RAG ya armado, lista para imprimirse. Deliberadamente
// independiente de Supabase, de Next y de React — la usan tanto la vista de
// la app (web/app/(app)/rag) como, más adelante, un generador local que lea
// el mismo catálogo exportado a JSON en vez de consultar la base (ver
// docs/decisiones.md D-16). Nada en lib/rag/ debe importar "server-only",
// "next/*" ni "react".
import type { PuntoDef, ValorPunto } from "../tipos";

/** Tipo de dato de un campo del bloque de cierre (firma, fecha, texto
 * libre). No confundir con TipoPunto: el cierre no participa en
 * calcularEstado(), sólo se imprime. */
export type TipoCampoCierre = "firma" | "fecha" | "texto";

export interface CampoCierre {
  id: string;
  etiqueta: string;
  tipo: TipoCampoCierre;
}

/** El encabezado ya compuesto para renderizar: 'clasificacion' /
 * 'razon_social' / 'domicilio' vienen de constantes.ts (idénticos en los
 * cinco formatos); 'documento_referencia' / 'revision' vienen de la fila
 * de `formatos` (particulares de cada uno) — ver docs/decisiones.md D-15
 * §7.1. documento.ts es quien mezcla ambas fuentes; render.ts sólo
 * consume esta forma ya unificada. */
export interface EncabezadoFormato {
  clasificacion: string | null;
  razon_social: string;
  domicilio: string[];
  documento_referencia: string;
  revision: string | null;
}

export interface CierreFormato {
  /** Si el bloque de firmas se repite en cada página o sólo al final del
   * documento. Hoy siempre true (CIERRE_ESTANDAR en constantes.ts), pero
   * queda como campo — no una constante suelta — para que un formato de
   * otra periodicidad lo pueda resolver distinto más adelante. */
  repetir: boolean;
  campos: CampoCierre[];
}

export interface RenglonRAG {
  /** Correlativo 1..N dentro de este documento. Se renumera cada vez que
   * se genera el RAG — no se guarda en la base (ver docs/decisiones.md D-15). */
  id: number;
  elementoId: string;
  /** elementos.nombre — el rótulo que lleva en campo. */
  numeracion: string;
  /** "A01-02" o "Exterior"; cadena vacía si todavía no se capturó. */
  ubicacion: string;
  /** ≤5 palabras; cadena vacía si no aplica. */
  referencia: string;
  /** Respuestas por id de punto. La llave ausente es "sin contestar" —
   * ver docs/modelo-de-datos.md §3.3. */
  valores: Record<string, ValorPunto>;
  observaciones: string;
}

export interface SeccionRAG {
  nombre: string;
  renglones: RenglonRAG[];
}

export type ModoDocumentoRAG = "vacio" | "lleno";

export interface DocumentoRAG {
  clave: string;
  nombre: string;
  periodicidad: string;
  encabezado: EncabezadoFormato;
  instrucciones: string[];
  cierre: CierreFormato;
  /** Columnas centrales del documento — la plantilla vigente del sistema,
   * ya sin 'observaciones' (columna fija, se maneja aparte). */
  puntos: PuntoDef[];
  secciones: SeccionRAG[];
  totalRenglones: number;
  cicloClave: string | null;
  cicloNombre: string | null;
  /** ISO 8601. El ID correlativo sólo es inequívoco dentro de una edición
   * concreta del documento (ver docs/decisiones.md D-15) — este sello es
   * lo que permite rastrear a cuál. */
  generado: string;
  /** "vacio": para imprimir y llenar a mano. "lleno": con lo ya capturado. */
  modo: ModoDocumentoRAG;
}
