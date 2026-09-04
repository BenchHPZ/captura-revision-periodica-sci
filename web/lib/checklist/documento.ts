// Arma el DocumentoChecklist a partir de datos ya resueltos — no consulta
// nada, no sabe qué es Supabase, mismo criterio que web/lib/rag/documento.ts
// (ver docs/decisiones.md D-16 y D-22).
import { CLASIFICACION, DOMICILIO, RAZON_SOCIAL } from "../documentos/constantes";
import { INSTRUCCION_GENERAL_CHECKLIST } from "./constantes";
import type {
  BloqueChecklist,
  CategoriaChecklist,
  ColumnaBitacora,
  ColumnaFecha,
  DocumentoChecklist,
  ItemChecklist,
  TipoBloqueChecklist,
  VerificacionChecklist,
} from "./tipos";

const SIN_CATEGORIA = "General";

export interface ItemChecklistCrudo {
  id: string;
  categoria: string | null;
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

function itemDe(crudo: ItemChecklistCrudo, fotoUrlPorRuta: Record<string, string>): ItemChecklist {
  return {
    id: crudo.id,
    categoria: crudo.categoria,
    pos: crudo.pos,
    nombre: crudo.nombre,
    cantidad: crudo.cantidad,
    fotoReferenciaUrl: crudo.fotoReferenciaRuta ? (fotoUrlPorRuta[crudo.fotoReferenciaRuta] ?? null) : null,
    verificaciones: crudo.verificaciones,
  };
}

/** Agrupa los ítems de un bloque de tabla por 'categoria', preservando el
 * orden de aparición de cada categoría (la del primer ítem que la trae) y
 * el orden interno por 'orden' — mismo propósito que agruparPorZona() en
 * web/lib/rag/documento.ts, pero sobre un campo propio del checklist en
 * vez del catálogo de zonas compartido. */
function agruparPorCategoria(items: ItemChecklistCrudo[], fotoUrlPorRuta: Record<string, string>): CategoriaChecklist[] {
  const ordenados = [...items].sort((a, b) => a.orden - b.orden);
  const grupos = new Map<string, ItemChecklist[]>();
  for (const item of ordenados) {
    const nombre = item.categoria?.trim() || SIN_CATEGORIA;
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre)!.push(itemDe(item, fotoUrlPorRuta));
  }
  return [...grupos.entries()].map(([nombre, items]) => ({ nombre, items }));
}

function bloqueDe(crudo: BloqueChecklistCrudo, fotoUrlPorRuta: Record<string, string>): BloqueChecklist {
  switch (crudo.tipo) {
    case "portada_fotos":
      return {
        tipo: "portada_fotos",
        nombre: crudo.nombre,
        items: [...crudo.items].sort((a, b) => a.orden - b.orden).map((i) => itemDe(i, fotoUrlPorRuta)),
      };
    case "tabla_verificacion":
      return { tipo: "tabla_verificacion", nombre: crudo.nombre, categorias: agruparPorCategoria(crudo.items, fotoUrlPorRuta) };
    case "tabla_simple":
      return { tipo: "tabla_simple", nombre: crudo.nombre, categorias: agruparPorCategoria(crudo.items, fotoUrlPorRuta) };
    case "bitacora_libre":
      return {
        tipo: "bitacora_libre",
        nombre: crudo.nombre,
        columnas: crudo.columnas,
        filasBlanco: crudo.filasBlanco ?? 0,
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
