// Mutaciones de servidor sobre 'registros', compartidas por las acciones
// de captura directa (app/(app)/capturar/[sistema]/[id]/actions.ts) y de
// recepción (app/(app)/recepcion/actions.ts) — ambas terminan tocando el
// mismo renglón y necesitan recalcular el estado de la misma manera. Ver
// docs/modelo-de-datos.md §4.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularEstado } from "./estado";
import type { Estado, Plantilla } from "./tipos";

export async function contarFotosPorMomento(
  supabase: SupabaseClient,
  registroId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("fotos").select("momento").eq("registro_id", registroId);
  if (error) throw error;
  const conteo: Record<string, number> = {};
  for (const fila of data ?? []) {
    conteo[fila.momento] = (conteo[fila.momento] ?? 0) + 1;
  }
  return conteo;
}

/** Da de alta el registro si el elemento todavía no tiene uno; lo deja
 * con todos los campos vacíos (estado sin_iniciar) hasta la primera foto
 * o el primer guardado de texto. */
export async function aseguraRegistro(supabase: SupabaseClient, elementoId: string): Promise<string> {
  const { data: existente, error: errorLectura } = await supabase
    .from("registros")
    .select("id")
    .eq("elemento_id", elementoId)
    .maybeSingle();
  if (errorLectura) throw errorLectura;
  if (existente) return existente.id;

  const { data: creado, error: errorAlta } = await supabase
    .from("registros")
    .insert({ elemento_id: elementoId })
    .select("id")
    .single();
  if (errorAlta) throw errorAlta;
  return creado.id;
}

export async function plantillaDe(
  supabase: SupabaseClient,
  cicloId: string,
  sistemaId: string,
): Promise<Plantilla> {
  const { data, error } = await supabase
    .from("plantillas")
    .select("fotos, puntos, texto_libre")
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .single();
  if (error) throw error;
  return data as Plantilla;
}

export async function recalcularYGuardarEstado(
  supabase: SupabaseClient,
  registroId: string,
  plantilla: Plantilla,
): Promise<Estado> {
  const { data: registro, error } = await supabase
    .from("registros")
    .select("como_se_encontro, que_se_realizo, pendientes, valores")
    .eq("id", registroId)
    .single();
  if (error) throw error;

  const fotosPorMomento = await contarFotosPorMomento(supabase, registroId);
  const estado = calcularEstado(plantilla, registro, fotosPorMomento);

  const { error: errorUpdate } = await supabase.from("registros").update({ estado }).eq("id", registroId);
  if (errorUpdate) throw errorUpdate;

  return estado;
}
