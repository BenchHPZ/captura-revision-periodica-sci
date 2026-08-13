"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Cargar formatos desde la app, no sólo desde scripts/cargar-formatos.ts
 * (D-16): la política de 'formatos' ya permite escribir a cualquier
 * usuario autenticado (0005_rag.sql, "autenticados_todo"), así que esta
 * acción usa la sesión normal del navegador, no la llave de servicio.
 * El script sigue siendo necesario para la carga inicial —antes de que
 * exista una sesión con la que entrar aquí— pero, una vez arriba la app,
 * corregir un formato no debería exigir abrir una terminal.
 *
 * Sólo lo PARTICULAR de cada formato entra por aquí. Lo que debe ser
 * idéntico en los cinco (clasificación, razón social, domicilio,
 * instrucción general, cierre) no se importa ni se guarda — vive en
 * código, en lib/rag/constantes.ts (ver docs/decisiones.md D-15 §7.1).
 */
export interface FormatoImportado {
  clave: string;
  nombre: string;
  periodicidad: string;
  sistema?: string | null;
  documento_referencia: string;
  revision?: string | null;
  instrucciones: string[];
  notas?: string | null;
}

export interface FormatosImportados {
  formatos: FormatoImportado[];
}

export interface ResumenFormatos {
  altas: number;
  actualizaciones: number;
  advertencias: string[];
}

async function reconciliarFormatos(datos: FormatosImportados, aplicar: boolean): Promise<ResumenFormatos> {
  if (!datos || !Array.isArray(datos.formatos)) {
    throw new Error('El archivo no tiene la forma esperada: falta un arreglo "formatos".');
  }

  const supabase = await createClient();

  const { data: sistemas, error: errorSistemas } = await supabase.from("sistemas").select("id, clave");
  if (errorSistemas) throw errorSistemas;
  const idPorClave = new Map<string, string>((sistemas ?? []).map((s) => [s.clave as string, s.id as string]));

  const { data: existentes, error: errorExistentes } = await supabase.from("formatos").select("clave");
  if (errorExistentes) throw errorExistentes;
  const clavesExistentes = new Set((existentes ?? []).map((f) => f.clave as string));

  const advertencias: string[] = [];
  let altas = 0;
  let actualizaciones = 0;
  const filas: {
    clave: string;
    nombre: string;
    periodicidad: string;
    sistema_id: string | null;
    documento_referencia: string;
    revision: string | null;
    instrucciones: string[];
    notas: string | null;
  }[] = [];

  for (const f of datos.formatos) {
    if (!f.clave || !f.nombre || !f.periodicidad || !f.documento_referencia) {
      throw new Error(
        `Cada formato necesita "clave", "nombre", "periodicidad" y "documento_referencia". Revisa: ${JSON.stringify(f)}`,
      );
    }

    let sistemaId: string | null = null;
    if (f.sistema) {
      sistemaId = idPorClave.get(f.sistema) ?? null;
      if (!sistemaId) {
        advertencias.push(`'${f.clave}': el sistema '${f.sistema}' no existe; se carga sin sistema asociado.`);
      }
    }

    if (clavesExistentes.has(f.clave)) actualizaciones += 1;
    else altas += 1;

    filas.push({
      clave: f.clave,
      nombre: f.nombre,
      periodicidad: f.periodicidad,
      sistema_id: sistemaId,
      documento_referencia: f.documento_referencia,
      revision: f.revision ?? null,
      instrucciones: f.instrucciones ?? [],
      notas: f.notas ?? null,
    });
  }

  if (aplicar) {
    const { error } = await supabase.from("formatos").upsert(filas, { onConflict: "clave" });
    if (error) throw error;
  }

  return { altas, actualizaciones, advertencias };
}

export async function previsualizarFormatos(datos: FormatosImportados): Promise<ResumenFormatos> {
  return reconciliarFormatos(datos, false);
}

export async function confirmarFormatos(datos: FormatosImportados): Promise<ResumenFormatos> {
  const resultado = await reconciliarFormatos(datos, true);
  revalidatePath("/rag", "layout");
  return resultado;
}

/**
 * Edición desde /rag/[formato] (FormatoEditor.tsx). Acotada a los mismos
 * campos particulares de arriba — 'clave' no se toca: es la llave única
 * y el slug de la URL, mismo criterio que usa PlantillaEditor.tsx para
 * el id de un punto ya existente. Los campos globales (§ arriba) ni
 * siquiera llegan a esta forma, así que no hay manera de editarlos aquí.
 */
export interface DatosFormatoEditable {
  nombre: string;
  periodicidad: string;
  sistema_id: string | null;
  documento_referencia: string;
  revision: string | null;
  instrucciones: string[];
}

export async function guardarFormato(formatoId: string, datos: DatosFormatoEditable): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("formatos").update(datos).eq("id", formatoId);
  if (error) throw error;
  revalidatePath("/rag", "layout");
}
