// Verificación de pureza y consistencia del documento RAG — corre suelto
// con Node (npx tsx web/scripts/verificar-rag.ts), sin Next ni Supabase.
//
// Dos cosas:
// 1. Que lib/rag/{documento,render,columnas}.ts se puedan importar aquí
//    confirma la condición de D-16: nada en lib/rag/ depende de
//    "server-only", "next/*" ni "react" — es lo que deja abierta una
//    segunda entrada local sin rehacer el renderizador.
// 2. Que columnasDe(doc).length, el <colgroup>, la fila de <th> y cada
//    <td> de cada renglón —incluidos los colspan— den siempre el mismo
//    número. Antes de columnas.ts ese conteo vivía repetido a mano en
//    cinco lugares de render.ts, y el desajuste entre ellos ya causó una
//    vez el defecto que docs/decisiones.md D-15 documenta haber
//    corregido. Con columnas condicionales (D-19) el riesgo de que
//    vuelva a pasar es real si no se comprueba en cada cambio.
import { armarDocumentoRAG, type EntradaDocumentoRAG } from "../lib/rag/documento";
import { columnasDe } from "../lib/rag/columnas";
import { renderizarCuerpoRAG } from "../lib/rag/render";
import type { Formato, PuntoDef, TipoDiccionario } from "../lib/tipos";

let fallas = 0;

function verificar(nombre: string, condicion: boolean, detalle?: string) {
  if (condicion) {
    console.log(`  OK  ${nombre}`);
  } else {
    fallas += 1;
    console.log(`  FALLA  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function formato(overrides: Partial<Formato> = {}): Formato {
  return {
    id: "f1",
    clave: "RAG 2.2",
    nombre: "Formato de prueba",
    periodicidad: "mensual",
    sistema_id: "s1",
    tipo_documento: "rag",
    documento_referencia: "I1.15M2_4037-002",
    revision: "5",
    instrucciones: [],
    notas: null,
    columnas: { ubicacion: true, referencia: true },
    ...overrides,
  };
}

const puntosBase: PuntoDef[] = [
  { id: "p1", etiqueta: "Buen estado", tipo: "si_no", requerido: true },
  { id: "p2", etiqueta: "Presión", tipo: "si_no_na", requerido: true },
  { id: "p3", etiqueta: "Notas de campo", tipo: "texto", requerido: false },
];

const tiposBase: TipoDiccionario[] = [
  { clave: "P", nombre: "Pie" },
  { clave: "G", nombre: "Gabinete" },
];

const elementosBase: EntradaDocumentoRAG["elementos"] = [
  { id: "e1", numeracion: "H-01", ubicacion: "A01-02", referencia: "Ref 1", tipo: "P", zona: "Calle 1", zonaOrden: 1, ordenAnclado: null, orden: 1 },
  { id: "e2", numeracion: "H-02", ubicacion: "A02-02", referencia: null, tipo: "G", zona: "Calle 1", zonaOrden: 1, ordenAnclado: null, orden: 2 },
  { id: "e3", numeracion: "H-03", ubicacion: null, referencia: null, tipo: null, zona: "Calle 2", zonaOrden: 2, ordenAnclado: null, orden: 3 },
  { id: "e4", numeracion: "H-04", ubicacion: null, referencia: null, tipo: null, zona: null, zonaOrden: null, ordenAnclado: null, orden: 4 },
];

function contarEnHTML(html: string, regex: RegExp): number {
  return (html.match(regex) ?? []).length;
}

function verificarCaso(titulo: string, entrada: EntradaDocumentoRAG) {
  console.log(`\n${titulo}`);
  const doc = armarDocumentoRAG(entrada);
  const columnas = columnasDe(doc);
  const html = renderizarCuerpoRAG(doc);

  const colCount = contarEnHTML(html, /<col style=/g);
  const matchEncabezado = html.match(/<tr class="rag-encabezado-principal">([\s\S]*?)<\/tr>/);
  const thCount = matchEncabezado ? (matchEncabezado[1]!.match(/<th/g) ?? []).length : 0;
  const colspans = [...html.matchAll(/colspan="(\d+)"/g)].map((m) => Number(m[1]));
  const colspansDistintos = [...new Set(colspans)];

  verificar(`columnasDe().length (${columnas.length}) === <col> en el colgroup (${colCount})`, columnas.length === colCount);
  verificar(`columnasDe().length (${columnas.length}) === <th> del encabezado (${thCount})`, columnas.length === thCount);
  verificar(
    `todos los colspan usan el mismo número (${columnas.length})`,
    colspansDistintos.length === 1 && colspansDistintos[0] === columnas.length,
    `colspans encontrados: ${colspansDistintos.join(", ")}`,
  );

  // Cada <tr class="rag-renglon"> debe tener exactamente columnas.length <td>.
  const renglones = [...html.matchAll(/<tr class="rag-renglon">([\s\S]*?)<\/tr>/g)];
  const tdCounts = renglones.map((r) => (r[1]!.match(/<td/g) ?? []).length);
  const tdDistintos = [...new Set(tdCounts)];
  verificar(
    `cada renglón tiene ${columnas.length} <td> (${renglones.length} renglones revisados)`,
    tdDistintos.length <= 1 && (tdDistintos.length === 0 || tdDistintos[0] === columnas.length),
    `conteos encontrados: ${tdDistintos.join(", ")}`,
  );

  console.log(`  columnas: ${columnas.map((c) => c.id).join(", ")}`);
}

console.log("Verificación de pureza y consistencia del documento RAG");
console.log("=".repeat(60));

// Caso 1: RAG 2.2 tal como quedó (D-19) — sin Ubicación, con Referencia
// y con Tipo porque el sistema de prueba trae diccionario.
verificarCaso("RAG 2.2 — sin ubicación, con referencia, con tipo", {
  formato: formato({ clave: "RAG 2.2", columnas: { ubicacion: false, referencia: true } }),
  puntos: puntosBase,
  tipos: tiposBase,
  elementos: elementosBase,
});

// Caso 2: formato con las dos columnas y sin diccionario de tipos (Tipo
// no debe aparecer).
verificarCaso("RAG 2.3 — con ubicación y referencia, sin tipo", {
  formato: formato({ clave: "RAG 2.3", columnas: { ubicacion: true, referencia: true } }),
  puntos: puntosBase,
  tipos: [],
  elementos: elementosBase,
});

// Caso 3: en modo "lleno", con respuestas reales.
verificarCaso("RAG 2.8 — con respuestas capturadas", {
  formato: formato({ clave: "RAG 2.8", columnas: { ubicacion: true, referencia: false } }),
  puntos: puntosBase,
  tipos: [{ clave: "M", nombre: "Mariposa" }],
  elementos: elementosBase,
  respuestas: [
    { elementoId: "e1", valores: { p1: true, p2: false }, observaciones: "Pendiente pintura" },
    { elementoId: "e2", valores: { p1: "SI", p2: "NA" }, observaciones: null },
  ],
});

// Caso 4: sin puntos y sin elementos (documento vacío de verdad).
verificarCaso("Documento sin puntos ni elementos", {
  formato: formato({ clave: "RAG 2.7" }),
  puntos: [],
  tipos: [],
  elementos: [],
});

console.log("\n" + "=".repeat(60));
if (fallas > 0) {
  console.error(`${fallas} verificación(es) fallaron.`);
  process.exit(1);
}
console.log("Todo consistente.");
