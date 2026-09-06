"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEPOSITO, obtenerElementosParaImpacto, type ElementoParaImpacto } from "@/lib/datos";
import { calcularEstado } from "@/lib/estado";
import type { ClaveTamanoHoja, OrientacionHoja } from "@/lib/documentos/pagina";
import { rutaFoto } from "@/lib/rutas";
import type { Elemento, Plantilla } from "@/lib/tipos";

function revalidarTodo() {
  revalidatePath("/sistemas", "layout");
  revalidatePath("/capturar", "layout");
  revalidatePath("/recepcion");
  revalidatePath("/", "page");
}

// =====================================================================
// Elementos — antes en catalogo/[sistema]/actions.ts. 'zona' y 'seccion'
// (texto libre) se sustituyen por 'zona_id' (catálogo único, D-18);
// 'tipo' pasa a ser la clave del diccionario del sistema.
// =====================================================================
export interface DatosElemento {
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  /** ≤5 palabras — se valida en ElementosCatalogo.tsx antes de llegar aquí. */
  referencia: string | null;
  zona_id: string | null;
  /** Cuando no es null, fija la posición dentro de su zona — ver web/lib/orden.ts. */
  orden_anclado: number | null;
  /** Clave del diccionario de tipos del sistema, no el nombre completo. */
  tipo: string | null;
  responsable: string | null;
}

const SELECT_ELEMENTO =
  "id, sistema_id, codigo, nombre, zona, ubicacion, tipo, responsable, item_rag, orden, activo, notas, referencia, seccion, orden_seccion, zona_id, orden_anclado";

async function siguienteOrden(supabase: Awaited<ReturnType<typeof createClient>>, sistemaId: string): Promise<number> {
  const { data, error } = await supabase
    .from("elementos")
    .select("orden")
    .eq("sistema_id", sistemaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.orden ?? 0) + 1;
}

/** El catálogo ya no cuelga de ningún ciclo (docs/decisiones.md D-26): un
 * elemento nuevo se da de alta una sola vez y persiste. */
export async function crearElemento(sistemaId: string, datos: DatosElemento): Promise<Elemento> {
  const supabase = await createClient();
  const orden = await siguienteOrden(supabase, sistemaId);
  const { data, error } = await supabase
    .from("elementos")
    .insert({ sistema_id: sistemaId, ...datos, orden })
    .select(SELECT_ELEMENTO)
    .single();
  if (error) throw error;
  revalidarTodo();
  return data as Elemento;
}

/**
 * Si el código cambia, mueve cada fotografía ya subida a la ruta con el
 * código nuevo — docs/modelo-de-datos.md §5 deriva la ruta del código —
 * y actualiza fotos.ruta. Ninguna fotografía se pierde ni se re-sube
 * (Flujo 5: "el sistema lo hace y avisa").
 *
 * Un elemento persiste entre ciclos (docs/decisiones.md D-26), así que
 * puede tener un registro por cada ciclo en que se supervisó, cada uno
 * con sus fotos bajo la ruta de SU propio ciclo — no sólo el abierto. Por
 * eso ya no recibe `cicloClave`: cada registro trae el suyo.
 */
export async function actualizarElemento(elementoId: string, sistemaClave: string, codigoAnterior: string, datos: DatosElemento) {
  const supabase = await createClient();

  if (datos.codigo !== codigoAnterior) {
    const { data: registros, error: errorRegistros } = await supabase
      .from("registros")
      .select("id, ciclo:ciclos(clave)")
      .eq("elemento_id", elementoId);
    if (errorRegistros) throw errorRegistros;

    for (const registro of registros ?? []) {
      const ciclo = Array.isArray(registro.ciclo) ? registro.ciclo[0] : registro.ciclo;
      if (!ciclo) continue;

      const { data: fotos, error: errorFotos } = await supabase
        .from("fotos")
        .select("id, momento, ruta, orden")
        .eq("registro_id", registro.id);
      if (errorFotos) throw errorFotos;

      for (const foto of fotos ?? []) {
        const rutaNueva = rutaFoto(ciclo.clave as string, sistemaClave, datos.codigo, foto.momento, foto.orden);
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
  revalidarTodo();
}

/** Dar de baja no borra (Flujo 5): el elemento sale de las listas de
 * captura y de los conteos, pero conserva lo capturado por si se revierte. */
export async function cambiarActivo(elementoId: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("elementos").update({ activo }).eq("id", elementoId);
  if (error) throw error;
  revalidarTodo();
}

// =====================================================================
// Plantilla — sin cambios de fondo, sólo de dirección.
// =====================================================================
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

  revalidarTodo();
  return impacto;
}

// =====================================================================
// Formato — antes en rag/actions.ts. Gana 'columnas' (D-19).
// =====================================================================
export interface DatosFormatoEditable {
  nombre: string;
  periodicidad: string;
  documento_referencia: string;
  revision: string | null;
  instrucciones: string[];
  columnas: { ubicacion: boolean; referencia: boolean };
  /** Ver docs/decisiones.md D-25. */
  tamano_hoja: ClaveTamanoHoja;
  orientacion: OrientacionHoja;
}

export async function guardarFormato(formatoId: string, datos: DatosFormatoEditable): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("formatos").update(datos).eq("id", formatoId);
  if (error) throw error;
  revalidarTodo();
}
