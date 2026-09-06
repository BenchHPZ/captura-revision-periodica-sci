"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEPOSITO } from "@/lib/datos";
import { aseguraRegistro, plantillaDe, recalcularYGuardarEstado } from "@/lib/registros";
import { rutaFoto } from "@/lib/rutas";

export interface NuevaEntrada {
  cicloId: string;
  ruta: string;
  nombreOriginal: string;
  bytes: number;
}

/** Registra en la base una fotografía que el navegador ya subió a
 * {ciclo}/_entrada/. Separado en dos pasos (subir, luego registrar) por
 * la misma razón que agregarFoto en captura: el cuerpo de la fotografía
 * nunca pasa por esta función, sólo su ruta (ver docs/decisiones.md D-06). */
export async function registrarEntrada(entrada: NuevaEntrada) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entrada")
    .insert({
      ciclo_id: entrada.cicloId,
      ruta: entrada.ruta,
      nombre_original: entrada.nombreOriginal,
      bytes: entrada.bytes,
      estado: "pendiente",
    })
    .select("id, ciclo_id, ruta, nombre_original, bytes, estado, foto_id, subida")
    .single();
  if (error) throw error;
  revalidatePath("/recepcion");
  return data;
}

/**
 * Mueve cada fotografía seleccionada de la espera a la ruta definitiva
 * del elemento (RF-12), la registra en 'fotos', marca la entrada como
 * asignada, y abre el formulario del elemento para el texto que la
 * acompaña (RF-14).
 *
 * Se invoca como `<form action={asignarEntrada.bind(null, cicloId, cicloClave)}>`:
 * lo único fijo para toda la página es el ciclo; sistema, elemento,
 * momento y qué fotografías van seleccionadas cambian con cada envío, así
 * que viajan como campos normales del formulario en vez de pre-cargados —
 * evita reconstruir la función ligada en cada render sólo porque cambió
 * una selección. El redirect final lo resuelve el envío nativo del
 * formulario, igual que guardarYSiguiente en captura.
 */
export async function asignarEntrada(cicloId: string, cicloClave: string, formData: FormData) {
  const sistemaId = String(formData.get("sistemaId") ?? "");
  const sistemaClave = String(formData.get("sistemaClave") ?? "");
  const elementoId = String(formData.get("elementoId") ?? "");
  const elementoCodigo = String(formData.get("elementoCodigo") ?? "");
  const momento = String(formData.get("momento") ?? "");
  const entradaIds = formData.getAll("entradaId").map(String);

  if (!sistemaId || !elementoId || !momento || entradaIds.length === 0) {
    throw new Error("Falta sistema, elemento, momento o no hay fotografías seleccionadas.");
  }

  const supabase = await createClient();

  const { data: entradas, error: errorEntradas } = await supabase
    .from("entrada")
    .select("id, ruta")
    .in("id", entradaIds);
  if (errorEntradas) throw errorEntradas;
  if (!entradas || entradas.length === 0) return;

  const registroId = await aseguraRegistro(supabase, elementoId, cicloId);

  const { count } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("registro_id", registroId)
    .eq("momento", momento);
  let orden = count ?? 0;

  for (const entrada of entradas) {
    orden += 1;
    const rutaDestino = rutaFoto(cicloClave, sistemaClave, elementoCodigo, momento, orden);

    const { error: errorMove } = await supabase.storage.from(DEPOSITO).move(entrada.ruta, rutaDestino);
    if (errorMove) throw errorMove;

    const { data: foto, error: errorFoto } = await supabase
      .from("fotos")
      .insert({
        registro_id: registroId,
        momento,
        ruta: rutaDestino,
        orden,
        origen: "recepcion",
      })
      .select("id")
      .single();
    if (errorFoto) throw errorFoto;

    const { error: errorEntrada } = await supabase
      .from("entrada")
      .update({ estado: "asignada", foto_id: foto.id })
      .eq("id", entrada.id);
    if (errorEntrada) throw errorEntrada;
  }

  const plantilla = await plantillaDe(supabase, cicloId, sistemaId);
  await recalcularYGuardarEstado(supabase, registroId, plantilla);

  revalidatePath("/recepcion");
  revalidatePath("/capturar", "layout");
  redirect(`/capturar/${sistemaClave}/${elementoId}`);
}

/** RF-15: descarta sin borrar el objeto de Storage — puede ser una foto
 * repetida o fuera de tema, pero no cuesta nada conservarla por si acaso. */
export async function descartarEntrada(entradaIds: string[]) {
  if (entradaIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("entrada").update({ estado: "descartada" }).in("id", entradaIds);
  if (error) throw error;
  revalidatePath("/recepcion");
}
