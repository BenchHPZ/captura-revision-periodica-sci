// Consultas de servidor reutilizadas entre pantallas de captura. Todas
// esperan un cliente ya creado con lib/supabase/server.ts — no abren
// conexión propia — para que quien las llama controle la sesión.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEPOSITO } from "./rutas";
import type { Ciclo, Elemento, Entrada, Estado, Foto, Plantilla, Registro, Sistema } from "./tipos";

export { DEPOSITO };

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
    .select("id, clave, nombre, rag, orden, activo")
    .eq("activo", true)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Sistema[];
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
      "id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, registro:registros(id, estado)",
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
      "id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, registro:registros(id, estado, capturado_por, actualizado, fotos(momento))",
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
    .select("id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas")
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
