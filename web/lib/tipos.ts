// Formas compartidas entre servidor y cliente. Reflejan exactamente el
// diccionario de datos en docs/modelo-de-datos.md — cualquier cambio ahí
// debe replicarse aquí.

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

export interface Sistema {
  id: string;
  clave: string;
  nombre: string;
  rag: string | null;
  orden: number;
  activo: boolean;
}

export interface CicloConfig {
  sistemas_activos: string[];
  captura_directa: string[];
  imagen: { lado_max: number; calidad: number; formato: string };
  fechas?: Record<string, string>;
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
}

export interface Registro {
  id: string;
  elemento_id: string;
  como_se_encontro: string | null;
  que_se_realizo: string | null;
  pendientes: string | null;
  valores: Record<string, string>;
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
