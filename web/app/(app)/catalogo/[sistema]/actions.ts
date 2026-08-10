"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEPOSITO, obtenerElementosParaImpacto, type ElementoParaImpacto } from "@/lib/datos";
import { calcularEstado } from "@/lib/estado";
import { rutaFoto } from "@/lib/rutas";
import type { Elemento, Plantilla } from "@/lib/tipos";

export interface DatosElemento {
  codigo: string;
  nombre: string;
  zona: string | null;
  ubicacion: string | null;
  tipo: string | null;
  responsable: string | null;
}

async function siguienteOrden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cicloId: string,
  sistemaId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("elementos")
    .select("orden")
    .eq("ciclo_id", cicloId)
    .eq("sistema_id", sistemaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.orden ?? 0) + 1;
}

export async function crearElemento(cicloId: string, sistemaId: string, datos: DatosElemento): Promise<Elemento> {
  const supabase = await createClient();
  const orden = await siguienteOrden(supabase, cicloId, sistemaId);
  const { data, error } = await supabase
    .from("elementos")
    .insert({ ciclo_id: cicloId, sistema_id: sistemaId, ...datos, orden })
    .select("id, ciclo_id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas")
    .single();
  if (error) throw error;
  revalidatePath("/catalogo", "layout");
  return data as Elemento;
}

/**
 * Si el código cambia, mueve cada fotografía ya subida a la ruta con el
 * código nuevo — docs/modelo-de-datos.md §5 deriva la ruta del código —
 * y actualiza fotos.ruta. Ninguna fotografía se pierde ni se re-sube
 * (Flujo 5: "el sistema lo hace y avisa").
 */
export async function actualizarElemento(
  elementoId: string,
  cicloClave: string,
  sistemaClave: string,
  codigoAnterior: string,
  datos: DatosElemento,
) {
  const supabase = await createClient();

  if (datos.codigo !== codigoAnterior) {
    const { data: registro, error: errorRegistro } = await supabase
      .from("registros")
      .select("id")
      .eq("elemento_id", elementoId)
      .maybeSingle();
    if (errorRegistro) throw errorRegistro;

    if (registro) {
      const { data: fotos, error: errorFotos } = await supabase
        .from("fotos")
        .select("id, momento, ruta, orden")
        .eq("registro_id", registro.id);
      if (errorFotos) throw errorFotos;

      for (const foto of fotos ?? []) {
        const rutaNueva = rutaFoto(cicloClave, sistemaClave, datos.codigo, foto.momento, foto.orden);
        if (rutaNueva === foto.ruta) continue;
        const { error: errorMove } = await supabase.storage.from(DEPOSITO).move(foto.ruta, rutaNueva);
        if (errorMove) throw errorMove;
        const { error: errorUpdate } = await supabase
          .from("fotos")
          .update({ ruta: rutaNueva })
          .eq("id", foto.id);
        if (errorUpdate) throw errorUpdate;
      }
    }
  }

  const { error } = await supabase.from("elementos").update(datos).eq("id", elementoId);
  if (error) throw error;
  revalidatePath("/catalogo", "layout");
  revalidatePath("/capturar", "layout");
}

/** Dar de baja no borra (Flujo 5): el elemento sale de las listas de
 * captura y de los conteos, pero conserva lo capturado por si se revierte. */
export async function cambiarActivo(elementoId: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("elementos").update({ activo }).eq("id", elementoId);
  if (error) throw error;
  revalidatePath("/catalogo", "layout");
  revalidatePath("/capturar", "layout");
}

export interface ImpactoPlantilla {
  totalElementos: number;
  cambios: number;
  aSinIniciar: number;
  aParcial: number;
  aCompleto: number;
}

function calcularImpacto(elementos: ElementoParaImpacto[], plantillaNueva: Plantilla): ImpactoPlantilla {
  const impacto: ImpactoPlantilla = {
    totalElementos: elementos.length,
    cambios: 0,
    aSinIniciar: 0,
    aParcial: 0,
    aCompleto: 0,
  };
  for (const e of elementos) {
    const estadoNuevo = calcularEstado(plantillaNueva, e.registro, e.fotosPorMomento);
    if (estadoNuevo !== e.estadoActual) {
      impacto.cambios += 1;
      if (estadoNuevo === "sin_iniciar") impacto.aSinIniciar += 1;
      else if (estadoNuevo === "parcial") impacto.aParcial += 1;
      else impacto.aCompleto += 1;
    }
  }
  return impacto;
}

/** RF-26: no escribe nada, sólo dice cuántos elementos cambiarían de
 * estado si esta plantilla se guardara ahora mismo. */
export async function previsualizarPlantilla(
  cicloId: string,
  sistemaId: string,
  plantillaNueva: Plantilla,
): Promise<ImpactoPlantilla> {
  const supabase = await createClient();
  const elementos = await obtenerElementosParaImpacto(supabase, cicloId, sistemaId);
  return calcularImpacto(elementos, plantillaNueva);
}

export async function guardarPlantilla(
  cicloId: string,
  sistemaId: string,
  plantillaNueva: Plantilla,
): Promise<ImpactoPlantilla> {
  const supabase = await createClient();
  const elementos = await obtenerElementosParaImpacto(supabase, cicloId, sistemaId);
  const impacto = calcularImpacto(elementos, plantillaNueva);

  const { error: errorPlantilla } = await supabase
    .from("plantillas")
    .upsert({ ciclo_id: cicloId, sistema_id: sistemaId, ...plantillaNueva }, { onConflict: "ciclo_id,sistema_id" });
  if (errorPlantilla) throw errorPlantilla;

  for (const e of elementos) {
    if (!e.registroId) continue;
    const estadoNuevo = calcularEstado(plantillaNueva, e.registro, e.fotosPorMomento);
    if (estadoNuevo !== e.estadoActual) {
      const { error } = await supabase.from("registros").update({ estado: estadoNuevo }).eq("id", e.registroId);
      if (error) throw error;
    }
  }

  revalidatePath("/catalogo", "layout");
  revalidatePath("/capturar", "layout");
  revalidatePath("/recepcion");
  revalidatePath("/tablero");

  return impacto;
}
