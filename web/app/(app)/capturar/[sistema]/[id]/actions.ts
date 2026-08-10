"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEPOSITO } from "@/lib/datos";
import { calcularEstado } from "@/lib/estado";
import type { Plantilla } from "@/lib/tipos";

async function contarFotosPorMomento(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

async function aseguraRegistro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  elementoId: string,
): Promise<string> {
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

async function recalcularYGuardarEstado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registroId: string,
  plantilla: Plantilla,
) {
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

export interface EntradaFoto {
  elementoId: string;
  sistemaId: string;
  cicloId: string;
  momento: string;
  ruta: string;
  ancho: number;
  alto: number;
  bytes: number;
}

export async function agregarFoto(entrada: EntradaFoto) {
  const supabase = await createClient();

  const plantilla = await plantillaDe(supabase, entrada.cicloId, entrada.sistemaId);
  const registroId = await aseguraRegistro(supabase, entrada.elementoId);

  const { count } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("registro_id", registroId)
    .eq("momento", entrada.momento);

  const { data: foto, error } = await supabase
    .from("fotos")
    .insert({
      registro_id: registroId,
      momento: entrada.momento,
      ruta: entrada.ruta,
      ancho: entrada.ancho,
      alto: entrada.alto,
      bytes: entrada.bytes,
      orden: (count ?? 0) + 1,
      origen: "captura",
    })
    .select("id, momento, ruta, ancho, alto, bytes, orden")
    .single();
  if (error) throw error;

  const estado = await recalcularYGuardarEstado(supabase, registroId, plantilla);
  revalidatePath("/capturar", "layout");

  return { foto, estado };
}

export async function eliminarFoto(fotoId: string, cicloId: string, sistemaId: string) {
  const supabase = await createClient();

  const { data: foto, error } = await supabase
    .from("fotos")
    .select("id, ruta, registro_id")
    .eq("id", fotoId)
    .single();
  if (error) throw error;

  const { error: errorStorage } = await supabase.storage.from(DEPOSITO).remove([foto.ruta]);
  if (errorStorage) throw errorStorage;

  const { error: errorBorrado } = await supabase.from("fotos").delete().eq("id", fotoId);
  if (errorBorrado) throw errorBorrado;

  const plantilla = await plantillaDe(supabase, cicloId, sistemaId);
  const estado = await recalcularYGuardarEstado(supabase, foto.registro_id, plantilla);
  revalidatePath("/capturar", "layout");

  return { estado };
}

async function plantillaDe(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

export interface IdsElemento {
  elementoId: string;
  sistemaClave: string;
  cicloId: string;
  sistemaId: string;
}

/**
 * Se invoca como `guardarYSiguiente.bind(null, ids)` en el `action` de un
 * <form>: los identificadores fijos van pre-cargados y FormData trae sólo
 * lo que el usuario llenó. Así el redirect final lo resuelve el mecanismo
 * nativo de envío de formularios de Next en vez de un await manual en el
 * cliente — evita la ambigüedad de si un try/catch alrededor de la
 * llamada podría interceptar la señal interna de redirect.
 */
export async function guardarYSiguiente(ids: IdsElemento, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const comoSeEncontro = String(formData.get("como_se_encontro") ?? "");
  const queSeRealizo = String(formData.get("que_se_realizo") ?? "");
  const pendientes = String(formData.get("pendientes") ?? "");
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("valores.")) {
      valores[clave.slice("valores.".length)] = String(valor);
    }
  }

  const registroId = await aseguraRegistro(supabase, ids.elementoId);

  const { error } = await supabase
    .from("registros")
    .update({
      como_se_encontro: comoSeEncontro || null,
      que_se_realizo: queSeRealizo || null,
      pendientes: pendientes || null,
      valores,
      capturado_por: user?.email ?? null,
    })
    .eq("id", registroId);
  if (error) throw error;

  const plantilla = await plantillaDe(supabase, ids.cicloId, ids.sistemaId);
  await recalcularYGuardarEstado(supabase, registroId, plantilla);
  revalidatePath("/capturar", "layout");

  const { data: elementosData, error: errorLista } = await supabase
    .from("elementos")
    .select("id, orden, registro:registros(estado)")
    .eq("ciclo_id", ids.cicloId)
    .eq("sistema_id", ids.sistemaId)
    .eq("activo", true)
    .order("orden");
  if (errorLista) throw errorLista;

  interface FilaElemento {
    id: string;
    orden: number;
    registro: { estado: string } | { estado: string }[] | null;
  }
  const elementos = (elementosData ?? []) as unknown as FilaElemento[];

  const lista = elementos.map((e) => ({
    id: e.id,
    orden: e.orden,
    estado: (Array.isArray(e.registro) ? e.registro[0]?.estado : e.registro?.estado) ?? "sin_iniciar",
  }));

  const actual = lista.find((e) => e.id === ids.elementoId);
  const pendientesOrdenados = lista.filter((e) => e.estado !== "completo" && e.id !== ids.elementoId);
  const siguiente =
    pendientesOrdenados.find((e) => (actual ? e.orden > actual.orden : true)) ?? pendientesOrdenados[0];

  if (siguiente) {
    redirect(`/capturar/${ids.sistemaClave}/${siguiente.id}`);
  }
  redirect(`/capturar/${ids.sistemaClave}`);
}
