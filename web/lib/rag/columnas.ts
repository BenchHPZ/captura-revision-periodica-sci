// Única fuente de las columnas del documento RAG. Antes esta lista no
// existía como constante: estaba repartida a mano en cinco lugares de
// render.ts (anchos en mm, el conteo de colspan, el <colgroup>, los <th>
// y los <td>), y el desajuste entre esos conteos es exactamente el
// defecto que docs/decisiones.md D-15 documenta haber corregido una vez
// — con columnas ahora condicionales (Ubicación/Referencia por formato,
// Tipo según el sistema) ese riesgo era real de reintroducir sin este
// módulo. render.ts deriva sus cinco usos de columnasDe(); totalCols pasa
// a ser columnas.length, así que los dos conteos coinciden por
// construcción — ver docs/decisiones.md D-19.
import { PAGINA_POR_DEFECTO, presupuestoColumnasMM, type ConfiguracionPagina } from "../documentos/pagina";
import type { TipoPunto } from "../tipos";
import type { DocumentoRAG } from "./tipos";

// El presupuesto de ancho ya no se supone aquí: sale de la hoja del
// formato, vía web/lib/documentos/pagina.ts — la misma fuente que alimenta
// el @page del CSS, para que no puedan desincronizarse (antes eran el 200
// de aquí contra el `letter portrait` de estilos.ts, sin nada que los
// atara; ver docs/decisiones.md D-25). Sin holgura: Observaciones se lleva
// todo lo que sobra, así que el redondeo no aprieta a nadie.
const ANCHO_ID_MM = 7;
const ANCHO_NUMERACION_MM = 20;
const ANCHO_UBICACION_MM = 18;
const ANCHO_REFERENCIA_MM = 28;
const ANCHO_TIPO_MM = 10;
const ANCHO_PUNTO_MM = 10; // una sola columna por punto SI/NO — la respuesta se escribe dentro
const ANCHO_PUNTO_SIMPLE_MM = 20; // tipos que no son SI/NO (texto, número, fecha, selección)
const ANCHO_OBSERVACIONES_MIN_MM = 30;

export interface ColumnaRAG {
  /** 'id' | 'numeracion' | 'ubicacion' | 'referencia' | 'tipo' | el id de
   * un punto de la plantilla | 'observaciones'. */
  id: string;
  etiqueta: string;
  anchoMM: number;
  clase: string;
  /** Es una columna de punto de revisión (etiqueta rotada si es SI/NO) —
   * decide si el encabezado se envuelve en <span>, igual que antes. */
  origen: "fijo" | "punto";
  vertical: boolean;
}

function esPuntoRespuesta(tipo: TipoPunto): boolean {
  return tipo === "si_no" || tipo === "si_no_na";
}

export function columnasDe(doc: DocumentoRAG, pagina: ConfiguracionPagina = PAGINA_POR_DEFECTO): ColumnaRAG[] {
  const columnas: ColumnaRAG[] = [
    { id: "id", etiqueta: "#", anchoMM: ANCHO_ID_MM, clase: "rag-celda-id", origen: "fijo", vertical: false },
    {
      id: "numeracion",
      etiqueta: "Numeración",
      anchoMM: ANCHO_NUMERACION_MM,
      clase: "rag-celda-numeracion",
      origen: "fijo",
      vertical: false,
    },
  ];

  if (doc.columnas.ubicacion) {
    columnas.push({
      id: "ubicacion",
      etiqueta: "Ubicación",
      anchoMM: ANCHO_UBICACION_MM,
      clase: "rag-celda-ubicacion",
      origen: "fijo",
      vertical: false,
    });
  }
  if (doc.columnas.referencia) {
    columnas.push({
      id: "referencia",
      etiqueta: "Referencia",
      anchoMM: ANCHO_REFERENCIA_MM,
      clase: "rag-celda-referencia",
      origen: "fijo",
      vertical: false,
    });
  }
  if (doc.tipos.length > 0) {
    columnas.push({
      id: "tipo",
      etiqueta: "Tipo",
      anchoMM: ANCHO_TIPO_MM,
      clase: "rag-celda-tipo",
      origen: "fijo",
      vertical: false,
    });
  }

  for (const punto of doc.puntos) {
    const vertical = esPuntoRespuesta(punto.tipo);
    columnas.push({
      id: punto.id,
      etiqueta: punto.etiqueta,
      anchoMM: vertical ? ANCHO_PUNTO_MM : ANCHO_PUNTO_SIMPLE_MM,
      clase: vertical ? "rag-punto-vertical" : "rag-celda-punto-simple",
      origen: "punto",
      vertical,
    });
  }

  const anchoUsado = columnas.reduce((suma, c) => suma + c.anchoMM, 0);
  const anchoObservaciones = Math.max(ANCHO_OBSERVACIONES_MIN_MM, presupuestoColumnasMM(pagina, 0) - anchoUsado);
  columnas.push({
    id: "observaciones",
    etiqueta: "Observaciones",
    anchoMM: anchoObservaciones,
    clase: "rag-celda-obs",
    origen: "fijo",
    vertical: false,
  });

  return columnas;
}
