"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEPOSITO } from "@/lib/datos";
import { aseguraRegistro, plantillaDe, recalcularYGuardarEstado } from "@/lib/registros";
import type { ValorPunto } from "@/lib/tipos";

/** Inverso de codificarSiNo() en Formulario.tsx. */
function decodificarSiNo(valorForm: FormDataEntryValue): boolean | null {
  const texto = String(valorForm);
  return texto === "na" ? null : texto === "true";
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

export interface IdsElemento {
  elementoId: string;
  sistemaClave: string;
  cicloId: string;
  sistemaId: string;
  esCapturaDirecta: boolean;
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

  // Se necesita antes de parsear FormData: decide cómo decodificar cada
  // 'valores.<id>' según el tipo del punto en la plantilla vigente.
  const plantilla = await plantillaDe(supabase, ids.cicloId, ids.sistemaId);
  const tipoPorPunto = new Map(plantilla.puntos.map((p) => [p.id, p.tipo]));

  const comoSeEncontro = String(formData.get("como_se_encontro") ?? "");
  const queSeRealizo = String(formData.get("que_se_realizo") ?? "");
  const pendientes = String(formData.get("pendientes") ?? "");
  const valores: Record<string, ValorPunto> = {};
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("valores.")) continue;
    const id = clave.slice("valores.".length);
    const tipo = tipoPorPunto.get(id);
    // Los puntos si_no/si_no_na llegan codificados como "true"/"false"/"na"
    // (ver codificarSiNo en Formulario.tsx) porque FormData sólo transporta
    // cadenas. El resto conserva su forma de texto, igual que antes. El
    // formulario ya omite el <input hidden> de un si_no sin contestar, así
    // que si la llave llega aquí es porque sí se contestó.
    valores[id] = tipo === "si_no" || tipo === "si_no_na" ? decodificarSiNo(valor) : String(valor);
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

  await recalcularYGuardarEstado(supabase, registroId, plantilla);
  revalidatePath("/capturar", "layout");
  revalidatePath("/recepcion");

  // "Guardar y siguiente" es un recorrido ordenado (RF-06) que sólo tiene
  // sentido en captura directa. Un elemento de recepción se abrió para
  // completar el texto de fotos ya asignadas (RF-14, Flujo 3); al guardar
  // vuelve a recepción, no hay "siguiente" en esa lista porque no hay
  // lista — la entrada de fotos es lo que marca qué sigue.
  if (!ids.esCapturaDirecta) {
    redirect("/recepcion");
  }

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
