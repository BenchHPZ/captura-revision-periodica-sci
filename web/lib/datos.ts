// Consultas de servidor reutilizadas entre pantallas de captura. Todas
// esperan un cliente ya creado con lib/supabase/server.ts — no abren
// conexión propia — para que quien las llama controle la sesión.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatosRegistro } from "./estado";
import { DEPOSITO } from "./rutas";
import type {
  Ciclo,
  Elemento,
  Entrada,
  Estado,
  Formato,
  Foto,
  Plantilla,
  Registro,
  Sistema,
  ValorPunto,
  Zona,
} from "./tipos";

export { DEPOSITO };

/** La zona de un elemento, ya resuelta por el join con 'zonas' — lo
 * mínimo que necesitan lib/rag/documento.ts y lib/informe/generador.ts
 * para agrupar y ordenar (ver docs/decisiones.md D-18). */
export interface ZonaResumen {
  nombre: string;
  orden: number;
}

function zonaResumenDe(fila: { zona: unknown }): ZonaResumen | null {
  const cruda = Array.isArray(fila.zona) ? (fila.zona[0] ?? null) : fila.zona;
  return cruda ? { nombre: (cruda as { nombre: string }).nombre, orden: (cruda as { orden: number }).orden } : null;
}

export async function obtenerCicloAbierto(supabase: SupabaseClient): Promise<Ciclo | null> {
  const { data, error } = await supabase
    .from("ciclos")
    .select("id, clave, nombre, mes, anio, estado, config")
    .eq("estado", "abierto")
    .maybeSingle();
  if (error) throw error;
  return data as Ciclo | null;
}

export async function obtenerSistemas(supabase: SupabaseClient): Promise<Sistema[]> {
  const { data, error } = await supabase
    .from("sistemas")
    .select("id, clave, nombre, rag, orden, activo, tipos")
    .eq("activo", true)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Sistema[];
}

/** Para /configuracion: los cinco sistemas, activos e inactivos — a
 * diferencia de obtenerSistemas(), que sólo trae los activos porque
 * alimenta las pantallas de captura. */
export async function obtenerSistemasCatalogo(supabase: SupabaseClient): Promise<Sistema[]> {
  const { data, error } = await supabase.from("sistemas").select("id, clave, nombre, rag, orden, activo, tipos").order("orden");
  if (error) throw error;
  return (data ?? []) as Sistema[];
}

/** Catálogo único de la planta (docs/decisiones.md D-18), activas e
 * inactivas — para /configuracion y para los selectores de zona de
 * /sistemas/[clave]. */
export async function obtenerZonas(supabase: SupabaseClient): Promise<Zona[]> {
  const { data, error } = await supabase
    .from("zonas")
    .select("id, clave, nombre, descripcion, orden, activo")
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Zona[];
}

export interface ElementoConEstado extends Elemento {
  registro: { id: string; estado: Estado } | null;
}

export async function obtenerElementos(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<ElementoConEstado[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, referencia, seccion, orden_seccion, registro:registros(id, estado)",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .eq("activo", true)
    .order("orden");
  if (error) throw error;
  // PostgREST regresa la relación uno-a-uno como objeto; con el tipado
  // genérico del cliente a veces infiere arreglo — se normaliza aquí.
  return (data ?? []).map((fila) => ({
    ...fila,
    registro: Array.isArray(fila.registro) ? (fila.registro[0] ?? null) : fila.registro,
  })) as ElementoConEstado[];
}

export interface ConteoPorEstado {
  sin_iniciar: number;
  parcial: number;
  completo: number;
  total: number;
}

export function contarPorEstado(elementos: ElementoConEstado[]): ConteoPorEstado {
  const conteo: ConteoPorEstado = { sin_iniciar: 0, parcial: 0, completo: 0, total: elementos.length };
  for (const e of elementos) {
    const estado = e.registro?.estado ?? "sin_iniciar";
    conteo[estado] += 1;
  }
  return conteo;
}

/** Para el catálogo (Flujo 5): trae activos e inactivos — a diferencia de
 * obtenerElementos, que sólo trae los activos porque alimenta las
 * pantallas de captura. */
export async function obtenerElementosCatalogo(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<Elemento[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, referencia, seccion, orden_seccion, zona_id, orden_anclado",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Elemento[];
}

export interface ElementoTablero extends Elemento {
  registro: { id: string; estado: Estado; capturado_por: string | null; actualizado: string } | null;
  fotosPorMomento: Record<string, number>;
}

/** Para el tablero (Flujo 4): trae en una sola consulta, por sistema,
 * cada elemento con su registro y el conteo de fotos por momento —
 * evita repetir obtenerRegistro elemento por elemento sobre los 221. */
export async function obtenerElementosTablero(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<ElementoTablero[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, referencia, seccion, orden_seccion, registro:registros(id, estado, capturado_por, actualizado, fotos(momento))",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .eq("activo", true)
    .order("orden");
  if (error) throw error;

  return (data ?? []).map((fila) => {
    const crudo = Array.isArray(fila.registro) ? (fila.registro[0] ?? null) : fila.registro;
    const fotos: { momento: string }[] = crudo?.fotos ?? [];
    const fotosPorMomento: Record<string, number> = {};
    for (const f of fotos) fotosPorMomento[f.momento] = (fotosPorMomento[f.momento] ?? 0) + 1;

    const registro = crudo
      ? {
          id: crudo.id as string,
          estado: crudo.estado as Estado,
          capturado_por: crudo.capturado_por as string | null,
          actualizado: crudo.actualizado as string,
        }
      : null;

    return { ...fila, registro, fotosPorMomento } as ElementoTablero;
  });
}

export interface ElementoParaImpacto {
  id: string;
  registroId: string | null;
  estadoActual: Estado;
  registro: DatosRegistro | null;
  fotosPorMomento: Record<string, number>;
}

/** Para la vista previa de impacto al cambiar una plantilla (Flujo 6,
 * RF-26): trae de cada elemento activo del sistema lo que calcularEstado()
 * necesita para recalcular contra la plantilla nueva, sin escribir nada. */
export async function obtenerElementosParaImpacto(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<ElementoParaImpacto[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, registro:registros(id, estado, como_se_encontro, que_se_realizo, pendientes, valores, fotos(momento))",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .eq("activo", true);
  if (error) throw error;

  return (data ?? []).map((fila) => {
    const crudo = Array.isArray(fila.registro) ? (fila.registro[0] ?? null) : fila.registro;
    const fotos: { momento: string }[] = crudo?.fotos ?? [];
    const fotosPorMomento: Record<string, number> = {};
    for (const f of fotos) fotosPorMomento[f.momento] = (fotosPorMomento[f.momento] ?? 0) + 1;

    return {
      id: fila.id as string,
      registroId: (crudo?.id as string | undefined) ?? null,
      estadoActual: (crudo?.estado as Estado | undefined) ?? "sin_iniciar",
      registro: crudo
        ? {
            como_se_encontro: crudo.como_se_encontro as string | null,
            que_se_realizo: crudo.que_se_realizo as string | null,
            pendientes: crudo.pendientes as string | null,
            valores: (crudo.valores as Record<string, string> | null) ?? {},
          }
        : null,
      fotosPorMomento,
    };
  });
}

export interface ElementoParaInforme {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  referencia: string | null;
  tipo: string | null;
  responsable: string | null;
  zona: ZonaResumen | null;
  orden_anclado: number | null;
  orden: number;
  registro: {
    id: string;
    como_se_encontro: string | null;
    que_se_realizo: string | null;
    pendientes: string | null;
    valores: Record<string, ValorPunto>;
    estado: Estado;
    fotos: { id: string; momento: string; ruta: string; orden: number }[];
  } | null;
}

/** Para el informe fotográfico mensual (Fase 6): trae de cada elemento
 * activo lo mismo que obtenerElementosParaRag usa para ubicarlo en su
 * zona, más lo que el informe necesita y el RAG no — código (para la
 * ruta de Storage de sus fotos), los tres textos y las fotos mismas. */
export async function obtenerElementosParaInforme(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<ElementoParaInforme[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, codigo, nombre, ubicacion, referencia, tipo, responsable, orden_anclado, orden, zona:zonas(nombre, orden), registro:registros(id, como_se_encontro, que_se_realizo, pendientes, valores, estado, fotos(id, momento, ruta, orden))",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .eq("activo", true)
    .order("orden");
  if (error) throw error;

  return (data ?? []).map((fila) => {
    const registro = Array.isArray(fila.registro) ? (fila.registro[0] ?? null) : fila.registro;
    return { ...fila, zona: zonaResumenDe(fila), registro };
  }) as ElementoParaInforme[];
}

export async function obtenerPlantilla(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<Plantilla | null> {
  const { data, error } = await supabase
    .from("plantillas")
    .select("fotos, puntos, texto_libre")
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .maybeSingle();
  if (error) throw error;
  return data as Plantilla | null;
}

export async function obtenerElemento(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
  elementoId: string,
): Promise<Elemento | null> {
  const { data, error } = await supabase
    .from("elementos")
    .select("id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, referencia, seccion, orden_seccion")
    .eq("id", elementoId)
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .maybeSingle();
  if (error) throw error;
  return data as Elemento | null;
}

export interface RegistroConFotos {
  registro: Registro | null;
  fotos: Foto[];
}

export async function obtenerRegistro(
  supabase: SupabaseClient,
  elementoId: string,
): Promise<RegistroConFotos> {
  const { data: registro, error } = await supabase
    .from("registros")
    .select(
      "id, elemento_id, como_se_encontro, que_se_realizo, pendientes, valores, estado, capturado_por, creado, actualizado",
    )
    .eq("elemento_id", elementoId)
    .maybeSingle();
  if (error) throw error;
  if (!registro) return { registro: null, fotos: [] };

  const { data: fotos, error: errorFotos } = await supabase
    .from("fotos")
    .select("id, registro_id, momento, ruta, ancho, alto, bytes, orden, origen, subida")
    .eq("registro_id", registro.id)
    .order("momento")
    .order("orden");
  if (errorFotos) throw errorFotos;

  return { registro: registro as Registro, fotos: (fotos ?? []) as Foto[] };
}

export async function obtenerEntradaPendiente(
  supabase: SupabaseClient,
  cicloId: string,
): Promise<Entrada[]> {
  const { data, error } = await supabase
    .from("entrada")
    .select("id, ciclo_id, ruta, nombre_original, bytes, estado, foto_id, subida")
    .eq("ciclo_id", cicloId)
    .eq("estado", "pendiente")
    .order("subida");
  if (error) throw error;
  return (data ?? []) as Entrada[];
}

/** URL firmadas de lectura, vigentes una hora — el depósito es privado
 * (docs/modelo-de-datos.md §5), así que una miniatura no se puede mostrar
 * con una URL pública fija. */
export async function firmarRutas(
  supabase: SupabaseClient,
  rutas: string[],
): Promise<Record<string, string>> {
  if (rutas.length === 0) return {};
  const { data, error } = await supabase.storage.from(DEPOSITO).createSignedUrls(rutas, 3600);
  if (error) throw error;
  const mapa: Record<string, string> = {};
  for (const fila of data ?? []) {
    if (fila.signedUrl && fila.path) mapa[fila.path] = fila.signedUrl;
  }
  return mapa;
}

/** La identidad y la imagen de un RAG. No cuelga de ningún ciclo — ver
 * docs/modelo-de-datos.md §2.8. */
const SELECT_FORMATO =
  "id, clave, nombre, periodicidad, sistema_id, documento_referencia, revision, instrucciones, notas, columnas";

export async function obtenerFormatos(supabase: SupabaseClient): Promise<Formato[]> {
  const { data, error } = await supabase.from("formatos").select(SELECT_FORMATO).order("clave");
  if (error) throw error;
  return (data ?? []) as Formato[];
}

export async function obtenerFormatoPorClave(supabase: SupabaseClient, clave: string): Promise<Formato | null> {
  const { data, error } = await supabase.from("formatos").select(SELECT_FORMATO).eq("clave", clave).maybeSingle();
  if (error) throw error;
  return data as Formato | null;
}

export interface ElementoParaRagFila {
  id: string;
  nombre: string;
  ubicacion: string | null;
  referencia: string | null;
  tipo: string | null;
  zona: ZonaResumen | null;
  orden_anclado: number | null;
  orden: number;
  /** 'pendientes' es lo que alimenta la columna Observaciones del
   * documento RAG — ver docs/decisiones.md D-15 §7.2. No hay una columna
   * 'observaciones' aparte. */
  registro: { valores: Record<string, ValorPunto>; pendientes: string | null } | null;
}

/** Para armar un DocumentoRAG (Fase 6): trae de cada elemento activo lo
 * que lib/rag/documento.ts necesita para ubicarlo en su zona y, si lo
 * hay, lo que ya se capturó para pintarlo en modo "lleno". */
export async function obtenerElementosParaRag(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<ElementoParaRagFila[]> {
  const { data, error } = await supabase
    .from("elementos")
    .select(
      "id, nombre, ubicacion, referencia, tipo, orden_anclado, orden, zona:zonas(nombre, orden), registro:registros(valores, pendientes)",
    )
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .eq("activo", true)
    .order("orden");
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    ...fila,
    zona: zonaResumenDe(fila),
    registro: Array.isArray(fila.registro) ? (fila.registro[0] ?? null) : fila.registro,
  })) as ElementoParaRagFila[];
}
