"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerElementosCatalogo, obtenerSistemas } from "@/lib/datos";

export interface ElementoImportado {
  codigo: string;
  sistema: string;
  nombre: string;
  zona?: string | null;
  ubicacion?: string | null;
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

/**
 * Concilia el catálogo importado contra lo que ya existe (Flujo 5,
 * RF-24). A propósito sólo toca los sistemas que aparecen en el archivo:
 * un archivo parcial —exportado, recortado a un solo sistema y editado—
 * no debe dar de baja los demás sistemas por no mencionarlos. Ver
 * docs/decisiones.md D-14.
 *
 * Con aplicar=false calcula el resumen sin escribir nada, para poder
 * mostrarlo antes de confirmar (mismo principio que la vista previa de
 * impacto al cambiar una plantilla, RF-26).
 */
async function reconciliar(
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
  return reconciliar(cicloId, catalogo, false);
}

export async function confirmarImportacion(
  cicloId: string,
  catalogo: CatalogoImportado,
): Promise<ResultadoImportacion> {
  const resultado = await reconciliar(cicloId, catalogo, true);
  revalidatePath("/catalogo", "layout");
  revalidatePath("/capturar", "layout");
  revalidatePath("/recepcion");
  revalidatePath("/tablero");
  return resultado;
}
