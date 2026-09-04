// Lo que es idéntico en los cinco formatos mensuales, y por eso vive en
// código y no en la tabla 'formatos': así no hay manera de que diverjan
// entre RAG (ver docs/decisiones.md D-15 §7.1). Puro — sin Next, sin
// Supabase, sin React — mismo requisito que el resto de lib/rag/.
import type { CierreFormato } from "./tipos";

// CLASIFICACION/RAZON_SOCIAL/DOMICILIO/LOGO_VW_SVG son idénticos entre
// RAG y el tipo "checklist" (ver web/lib/checklist/), así que viven en
// web/lib/documentos/constantes.ts y se reexportan aquí para no romper
// los imports existentes en documento.ts/render.ts — ver docs/decisiones.md
// D-22. INSTRUCCION_GENERAL y CIERRE_ESTANDAR sí son propios de RAG (el
// checklist tiene su propia instrucción y su propio cierre, repetido por
// columna en vez de una sola vez al final) y se quedan aquí.
export { CLASIFICACION, RAZON_SOCIAL, DOMICILIO, LOGO_VW_SVG } from "../documentos/constantes";

/**
 * Única para los cinco formatos. Las 'instrucciones' propias de cada
 * formato (p. ej. "P = Pie, G = Gabinete" en RAG 2.2) se concatenan
 * después de ésta al renderizar — ver documento.ts.
 */
export const INSTRUCCION_GENERAL =
  "Marque SI o NO en cada punto de revisión según el estado del elemento. Toda respuesta NO debe " +
  "quedar explicada en la columna de Observaciones, y darle seguimiento hasta su corrección.";

/**
 * Bloque de cierre único para los cinco. Estandariza a propósito los tres
 * acomodos distintos que traían los PDF de origen (RAG 2.2/2.3: "Bombero
 * que realizó" + "Coordinador Técnico de Soporte"; RAG 2.4: los mismos
 * dos más "Grupo" aparte; RAG 2.7/2.8: "Realizó" + "Coordinador de
 * Soporte de PCI") — es el objetivo de la estandarización, no un
 * descuido. "Grupo" se pliega dentro de la etiqueta de "Realizó" en vez
 * de ser una cuarta columna, para no romper el patrón de tres campos que
 * ya traían la mayoría de los formatos.
 */
export const CIERRE_ESTANDAR: CierreFormato = {
  repetir: true,
  campos: [
    { id: "realizo", etiqueta: "Realizó (nombre, grupo y firma)", tipo: "firma" },
    { id: "fecha", etiqueta: "Fecha", tipo: "fecha" },
    { id: "coordinador", etiqueta: "Coordinador de Soporte de PCI (nombre y firma)", tipo: "firma" },
  ],
};
