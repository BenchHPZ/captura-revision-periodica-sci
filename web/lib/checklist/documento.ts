// Arma el DocumentoChecklist a partir de datos ya resueltos — no consulta
// nada, no sabe qué es Supabase, mismo criterio que web/lib/rag/documento.ts
// (ver docs/decisiones.md D-16 y D-22).
import { CLASIFICACION, DOMICILIO, RAZON_SOCIAL } from "../documentos/constantes";
import { ALTO_FILA_BITACORA_POR_DEFECTO_MM, INSTRUCCION_GENERAL_CHECKLIST } from "./constantes";
import type {
  BloqueChecklist,
  CampoAgrupacionChecklist,
  ColumnaBitacora,
  ColumnaFecha,
  DocumentoChecklist,
  GrupoChecklist,
  ItemChecklist,
  TipoBloqueChecklist,
  VerificacionChecklist,
} from "./tipos";

const SIN_GRUPO = "General";

export interface ItemChecklistCrudo {
  id: string;
  categoria: string | null;
  ubicacionFisica: string | null;
  pos: string | null;
  nombre: string;
  cantidad: string | null;
  fotoReferenciaRuta: string | null;
  verificaciones: VerificacionChecklist[];
  orden: number;
}

export interface BloqueChecklistCrudo {
  id: string;
  tipo: TipoBloqueChecklist;
  nombre: string;
  orden: number;
  columnas: ColumnaBitacora[];
  filasBlanco: number | null;
  /** Sólo tiene efecto en bitacora_libre. Ver docs/decisiones.md D-25. */
  altoFilaMM: number | null;
  /** Orden de agrupación anidada (0 a 2 campos) — sólo tiene efecto en
   * tabla_verificacion/tabla_simple. Ver docs/decisiones.md D-22. */
  agrupacion: CampoAgrupacionChecklist[];
  /** Ver BloqueChecklistBase.hojaPropia en ./tipos.ts. */
  hojaPropia: boolean;
  items: ItemChecklistCrudo[];
}

export interface FormatoChecklist {
  clave: string;
  nombre: string;
  documento_referencia: string;
  revision: string | null;
  instrucciones: string[];
}

export interface EntradaDocumentoChecklist {
  formato: FormatoChecklist;
  bloques: BloqueChecklistCrudo[];
  /** URLs firmadas de las fotos de referencia, ya resueltas por ruta de
   * Storage — quien llama resuelve firmarRutas() antes de armar el
   * documento (mismo patrón que el resto de la app). */
  fotoUrlPorRuta: Record<string, string>;
  /** Cuántas columnas de fecha generar — normalmente los días del ciclo
   * abierto (para no imprimir columnas de más en un mes corto), nunca
   * fechas reales: las celdas quedan en blanco para llenarse a mano. */
  diasDelMes: number;
  cicloClave?: string | null;
  cicloNombre?: string | null;
  generado?: Date;
}

function itemDe(crudo: ItemChecklistCrudo, fotoUrlPorRuta: Record<string, string>, numero: number): ItemChecklist {
  return {
    id: crudo.id,
    categoria: crudo.categoria,
    ubicacionFisica: crudo.ubicacionFisica,
    numero,
    nombre: crudo.nombre,
    cantidad: crudo.cantidad,
    fotoReferenciaUrl: crudo.fotoReferenciaRuta ? (fotoUrlPorRuta[crudo.fotoReferenciaRuta] ?? null) : null,
    verificaciones: crudo.verificaciones,
  };
}

function valorCampoAgrupacion(item: ItemChecklistCrudo, campo: CampoAgrupacionChecklist): string {
  const valor = campo === "categoria" ? item.categoria : item.ubicacionFisica;
  return valor?.trim() || SIN_GRUPO;
}

/** Agrupa por un solo campo, preservando el orden de aparición del
 * primer ítem que trae cada valor (los ítems ya deben venir ordenados). */
function agruparPorCampo(
  items: ItemChecklistCrudo[],
  campo: CampoAgrupacionChecklist,
): Map<string, ItemChecklistCrudo[]> {
  const grupos = new Map<string, ItemChecklistCrudo[]>();
  for (const item of items) {
    const nombre = valorCampoAgrupacion(item, campo);
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre)!.push(item);
  }
  return grupos;
}

/** Agrupa los ítems de un bloque de tabla según 'agrupacion' (0 a 2
 * campos, en el orden que decide el BLOQUE, no el código — ver
 * docs/decisiones.md D-22 y la migración 0009). Genérica sobre cuántos
 * niveles haya: [] deja los ítems sin banner (un único grupo raíz sin
 * nombre); un campo produce hojas de un nivel; dos campos anida el
 * segundo dentro del primero. Mismo propósito visual que agruparPorZona()
 * en web/lib/rag/documento.ts (D-18), pero sobre campos propios del
 * checklist en vez de un catálogo compartido.
 *
 * De paso numera cada ítem 1..N (campo `numero`, ver tipos.ts) según el
 * orden en que este mismo recorrido los entrega — el mismo orden en que
 * render.ts los va a imprimir — con un contador cerrado que NO se reinicia
 * entre grupos/subgrupos, sólo por bloque (mismo patrón que `let contador`
 * en web/lib/rag/documento.ts). Ver docs/decisiones.md D-24. */
function agruparItems(
  items: ItemChecklistCrudo[],
  agrupacion: CampoAgrupacionChecklist[],
  fotoUrlPorRuta: Record<string, string>,
): GrupoChecklist[] {
  const ordenados = [...items].sort((a, b) => a.orden - b.orden);

  let contador = 0;
  const item = (crudo: ItemChecklistCrudo): ItemChecklist => {
    contador += 1;
    return itemDe(crudo, fotoUrlPorRuta, contador);
  };

  const [campoExterno, campoInterno] = agrupacion;
  if (!campoExterno) {
    return [{ nombre: null, items: ordenados.map(item), subgrupos: [] }];
  }

  const gruposExternos = agruparPorCampo(ordenados, campoExterno);
  return [...gruposExternos.entries()].map(([nombre, itemsGrupo]) => {
    if (!campoInterno) {
      return { nombre, items: itemsGrupo.map(item), subgrupos: [] };
    }
    const gruposInternos = agruparPorCampo(itemsGrupo, campoInterno);
    const subgrupos: GrupoChecklist[] = [...gruposInternos.entries()].map(([nombreInterno, itemsInternos]) => ({
      nombre: nombreInterno,
      items: itemsInternos.map(item),
      subgrupos: [],
    }));
    return { nombre, items: [], subgrupos };
  });
}

function bloqueDe(crudo: BloqueChecklistCrudo, fotoUrlPorRuta: Record<string, string>): BloqueChecklist {
  const base = { nombre: crudo.nombre, hojaPropia: crudo.hojaPropia };
  switch (crudo.tipo) {
    case "portada_fotos":
      // 'numero' no se imprime para este tipo de bloque (no tiene columna
      // "#"); se asigna de todos modos por simplicidad de tipo.
      return {
        ...base,
        tipo: "portada_fotos",
        items: [...crudo.items].sort((a, b) => a.orden - b.orden).map((i, idx) => itemDe(i, fotoUrlPorRuta, idx + 1)),
      };
    case "tabla_verificacion":
      return { ...base, tipo: "tabla_verificacion", grupos: agruparItems(crudo.items, crudo.agrupacion, fotoUrlPorRuta) };
    case "tabla_simple":
      return { ...base, tipo: "tabla_simple", grupos: agruparItems(crudo.items, crudo.agrupacion, fotoUrlPorRuta) };
    case "bitacora_libre":
      return {
        ...base,
        tipo: "bitacora_libre",
        columnas: crudo.columnas,
        filasBlanco: crudo.filasBlanco ?? 0,
        altoFilaMM: crudo.altoFilaMM ?? ALTO_FILA_BITACORA_POR_DEFECTO_MM,
      };
  }
}

export function armarDocumentoChecklist(entrada: EntradaDocumentoChecklist): DocumentoChecklist {
  const { formato, fotoUrlPorRuta, diasDelMes, cicloClave = null, cicloNombre = null } = entrada;

  const bloques = [...entrada.bloques].sort((a, b) => a.orden - b.orden).map((b) => bloqueDe(b, fotoUrlPorRuta));

  const columnasFecha: ColumnaFecha[] = Array.from({ length: diasDelMes }, (_, i) => ({ id: `col-${i + 1}` }));

  return {
    clave: formato.clave,
    nombre: formato.nombre,
    encabezado: {
      clasificacion: CLASIFICACION,
      razon_social: RAZON_SOCIAL,
      domicilio: DOMICILIO,
      documento_referencia: formato.documento_referencia,
      revision: formato.revision,
    },
    instrucciones: [INSTRUCCION_GENERAL_CHECKLIST, ...formato.instrucciones],
    columnasFecha,
    bloques,
    generado: (entrada.generado ?? new Date()).toISOString(),
    cicloClave,
    cicloNombre,
  };
}
