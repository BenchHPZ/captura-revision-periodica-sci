"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ALTO_FILA_BITACORA_POR_DEFECTO_MM, DIAS_POR_DEFECTO } from "@/lib/checklist/constantes";
import { esClaveTamanoHoja, esOrientacionHoja, type ClaveTamanoHoja, type OrientacionHoja } from "@/lib/documentos/pagina";
import type { CampoAgrupacionChecklist } from "@/lib/tipos";

// =====================================================================
// Importar/construir checklist — Etapa 3 del plan de ampliación de RAGs.
// Mismo espíritu que reconciliarFormatos() en configuracion/actions.ts
// (conciliación por 'clave'), pero SIN diff incremental: el checklist es
// una estructura anidada (bloques → ítems) que cambia poco y completa —
// tiene más sentido reemplazarla entera en cada import/guardado que
// intentar calzar ítems viejos contra nuevos por identidad. Ver
// docs/decisiones.md D-22.
//
// El constructor de la pestaña "Construir tipo nuevo" (ConstructorChecklist.tsx)
// y la importación de un JSON externo terminan aquí mismo: ambos arman la
// misma forma (ChecklistImportado) y llaman a las mismas dos funciones.
// =====================================================================

const TIPOS_BLOQUE = ["portada_fotos", "tabla_verificacion", "tabla_simple", "bitacora_libre"] as const;
type TipoBloqueImportado = (typeof TIPOS_BLOQUE)[number];

const CAMPOS_AGRUPACION: CampoAgrupacionChecklist[] = ["categoria", "ubicacion_fisica"];

export interface VerificacionImportada {
  id: string;
  etiqueta: string;
}

export interface ItemChecklistImportado {
  categoria?: string | null;
  ubicacion_fisica?: string | null;
  pos?: string | null;
  nombre: string;
  cantidad?: string | null;
  verificaciones?: VerificacionImportada[];
  foto_referencia_ruta?: string | null;
  orden?: number;
  notas?: string | null;
}

export interface ColumnaBitacoraImportada {
  id: string;
  etiqueta: string;
}

export interface BloqueChecklistImportado {
  tipo: TipoBloqueImportado;
  nombre: string;
  orden: number;
  /** Sólo con efecto en tabla_verificacion/tabla_simple — ver migración 0009. */
  agrupacion?: CampoAgrupacionChecklist[];
  items?: ItemChecklistImportado[];
  /** Sólo bitacora_libre. */
  columnas?: ColumnaBitacoraImportada[];
  /** Sólo bitacora_libre. */
  filas_blanco?: number | null;
  /** Sólo bitacora_libre: alto de cada renglón en blanco, en mm. Opcional
   * para no romper un JSON escrito antes — ver docs/decisiones.md D-25. */
  alto_fila_mm?: number | null;
  /** true (o ausente): el bloque empieza en hoja nueva, el comportamiento
   * de siempre. false: continúa en la hoja del bloque anterior. Ver
   * docs/decisiones.md D-25. */
  hoja_propia?: boolean;
}

export interface FormatoChecklistImportado {
  clave: string;
  nombre: string;
  periodicidad?: string;
  documento_referencia: string;
  revision?: string | null;
  instrucciones?: string[];
  notas?: string | null;
  /** Cuántas columnas de fecha imprime — opcional para no romper un JSON
   * guardado antes de esta característica; ausente = DIAS_POR_DEFECTO
   * (31), el mismo respaldo que ya existía. Ver docs/decisiones.md D-23. */
  columnas_fecha?: number;
  /** Hoja en la que se imprime. Opcionales: ausentes toman el default de
   * la base (A4 vertical). Ver docs/decisiones.md D-25. */
  tamano_hoja?: ClaveTamanoHoja;
  orientacion?: OrientacionHoja;
}

export interface ChecklistImportado {
  formato: FormatoChecklistImportado;
  bloques: BloqueChecklistImportado[];
}

export interface ResumenChecklist {
  formatoNuevo: boolean;
  totalBloques: number;
  totalItems: number;
  advertencias: string[];
}

/** Comprueba la forma mínima y señala ambigüedades como advertencia en
 * vez de rechazar el archivo — mismo criterio que Anomalias en
 * scripts/extraer_checklist.py: lo que sí es imprimible se deja pasar. */
function validarChecklist(datos: ChecklistImportado): string[] {
  if (!datos || typeof datos !== "object") {
    throw new Error("El archivo no tiene la forma esperada.");
  }
  const { formato, bloques } = datos;
  if (!formato || !formato.clave?.trim() || !formato.nombre?.trim() || !formato.documento_referencia?.trim()) {
    throw new Error('El "formato" necesita "clave", "nombre" y "documento_referencia".');
  }
  if (formato.columnas_fecha !== undefined && (!Number.isInteger(formato.columnas_fecha) || formato.columnas_fecha < 1)) {
    throw new Error('"columnas_fecha" debe ser un entero mayor a 0.');
  }
  if (!Array.isArray(bloques) || bloques.length === 0) {
    throw new Error('Falta un arreglo "bloques" con al menos un elemento.');
  }
  if (formato.tamano_hoja !== undefined && !esClaveTamanoHoja(formato.tamano_hoja)) {
    throw new Error('"tamano_hoja" debe ser a4, carta u oficio.');
  }
  if (formato.orientacion !== undefined && !esOrientacionHoja(formato.orientacion)) {
    throw new Error('"orientacion" debe ser vertical o apaisada.');
  }

  const advertencias: string[] = [];
  let portadas = 0;
  let bitacoras = 0;

  for (const [i, b] of bloques.entries()) {
    const referencia = b.nombre?.trim() || `bloque #${i + 1}`;
    if (!TIPOS_BLOQUE.includes(b.tipo)) {
      throw new Error(`'${referencia}': tipo "${b.tipo}" no reconocido (${TIPOS_BLOQUE.join(", ")}).`);
    }
    if (!b.nombre?.trim()) throw new Error(`Bloque #${i + 1}: falta "nombre".`);

    if (b.tipo === "portada_fotos") portadas += 1;
    if (b.tipo === "bitacora_libre") bitacoras += 1;

    if (b.tipo === "tabla_verificacion" || b.tipo === "tabla_simple") {
      const agrupacion = b.agrupacion ?? [];
      const valida =
        agrupacion.length <= 2 &&
        new Set(agrupacion).size === agrupacion.length &&
        agrupacion.every((c) => CAMPOS_AGRUPACION.includes(c));
      if (!valida) {
        throw new Error(`'${referencia}': "agrupacion" debe tener 0 a 2 valores únicos de categoria/ubicacion_fisica.`);
      }
      if (!b.items || b.items.length === 0) advertencias.push(`'${referencia}': no trae ítems.`);
    }

    if (b.tipo === "bitacora_libre") {
      if (!b.columnas || b.columnas.length === 0) advertencias.push(`'${referencia}': no trae columnas.`);
      if (b.filas_blanco !== undefined && b.filas_blanco !== null && (!Number.isInteger(b.filas_blanco) || b.filas_blanco < 1)) {
        throw new Error(`'${referencia}': "filas_blanco" debe ser un entero mayor a 0.`);
      }
      if (b.alto_fila_mm !== undefined && b.alto_fila_mm !== null && (!Number.isInteger(b.alto_fila_mm) || b.alto_fila_mm < 1 || b.alto_fila_mm > 60)) {
        throw new Error(`'${referencia}': "alto_fila_mm" debe ser un entero entre 1 y 60.`);
      }
    }

    for (const item of b.items ?? []) {
      if (!item.nombre?.trim()) throw new Error(`'${referencia}': un ítem no tiene "nombre".`);
    }
  }

  // Ya no hay límite técnico: renderizarCuerpoChecklist() recorre los
  // bloques en su orden y los imprime todos (antes tomaba sólo el primer
  // portada_fotos y el primer bitacora_libre, y descartaba el resto en
  // silencio — ver docs/decisiones.md D-25). Varias portadas siguen siendo
  // raras, así que se avisa, pero como duda, no como pérdida.
  if (portadas > 1) advertencias.push(`Hay ${portadas} bloques "portada_fotos"; se imprimirán todos, en el orden dado.`);
  if (bitacoras > 1) advertencias.push(`Hay ${bitacoras} bloques "bitacora_libre"; se imprimirán todos, en el orden dado.`);

  return advertencias;
}

async function reconciliarChecklist(datos: ChecklistImportado, aplicar: boolean): Promise<ResumenChecklist> {
  const advertencias = validarChecklist(datos);
  const supabase = await createClient();

  const { data: existente, error: errorExistente } = await supabase
    .from("formatos")
    .select("id")
    .eq("clave", datos.formato.clave)
    .maybeSingle();
  if (errorExistente) throw errorExistente;

  const totalBloques = datos.bloques.length;
  const totalItems = datos.bloques.reduce((suma, b) => suma + (b.items?.length ?? 0), 0);

  if (!aplicar) {
    return { formatoNuevo: !existente, totalBloques, totalItems, advertencias };
  }

  const { data: formatoGuardado, error: errorFormato } = await supabase
    .from("formatos")
    .upsert(
      {
        clave: datos.formato.clave,
        nombre: datos.formato.nombre,
        periodicidad: datos.formato.periodicidad?.trim() || "diario",
        sistema_id: null,
        tipo_documento: "checklist",
        documento_referencia: datos.formato.documento_referencia,
        revision: datos.formato.revision ?? null,
        instrucciones: datos.formato.instrucciones ?? [],
        notas: datos.formato.notas ?? null,
        columnas_fecha: datos.formato.columnas_fecha ?? DIAS_POR_DEFECTO,
        tamano_hoja: datos.formato.tamano_hoja ?? "a4",
        orientacion: datos.formato.orientacion ?? "apaisada",
      },
      { onConflict: "clave" },
    )
    .select("id")
    .single();
  if (errorFormato) throw errorFormato;
  const formatoId = formatoGuardado.id as string;

  // Reemplazo completo, no diff incremental (ver nota de módulo): borrar
  // primero se lleva por cascada los checklist_items de cada bloque, así
  // que un ítem quitado del archivo nunca queda huérfano.
  const { error: errorBorrar } = await supabase.from("checklist_bloques").delete().eq("formato_id", formatoId);
  if (errorBorrar) throw errorBorrar;

  for (const bloque of datos.bloques) {
    const { data: bloqueGuardado, error: errorBloque } = await supabase
      .from("checklist_bloques")
      .insert({
        formato_id: formatoId,
        tipo: bloque.tipo,
        nombre: bloque.nombre,
        orden: bloque.orden,
        columnas: bloque.columnas ?? [],
        filas_blanco: bloque.filas_blanco ?? null,
        alto_fila_mm: bloque.alto_fila_mm ?? ALTO_FILA_BITACORA_POR_DEFECTO_MM,
        agrupacion: bloque.agrupacion ?? [],
        hoja_propia: bloque.hoja_propia ?? true,
      })
      .select("id")
      .single();
    if (errorBloque) throw errorBloque;

    const items = bloque.items ?? [];
    if (items.length > 0) {
      const filas = items.map((item, i) => ({
        bloque_id: bloqueGuardado.id as string,
        categoria: item.categoria ?? null,
        ubicacion_fisica: item.ubicacion_fisica ?? null,
        pos: item.pos ?? null,
        nombre: item.nombre,
        cantidad: item.cantidad ?? null,
        foto_referencia_ruta: item.foto_referencia_ruta ?? null,
        verificaciones: item.verificaciones ?? [],
        orden: item.orden ?? i + 1,
        notas: item.notas ?? null,
      }));
      const { error: errorItems } = await supabase.from("checklist_items").insert(filas);
      if (errorItems) throw errorItems;
    }
  }

  return { formatoNuevo: !existente, totalBloques, totalItems, advertencias };
}

export async function previsualizarChecklist(datos: ChecklistImportado): Promise<ResumenChecklist> {
  return reconciliarChecklist(datos, false);
}

export async function confirmarChecklist(datos: ChecklistImportado): Promise<ResumenChecklist> {
  const resultado = await reconciliarChecklist(datos, true);
  revalidatePath("/", "layout");
  return resultado;
}

// =====================================================================
// Crear un RAG mensual desde /rag — antes sólo por importación masiva de
// JSON en Configuración (reconciliarFormatos() en configuracion/actions.ts).
// Elige un 'sistema_id' YA EXISTENTE; crear un sistema nuevo sigue siendo
// Configuración → Sistemas (fuera de alcance aquí). Ver docs/decisiones.md D-23.
// =====================================================================
export interface DatosFormatoRagNuevo {
  clave: string;
  nombre: string;
  periodicidad: string;
  sistema_id: string;
  documento_referencia: string;
  revision: string | null;
  instrucciones: string[];
  columnas: { ubicacion: boolean; referencia: boolean };
  tamano_hoja: ClaveTamanoHoja;
  orientacion: OrientacionHoja;
}

export async function crearFormatoRag(datos: DatosFormatoRagNuevo): Promise<{ id: string; sistemaClave: string }> {
  const supabase = await createClient();

  const { data: sistema, error: errorSistema } = await supabase
    .from("sistemas")
    .select("id, clave")
    .eq("id", datos.sistema_id)
    .maybeSingle();
  if (errorSistema) throw errorSistema;
  if (!sistema) throw new Error("El sistema elegido no existe.");

  const { data: yaActivo, error: errorYaActivo } = await supabase
    .from("formatos")
    .select("id")
    .eq("sistema_id", datos.sistema_id)
    .eq("tipo_documento", "rag")
    .eq("activo", true)
    .maybeSingle();
  if (errorYaActivo) throw errorYaActivo;
  if (yaActivo) throw new Error("Este sistema ya tiene un formato RAG activo. Edítalo o desactívalo antes de crear otro.");

  const { data: claveExistente, error: errorClave } = await supabase
    .from("formatos")
    .select("id")
    .eq("clave", datos.clave)
    .maybeSingle();
  if (errorClave) throw errorClave;
  if (claveExistente) throw new Error(`Ya existe un formato con la clave "${datos.clave}".`);

  const { data, error } = await supabase
    .from("formatos")
    .insert({
      clave: datos.clave,
      nombre: datos.nombre,
      periodicidad: datos.periodicidad || "mensual",
      sistema_id: datos.sistema_id,
      tipo_documento: "rag",
      documento_referencia: datos.documento_referencia,
      revision: datos.revision,
      tamano_hoja: datos.tamano_hoja,
      orientacion: datos.orientacion,
      instrucciones: datos.instrucciones,
      columnas: datos.columnas,
      activo: true,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/", "layout");
  return { id: data.id as string, sistemaClave: sistema.clave as string };
}

// =====================================================================
// Baja recuperable / reactivación — aplica a AMBOS tipos de formato por
// igual. No toca elementos/plantillas/registros/fotos: ninguno cuelga de
// 'formatos.id' (sólo checklist_bloques lo hace), así que un sistema
// sigue capturando con o sin formato — igual que /sistemas/[clave]/page.tsx
// ya tolera hoy. Ver docs/decisiones.md D-23.
// =====================================================================
export async function cambiarActivoFormato(formatoId: string, activo: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("formatos").update({ activo }).eq("id", formatoId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

// =====================================================================
// Borrado permanente — primera fila de DEFINICIÓN que se borra de verdad
// en esta aplicación (el único precedente, 'fotos', es una fila hoja de
// captura). Dos condiciones exigidas del lado del SERVIDOR, no sólo en la
// UI: (1) el formato debe estar dado de baja — la baja es la vista previa
// obligatoria de este borrado, no un botón aparte —, y (2) hay que teclear
// la 'clave' exacta como confirmación. checklist_bloques/checklist_items
// se van por cascada (migración 0008) si el formato es tipo 'checklist'.
// No limpia Storage ('checklist-ref/{clave}/…') — mismo punto ciego que ya
// tiene confirmarChecklist() al reemplazar bloques, no se resuelve aquí.
// Ver docs/decisiones.md D-23.
// =====================================================================
export async function eliminarFormatoPermanente(formatoId: string, claveConfirmacion: string): Promise<void> {
  const supabase = await createClient();
  const { data: formato, error: errorFormato } = await supabase
    .from("formatos")
    .select("id, clave, activo")
    .eq("id", formatoId)
    .maybeSingle();
  if (errorFormato) throw errorFormato;
  if (!formato) throw new Error("El formato ya no existe.");
  if (formato.activo) throw new Error("Da de baja el formato antes de eliminarlo permanentemente.");
  if (formato.clave !== claveConfirmacion.trim()) throw new Error("La clave no coincide.");

  const { error } = await supabase.from("formatos").delete().eq("id", formatoId);
  if (error) throw error;
  revalidatePath("/", "layout");
}
