"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerElementosCatalogo, obtenerSistemas } from "@/lib/datos";
import type { CicloConfig, TipoDiccionario } from "@/lib/tipos";

// =====================================================================
// Ciclo — primera escritura sobre 'ciclos' desde la aplicación (antes
// sólo se escribía en el insert inicial de cargar_catalogo.py y quedaba
// inmutable). Ver docs/decisiones.md D-21.
// =====================================================================
export interface DatosCiclo {
  nombre: string;
  config: CicloConfig;
}

export async function guardarCiclo(cicloId: string, datos: DatosCiclo): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ciclos").update(datos).eq("id", cicloId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

/** Flujo 7 paso 6: un ciclo cerrado queda disponible para consulta pero
 * ya no admite captura. No hay vuelta atrás desde aquí — el índice único
 * parcial de 0001_schema.sql (ux_ciclos_unico_abierto) es lo único que
 * impide tener dos ciclos abiertos a la vez, así que reabrir uno exige
 * tocar la base directamente. */
export async function cerrarCiclo(cicloId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ciclos").update({ estado: "cerrado", cerrado: new Date().toISOString() }).eq("id", cicloId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

// =====================================================================
// Sistemas — antes sólo se cargaban por migración (0002_sistemas_seed.sql).
// =====================================================================
export interface DatosSistema {
  nombre: string;
  rag: string | null;
  orden: number;
  activo: boolean;
  tipos: TipoDiccionario[];
}

export async function crearSistema(clave: string, datos: DatosSistema): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sistemas").insert({ clave, ...datos });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function actualizarSistema(sistemaId: string, datos: DatosSistema): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sistemas").update(datos).eq("id", sistemaId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

// =====================================================================
// Zonas — catálogo único de la planta (docs/decisiones.md D-18).
// =====================================================================
export interface DatosZona {
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export async function crearZona(clave: string, datos: DatosZona): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("zonas").insert({ clave, ...datos });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function actualizarZona(zonaId: string, datos: DatosZona): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("zonas").update(datos).eq("id", zonaId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

// =====================================================================
// Importar catálogo — antes en catalogo/actions.ts. Misma lógica exacta,
// sólo cambia de dirección (ver docs/decisiones.md D-14 y D-21).
// =====================================================================
export interface ElementoImportado {
  codigo: string;
  sistema: string;
  nombre: string;
  zona?: string | null;
  ubicacion?: string | null;
  referencia?: string | null;
  seccion?: string | null;
  orden_seccion?: number | null;
  tipo?: string | null;
  responsable?: string | null;
  item_rag?: number | null;
  orden?: number;
  activo?: boolean;
}

export interface CatalogoImportado {
  ciclo?: string;
  elementos: ElementoImportado[];
}

export interface ResumenSistema {
  sistema: string;
  altas: number;
  actualizaciones: number;
  bajas: number;
}

export interface ResultadoImportacion {
  resumen: ResumenSistema[];
  advertencias: string[];
}

async function reconciliarCatalogo(
  cicloId: string,
  catalogo: CatalogoImportado,
  aplicar: boolean,
): Promise<ResultadoImportacion> {
  if (!catalogo || !Array.isArray(catalogo.elementos)) {
    throw new Error('El archivo no tiene la forma esperada: falta un arreglo "elementos".');
  }

  const supabase = await createClient();
  const sistemas = await obtenerSistemas(supabase);
  const sistemaPorClave = new Map(sistemas.map((s) => [s.clave, s]));

  const porSistema = new Map<string, ElementoImportado[]>();
  for (const e of catalogo.elementos) {
    if (!e.codigo || !e.sistema || !e.nombre) {
      throw new Error(`Cada elemento necesita "codigo", "sistema" y "nombre". Revisa: ${JSON.stringify(e)}`);
    }
    const lista = porSistema.get(e.sistema);
    if (lista) lista.push(e);
    else porSistema.set(e.sistema, [e]);
  }

  const resumen: ResumenSistema[] = [];
  const advertencias: string[] = [];

  for (const [claveSistema, elementosDelArchivo] of porSistema) {
    const sistema = sistemaPorClave.get(claveSistema);
    if (!sistema) {
      advertencias.push(
        `Sistema desconocido "${claveSistema}": ${elementosDelArchivo.length} elemento(s) del archivo se ignoraron.`,
      );
      continue;
    }

    const actuales = await obtenerElementosCatalogo(supabase, cicloId, sistema.id);
    const actualesPorCodigo = new Map(actuales.map((e) => [e.codigo, e]));
    const vistos = new Set<string>();

    let altas = 0;
    let actualizaciones = 0;

    for (const importado of elementosDelArchivo) {
      vistos.add(importado.codigo);
      const existente = actualesPorCodigo.get(importado.codigo);
      const campos = {
        nombre: importado.nombre,
        zona: importado.zona ?? null,
        ubicacion: importado.ubicacion ?? null,
        referencia: importado.referencia ?? null,
        seccion: importado.seccion ?? null,
        orden_seccion: importado.orden_seccion ?? null,
        tipo: importado.tipo ?? null,
        responsable: importado.responsable ?? null,
        item_rag: importado.item_rag ?? null,
        orden: importado.orden ?? existente?.orden ?? 0,
        activo: importado.activo ?? true,
      };

      if (existente) {
        actualizaciones += 1;
        if (aplicar) {
          const { error } = await supabase.from("elementos").update(campos).eq("id", existente.id);
          if (error) throw error;
        }
      } else {
        altas += 1;
        if (aplicar) {
          const { error } = await supabase
            .from("elementos")
            .insert({ ciclo_id: cicloId, sistema_id: sistema.id, codigo: importado.codigo, ...campos });
          if (error) throw error;
        }
      }
    }

    // Nunca borra: lo que ya no aparece en el archivo se marca inactivo,
    // igual que una baja manual (Flujo 5) — se puede revertir.
    const paraDesactivar = actuales.filter((e) => e.activo && !vistos.has(e.codigo));
    if (aplicar && paraDesactivar.length > 0) {
      const { error } = await supabase
        .from("elementos")
        .update({ activo: false })
        .in(
          "id",
          paraDesactivar.map((e) => e.id),
        );
      if (error) throw error;
    }

    resumen.push({ sistema: claveSistema, altas, actualizaciones, bajas: paraDesactivar.length });
  }

  return { resumen, advertencias };
}

export async function previsualizarImportacion(
  cicloId: string,
  catalogo: CatalogoImportado,
): Promise<ResultadoImportacion> {
  return reconciliarCatalogo(cicloId, catalogo, false);
}

export async function confirmarImportacion(
  cicloId: string,
  catalogo: CatalogoImportado,
): Promise<ResultadoImportacion> {
  const resultado = await reconciliarCatalogo(cicloId, catalogo, true);
  revalidatePath("/", "layout");
  return resultado;
}

// =====================================================================
// Importar formatos RAG — antes en rag/actions.ts. Misma lógica exacta.
// =====================================================================
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
  revalidatePath("/", "layout");
  return resultado;
}
