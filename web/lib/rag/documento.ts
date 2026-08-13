// Arma el DocumentoRAG a partir de datos ya resueltos — no consulta nada,
// no sabe qué es Supabase. La resolución (Supabase hoy, JSON exportado
// después) es responsabilidad de quien llama. Esa pureza es lo que hace
// posible una segunda entrada local sin rehacer el renderizador (ver
// docs/decisiones.md D-16).
import type { Formato, PuntoDef, ValorPunto } from "../tipos";
import { CIERRE_ESTANDAR, CLASIFICACION, DOMICILIO, INSTRUCCION_GENERAL, RAZON_SOCIAL } from "./constantes";
import type { DocumentoRAG, ModoDocumentoRAG, RenglonRAG, SeccionRAG } from "./tipos";

const SIN_SECCION = "Sin sección";

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
  seccion: string | null;
  ordenSeccion: number | null;
  /** Orden de recorrido dentro de su sistema (elementos.orden). Decide el
   * orden de los renglones dentro de su sección. */
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
 * Agrupa elementos por 'seccion' y calcula el orden de cada grupo.
 *
 * El orden de una sección se toma de 'orden_seccion' de sus propios
 * elementos — no hay una tabla de secciones aparte (ver
 * docs/decisiones.md D-15: campo propio del catálogo). Si dos elementos
 * de la misma sección traen 'orden_seccion' distinto, se usa el primero no
 * nulo que aparezca: es una inconsistencia de captura, no algo que este
 * armado deba resolver por su cuenta. Una sección sin 'orden_seccion' en
 * ninguno de sus elementos no se pierde: queda al final, ordenada por
 * nombre.
 */
function agruparPorSeccion(elementos: ElementoParaDocumento[]): [string, ElementoParaDocumento[]][] {
  const ordenPorNombre = new Map<string, number | null>();
  const elementosPorNombre = new Map<string, ElementoParaDocumento[]>();

  for (const el of elementos) {
    const nombre = el.seccion?.trim() || SIN_SECCION;
    if (!elementosPorNombre.has(nombre)) {
      elementosPorNombre.set(nombre, []);
      ordenPorNombre.set(nombre, el.ordenSeccion);
    } else if (ordenPorNombre.get(nombre) === null && el.ordenSeccion !== null) {
      ordenPorNombre.set(nombre, el.ordenSeccion);
    }
    elementosPorNombre.get(nombre)!.push(el);
  }

  return [...elementosPorNombre.entries()].sort(([nombreA], [nombreB]) => {
    const ordenA = ordenPorNombre.get(nombreA) ?? null;
    const ordenB = ordenPorNombre.get(nombreB) ?? null;
    if (ordenA !== null && ordenB !== null && ordenA !== ordenB) return ordenA - ordenB;
    if (ordenA !== null && ordenB === null) return -1;
    if (ordenA === null && ordenB !== null) return 1;
    return nombreA.localeCompare(nombreB, "es");
  });
}

export function armarDocumentoRAG(entrada: EntradaDocumentoRAG): DocumentoRAG {
  const { formato, elementos, respuestas = [], cicloClave = null, cicloNombre = null } = entrada;
  // Defensivo: 'observaciones' ya no debería llegar como punto de
  // plantilla (ver docs/decisiones.md D-15), pero si una plantilla vieja
  // todavía lo trajera, no se duplica la columna fija.
  const puntos: PuntoDef[] = entrada.puntos.filter((p) => p.id !== "observaciones");
  const modo: ModoDocumentoRAG = respuestas.length > 0 ? "lleno" : "vacio";
  const respuestaPorElemento = new Map(respuestas.map((r) => [r.elementoId, r]));

  let contador = 0;
  const secciones: SeccionRAG[] = agruparPorSeccion(elementos).map(([nombre, elementosSeccion]) => {
    const renglones: RenglonRAG[] = [...elementosSeccion]
      .sort((a, b) => a.orden - b.orden)
      .map((el) => {
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
    secciones,
    totalRenglones: contador,
    cicloClave,
    cicloNombre,
    generado: (entrada.generado ?? new Date()).toISOString(),
    modo,
  };
}
