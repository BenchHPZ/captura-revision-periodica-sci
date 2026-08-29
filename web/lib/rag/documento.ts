// Arma el DocumentoRAG a partir de datos ya resueltos — no consulta nada,
// no sabe qué es Supabase. La resolución (Supabase hoy, JSON exportado
// después) es responsabilidad de quien llama. Esa pureza es lo que hace
// posible una segunda entrada local sin rehacer el renderizador (ver
// docs/decisiones.md D-16).
import { compararZonas, ordenarDentroDeZona, type ElementoParaOrdenar } from "../orden";
import type { Formato, PuntoDef, TipoDiccionario, ValorPunto } from "../tipos";
import { CIERRE_ESTANDAR, CLASIFICACION, DOMICILIO, INSTRUCCION_GENERAL, RAZON_SOCIAL } from "./constantes";
import type { DocumentoRAG, ModoDocumentoRAG, RenglonRAG, SeccionRAG } from "./tipos";

const SIN_ZONA = "Sin zona";

/** El slug de ruta para /rag/[formato]. 'RAG 2.3' -> 'RAG-2.3'. Ninguna
 * clave actual trae guiones, así que la conversión es reversible; si
 * algún día uno los trajera, habría que revisar esta pareja de funciones. */
export function claveASlug(clave: string): string {
  return clave.trim().replace(/\s+/g, "-");
}

export function slugAClave(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export interface ElementoParaDocumento {
  id: string;
  /** elementos.nombre */
  numeracion: string;
  ubicacion: string | null;
  referencia: string | null;
  /** Clave del diccionario de tipos del sistema ("G"), no el nombre
   * completo — ver docs/decisiones.md D-18. */
  tipo: string | null;
  /** zonas.nombre del elemento (ya resuelta por quien llama, vía
   * elementos.zona_id) — null si todavía no se le asignó zona. */
  zona: string | null;
  /** zonas.orden de esa misma zona. */
  zonaOrden: number | null;
  /** Fija la posición del elemento dentro de su zona — ver web/lib/orden.ts. */
  ordenAnclado: number | null;
  /** Orden heredado (elementos.orden); desempate cuando no hay ubicación
   * ni nombre que distingan dos elementos. */
  orden: number;
}

export interface RespuestaParaDocumento {
  elementoId: string;
  valores: Record<string, ValorPunto>;
  /** Lo que va en la columna Observaciones del documento. Quien arma
   * esta entrada debe pasar aquí `registro.pendientes` — no hay una
   * columna 'observaciones' aparte (ver docs/decisiones.md D-15 §7.2). */
  observaciones: string | null;
}

export interface EntradaDocumentoRAG {
  formato: Formato;
  /** Puntos de la plantilla vigente del sistema. */
  puntos: PuntoDef[];
  /** Diccionario de tipos del sistema de este formato — ver
   * docs/decisiones.md D-18. Vacío = la columna Tipo no se dibuja. */
  tipos: TipoDiccionario[];
  elementos: ElementoParaDocumento[];
  /** Ausente o vacío ⇒ modo vacío (documento en blanco, para llenar a mano). */
  respuestas?: RespuestaParaDocumento[];
  cicloClave?: string | null;
  cicloNombre?: string | null;
  /** Inyectable para pruebas y para que un mismo lote de formatos comparta
   * el sello de generación. Por defecto, el momento de la llamada. */
  generado?: Date;
}

/**
 * Agrupa elementos por 'zona' y calcula el orden de cada grupo a partir
 * de 'zonaOrden' — propiedad del catálogo de zonas, no de cada elemento
 * (ver docs/decisiones.md D-18: sustituye a 'orden_seccion', que sí vivía
 * por elemento y podía discrepar dentro de un mismo grupo). Un elemento
 * sin zona cae en "Sin zona", que se ordena al final junto con cualquier
 * otra zona sin 'orden' conocido.
 */
export function agruparPorZona(elementos: ElementoParaDocumento[]): [string, ElementoParaDocumento[]][] {
  const grupos = new Map<string, ElementoParaDocumento[]>();
  for (const el of elementos) {
    const nombre = el.zona?.trim() || SIN_ZONA;
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre)!.push(el);
  }

  return [...grupos.entries()].sort(([nombreA, elsA], [nombreB, elsB]) =>
    compararZonas(
      { nombre: nombreA, orden: elsA[0]?.zonaOrden ?? null },
      { nombre: nombreB, orden: elsB[0]?.zonaOrden ?? null },
    ),
  );
}

export function armarDocumentoRAG(entrada: EntradaDocumentoRAG): DocumentoRAG {
  const { formato, tipos, elementos, respuestas = [], cicloClave = null, cicloNombre = null } = entrada;
  // Defensivo: 'observaciones' ya no debería llegar como punto de
  // plantilla (ver docs/decisiones.md D-15), pero si una plantilla vieja
  // todavía lo trajera, no se duplica la columna fija.
  const puntos: PuntoDef[] = entrada.puntos.filter((p) => p.id !== "observaciones");
  const modo: ModoDocumentoRAG = respuestas.length > 0 ? "lleno" : "vacio";
  const respuestaPorElemento = new Map(respuestas.map((r) => [r.elementoId, r]));

  let contador = 0;
  const secciones: SeccionRAG[] = agruparPorZona(elementos).map(([nombre, elementosZona]) => {
    const ordenados = ordenarDentroDeZona(
      elementosZona.map(
        (el): ElementoParaOrdenar & { el: ElementoParaDocumento } => ({
          id: el.id,
          ubicacion: el.ubicacion,
          nombre: el.numeracion,
          ordenAnclado: el.ordenAnclado,
          el,
        }),
      ),
    );
    const renglones: RenglonRAG[] = ordenados.map(({ el }) => {
      contador += 1;
      const respuesta = respuestaPorElemento.get(el.id);
      return {
        id: contador,
        elementoId: el.id,
        numeracion: el.numeracion,
        // Vacío ≠ "Exterior": vacío es "todavía no se capturó", Exterior
        // es un valor real que el catálogo debe traer explícito (ver
        // scripts/extraer_rags.py). No se adivina aquí.
        ubicacion: el.ubicacion?.trim() ?? "",
        referencia: el.referencia?.trim() ?? "",
        tipo: el.tipo?.trim() ?? "",
        valores: respuesta?.valores ?? {},
        observaciones: respuesta?.observaciones?.trim() ?? "",
      };
    });
    return { nombre, renglones };
  });

  return {
    clave: formato.clave,
    nombre: formato.nombre,
    periodicidad: formato.periodicidad,
    // clasificacion/razon_social/domicilio son globales (constantes.ts);
    // documento_referencia/revision son particulares de este formato —
    // ver docs/decisiones.md D-15 §7.1. Se componen aquí en un solo
    // objeto para que render.ts no tenga que conocer la separación.
    encabezado: {
      clasificacion: CLASIFICACION,
      razon_social: RAZON_SOCIAL,
      domicilio: DOMICILIO,
      documento_referencia: formato.documento_referencia,
      revision: formato.revision,
    },
    // La instrucción general va primero, siempre igual; las propias del
    // formato (si las hay) se agregan después.
    instrucciones: [INSTRUCCION_GENERAL, ...formato.instrucciones],
    cierre: CIERRE_ESTANDAR,
    puntos,
    columnas: formato.columnas,
    tipos,
    secciones,
    totalRenglones: contador,
    cicloClave,
    cicloNombre,
    generado: (entrada.generado ?? new Date()).toISOString(),
    modo,
  };
}
