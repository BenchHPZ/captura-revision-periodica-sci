// Formas compartidas entre servidor y cliente. Reflejan exactamente el
// diccionario de datos en docs/modelo-de-datos.md — cualquier cambio ahí
// debe replicarse aquí.
import type { ClaveTamanoHoja, OrientacionHoja } from "./documentos/pagina";

export type Estado = "sin_iniciar" | "parcial" | "completo";

export type TipoPunto = "si_no" | "si_no_na" | "texto" | "numero" | "seleccion" | "fecha";

export interface PuntoDef {
  id: string;
  etiqueta: string;
  tipo: TipoPunto;
  requerido: boolean;
  opciones?: string[];
}

export interface FotoDef {
  id: string;
  etiqueta: string;
  requerido: boolean;
  min: number;
}

export interface Plantilla {
  fotos: FotoDef[];
  puntos: PuntoDef[];
  texto_libre: string[];
}

/** Una entrada del diccionario de tipos de un sistema — ver
 * docs/decisiones.md D-18. 'clave' es lo que imprime el documento RAG en
 * una columna angosta ("G"); 'nombre' es lo que se elige en pantalla
 * ("Gabinete"). elementos.tipo guarda la clave, no el nombre. */
export interface TipoDiccionario {
  clave: string;
  nombre: string;
}

export interface Sistema {
  id: string;
  clave: string;
  nombre: string;
  rag: string | null;
  orden: number;
  activo: boolean;
  /** Vacío = el sistema no distingue tipos; la columna Tipo del RAG no se
   * dibuja (ver docs/decisiones.md D-18 y D-19). */
  tipos: TipoDiccionario[];
}

/** Catálogo único de la planta — no cuelga del ciclo ni del sistema, para
 * que elementos de sistemas distintos puedan compartir zona cuando están
 * co-ubicados. 'nombre' es la forma corta que imprime el documento RAG;
 * 'descripcion' es contexto que sólo se muestra en pantalla. 'orden'
 * sustituye a elementos.orden_seccion — ver docs/decisiones.md D-18. */
export interface Zona {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

/** La identidad de un RAG: lo que es particular de ese documento y no
 * cambia entre ciclos. Se identifica por (nombre, periodicidad), no por
 * ciclo — ver docs/modelo-de-datos.md §2.8. Lo que sí cambia mes a mes
 * (los puntos de revisión) sigue viviendo en Plantilla.
 *
 * Lo que debe ser idéntico en los cinco formatos mensuales —
 * clasificación, razón social, domicilio, instrucción general, bloque de
 * cierre— NO está aquí: vive como constantes en web/lib/rag/constantes.ts,
 * precisamente para que no haya manera de que un formato lo tenga
 * distinto a los demás (ver docs/decisiones.md D-15 §7.1). `instrucciones`
 * en esta tabla son sólo las PROPIAS de este formato (p. ej. "P = Pie, G
 * = Gabinete"); se concatenan con la general al armar el documento. */
/** Qué motor de renderizado le corresponde a este formato — ver
 * docs/decisiones.md D-22. 'rag' recorre un catálogo de elementos con
 * web/lib/rag/; 'checklist' imprime sus propios bloques/ítems (ver
 * web/lib/checklist/) sin pasar por ningún catálogo ni por el flujo de
 * captura fotográfica. */
export type TipoDocumentoFormato = "rag" | "checklist";

export interface Formato {
  id: string;
  clave: string;
  nombre: string;
  periodicidad: string;
  sistema_id: string | null;
  tipo_documento: TipoDocumentoFormato;
  /** Va al pie del documento, junto con `revision` — no al encabezado. */
  documento_referencia: string;
  revision: string | null;
  instrucciones: string[];
  notas: string | null;
  /** Ubicación y Referencia son opcionales por formato — ver
   * docs/decisiones.md D-19: RAG 2.2 no las lleva ambas porque
   * 'ubicacion' está capturada en 0 de 33 hidrantes exteriores. Las
   * demás columnas (id, numeración, tipo si el sistema lo tiene, puntos,
   * observaciones) no son opcionales. Sin significado para un formato
   * 'checklist' — ver docs/decisiones.md D-22. */
  columnas: { ubicacion: boolean; referencia: boolean };
  /** Baja recuperable — no borra nada, sólo saca la fila de las listas
   * activas. Mismo patrón que elementos.activo/sistemas.activo/
   * zonas.activo (D-18). Ver docs/decisiones.md D-23. */
  activo: boolean;
  /** Cuántas columnas de fecha imprime un checklist. Sin significado
   * para 'rag'. Antes se derivaba del ciclo abierto en tiempo de
   * solicitud; ahora es explícito y propio de cada formato — ver
   * docs/decisiones.md D-23. */
  columnas_fecha: number;
  /** Tamaño y orientación de la hoja en la que se imprime este formato.
   * Antes estaban cableados en el CSS de cada motor y recalculados a mano
   * en tres constantes de milímetros más; ahora salen de aquí y los
   * resuelve web/lib/documentos/pagina.ts. Ver docs/decisiones.md D-25. */
  tamano_hoja: ClaveTamanoHoja;
  orientacion: OrientacionHoja;
}

/** Un bloque de un formato 'checklist' (portada de fotos, tabla de
 * equipo, sub-checklist mecánico, bitácora libre) — forma cruda tal cual
 * la base, antes de resolverse a DocumentoChecklist (ver
 * web/lib/checklist/documento.ts). Ver docs/decisiones.md D-22. */
export type CampoAgrupacionChecklist = "categoria" | "ubicacion_fisica";

export interface ChecklistBloque {
  id: string;
  formato_id: string;
  tipo: "portada_fotos" | "tabla_verificacion" | "tabla_simple" | "bitacora_libre";
  nombre: string;
  orden: number;
  /** Sólo 'bitacora_libre': [{id, etiqueta}] de sus columnas fijas. */
  columnas: { id: string; etiqueta: string }[];
  /** Sólo 'bitacora_libre'. */
  filas_blanco: number | null;
  /** Sólo 'bitacora_libre': alto en milímetros de cada renglón en blanco,
   * para que se pueda escribir a mano encima. Ver docs/decisiones.md D-25. */
  alto_fila_mm: number;
  /** Orden de agrupación anidada para tabla_verificacion/tabla_simple — 0 a 2 elementos.
   * [] = sin banners de sección. Ver docs/decisiones.md D-22 y la migración 0009. */
  agrupacion: CampoAgrupacionChecklist[];
  /** true: empieza en hoja nueva. false: continúa en la hoja del bloque
   * anterior. Ignorado en el primer bloque. Ver docs/decisiones.md D-25. */
  hoja_propia: boolean;
}

/** Un renglón de un ChecklistBloque — forma cruda tal cual la base. */
export interface ChecklistItem {
  id: string;
  bloque_id: string;
  categoria: string | null;
  /** Segunda dimensión de agrupación, independiente de 'categoria' — ver migración 0009. */
  ubicacion_fisica: string | null;
  pos: string | null;
  nombre: string;
  cantidad: string | null;
  foto_referencia_ruta: string | null;
  verificaciones: { id: string; etiqueta: string }[];
  orden: number;
  notas: string | null;
}

export interface CicloFechas {
  ejecucion_inicio?: string;
  ejecucion_fin?: string;
  entrega?: string;
  supervision_fin?: string;
}

export interface CicloConfig {
  sistemas_activos: string[];
  captura_directa: string[];
  imagen: { lado_max: number; calidad: number; formato: string };
  fechas?: CicloFechas;
}

export interface Ciclo {
  id: string;
  clave: string;
  nombre: string;
  mes: number;
  anio: number;
  estado: "abierto" | "cerrado";
  config: CicloConfig;
}

export interface Elemento {
  id: string;
  ciclo_id: string;
  sistema_id: string;
  codigo: string;
  nombre: string;
  zona: string | null;
  ubicacion: string | null;
  tipo: string | null;
  responsable: string | null;
  item_rag: number | null;
  orden: number;
  activo: boolean;
  notas: string | null;
  /** Ayuda corta a la ubicación, ≤5 palabras — ver docs/modelo-de-datos.md §2.4. */
  referencia: string | null;
  /** Agrupador original del documento RAG (D-15), sustituido por
   * 'zona_id' (D-18). Se conserva sin leerse — ver docs/decisiones.md
   * D-18 sobre por qué esta migración no borra columnas. */
  seccion: string | null;
  orden_seccion: number | null;
  /** El agrupador vigente — reemplaza a 'seccion'/'orden_seccion' y a la
   * 'zona' de texto libre: catálogo único de la planta (ver
   * docs/decisiones.md D-18). null = todavía sin asignar. */
  zona_id: string | null;
  /** Cuando no es null, fija la posición del elemento dentro de su zona
   * en vez de calcularla por ubicación/nombre (ver web/lib/orden.ts y
   * docs/decisiones.md D-20). */
  orden_anclado: number | null;
}

/**
 * Valor de un punto de revisión ya capturado. Los puntos si_no/si_no_na se
 * guardan como boolean (true=SI, false=NO, null=NA); el resto conserva su
 * forma natural. Ver docs/modelo-de-datos.md §3.3 y docs/decisiones.md D-15
 * — la llave ausente sigue significando "sin contestar", no el valor null.
 */
export type ValorPunto = boolean | string | number | null;

export interface Registro {
  id: string;
  elemento_id: string;
  como_se_encontro: string | null;
  que_se_realizo: string | null;
  /** Alimenta la columna Observaciones del documento RAG — ver
   * docs/decisiones.md D-15 §7.2. No hay una columna 'observaciones'
   * aparte: éste es el único campo de texto libre que la sustituye. */
  pendientes: string | null;
  valores: Record<string, ValorPunto>;
  estado: Estado;
  capturado_por: string | null;
  creado: string;
  actualizado: string;
}

export type OrigenFoto = "captura" | "recepcion";

export interface Foto {
  id: string;
  registro_id: string;
  momento: string;
  ruta: string;
  ancho: number | null;
  alto: number | null;
  bytes: number | null;
  orden: number;
  origen: OrigenFoto;
  subida: string;
}

export type EstadoEntrada = "pendiente" | "asignada" | "descartada";

export interface Entrada {
  id: string;
  ciclo_id: string;
  ruta: string;
  nombre_original: string | null;
  bytes: number | null;
  estado: EstadoEntrada;
  foto_id: string | null;
  subida: string;
}

/** Campos de texto libre que la plantilla puede habilitar. Fijos en el
 * esquema (docs/modelo-de-datos.md §2.5); la plantilla sólo decide cuáles
 * de estos tres aplican para el sistema. */
export const CAMPO_TEXTO_LIBRE = {
  como_se_encontro: "como_se_encontro",
  que_se_realizo: "que_se_realizo",
  pendientes: "pendientes",
} as const;

export type CampoTextoLibre = keyof typeof CAMPO_TEXTO_LIBRE;

export const ETIQUETA_TEXTO_LIBRE: Record<CampoTextoLibre, string> = {
  como_se_encontro: "Cómo se encontró",
  que_se_realizo: "Qué se le realizó",
  pendientes: "Pendientes",
};
