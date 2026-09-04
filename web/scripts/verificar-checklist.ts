// Verificación de pureza y consistencia del documento checklist — corre
// suelto con Node (npx tsx web/scripts/verificar-checklist.ts), sin Next
// ni Supabase. Mismo propósito que verificar-rag.ts (ver ese archivo):
//
// 1. Que lib/checklist/{documento,render,columnas}.ts se puedan importar
//    aquí confirma que nada ahí depende de "server-only", "next/*" ni
//    "react" — condición de D-16, extendida al tipo "checklist" por D-22.
// 2. Que cada <table> que arma render.ts tenga su colgroup, el <th> del
//    encabezado principal y todos sus colspan de acuerdo entre sí — mismo
//    riesgo que D-15/D-19 documentan para RAG, aquí agravado porque un
//    solo bloque se reparte en VARIAS tablas (una por grupo de columnas
//    de fecha que cabe en una hoja, ver columnas.ts) y las tres cosas
//    deben coincidir en CADA una, no sólo en la primera.
// 3. Que las columnas de fecha repartidas entre todas las tablas de un
//    mismo bloque sumen exactamente los días pedidos — es la garantía de
//    que rebanarColumnasFecha() no pierde ni duplica columnas al cortar.
import { armarDocumentoChecklist, type EntradaDocumentoChecklist } from "../lib/checklist/documento";
import { renderizarCuerpoChecklist } from "../lib/checklist/render";

let fallas = 0;

function verificar(nombre: string, condicion: boolean, detalle?: string) {
  if (condicion) {
    console.log(`  OK  ${nombre}`);
  } else {
    fallas += 1;
    console.log(`  FALLA  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const formatoBase: EntradaDocumentoChecklist["formato"] = {
  clave: "RAG 4.1",
  nombre: "Checklist de prueba",
  documento_referencia: "I1.15M2_4037-004",
  revision: null,
  instrucciones: ["Instrucción propia de prueba."],
};

const bloquesBase: EntradaDocumentoChecklist["bloques"] = [
  {
    id: "b1",
    tipo: "portada_fotos",
    nombre: "Identificación",
    orden: 1,
    columnas: [],
    filasBlanco: null,
    items: [
      { id: "p1", categoria: null, pos: null, nombre: "Frontal", cantidad: null, fotoReferenciaRuta: null, verificaciones: [], orden: 1 },
    ],
  },
  {
    id: "b2",
    tipo: "tabla_verificacion",
    nombre: "Equipo",
    orden: 2,
    columnas: [],
    filasBlanco: null,
    items: [
      {
        id: "i1",
        categoria: "CAT A",
        pos: "1",
        nombre: "Item 1",
        cantidad: "1",
        fotoReferenciaRuta: null,
        verificaciones: [
          { id: "be", etiqueta: "Buen estado" },
          { id: "ca", etiqueta: "Cantidad" },
        ],
        orden: 1,
      },
      {
        id: "i2",
        categoria: "CAT A",
        pos: "2",
        nombre: "Item 2",
        cantidad: "2",
        fotoReferenciaRuta: null,
        verificaciones: [{ id: "be", etiqueta: "Buen estado" }],
        orden: 2,
      },
      {
        id: "i3",
        categoria: "CAT B",
        pos: "3",
        nombre: "Item 3",
        cantidad: null,
        fotoReferenciaRuta: null,
        verificaciones: [],
        orden: 3,
      },
    ],
  },
  {
    id: "b3",
    tipo: "tabla_simple",
    nombre: "Mecánico",
    orden: 3,
    columnas: [],
    filasBlanco: null,
    items: [
      { id: "m1", categoria: null, pos: "1", nombre: "Nivel de aceite", cantidad: null, fotoReferenciaRuta: null, verificaciones: [], orden: 1 },
      { id: "m2", categoria: null, pos: "2", nombre: "Sirena", cantidad: null, fotoReferenciaRuta: null, verificaciones: [], orden: 2 },
    ],
  },
  {
    id: "b4",
    tipo: "bitacora_libre",
    nombre: "Bitácora",
    orden: 4,
    columnas: [
      { id: "insumo", etiqueta: "Insumo" },
      { id: "cantidad", etiqueta: "Cantidad" },
    ],
    filasBlanco: 5,
    items: [],
  },
];

function verificarCaso(titulo: string, diasDelMes: number) {
  console.log(`\n${titulo} (${diasDelMes} días)`);
  const doc = armarDocumentoChecklist({ formato: formatoBase, bloques: bloquesBase, fotoUrlPorRuta: {}, diasDelMes });
  const html = renderizarCuerpoChecklist(doc);

  const tablas = [...html.matchAll(/<table class="doc-tabla chk-tabla[^"]*">([\s\S]*?)<\/table>/g)];
  verificar(`hay al menos una tabla por bloque de tipo tabla (${tablas.length} tablas encontradas)`, tablas.length >= 3);

  const porBloque = new Map<string, number>();

  for (const [, cuerpoCrudo] of tablas) {
    const cuerpo = cuerpoCrudo!;
    // '<col[ >]' y no '<col' a secas: éste último también matcheaba
    // '<colgroup>', sumando uno de más a cada tabla.
    const colCount = (cuerpo.match(/<col[ >]/g) ?? []).length;
    const thPrincipal = cuerpo.match(/<tr class="chk-encabezado-principal">([\s\S]*?)<\/tr>/);
    const thCount = thPrincipal ? (thPrincipal[1]!.match(/<th/g) ?? []).length : 0;
    const metaMatch = cuerpo.match(/<div class="doc-meta">([^·]+)·/);
    const nombreBloque = metaMatch ? metaMatch[1]!.trim() : "?";
    const columnasFechaEnTabla = (cuerpo.match(/<th class="chk-celda-marca">/g) ?? []).length;

    verificar(`'${nombreBloque}': colgroup (${colCount}) === <th> del encabezado principal (${thCount})`, colCount === thCount);

    // Dos colspan válidos conviven aquí (a diferencia de RAG, que sólo
    // tiene uno): las franjas de ancho completo (doc-franja-superior,
    // doc-titulo-fila, chk-general-fila, chk-categoria, doc-franja-pie)
    // usan colCount; las filas Fecha/Grupo/Nombre/Firma sólo saltan las
    // columnas fijas (columnasFecha.length menos las de fecha de esta
    // tabla), porque cada columna de fecha lleva su propia celda en blanco.
    const colspans = [...cuerpo.matchAll(/colspan="(\d+)"/g)].map((m) => Number(m[1]));
    const colspansDistintos = [...new Set(colspans)];
    const colspansEsperados = new Set([colCount, colCount - columnasFechaEnTabla].filter((n) => n > 0));
    verificar(
      `'${nombreBloque}': todos los colspan son ancho completo (${colCount}) o sólo columnas fijas (${colCount - columnasFechaEnTabla})`,
      colspansDistintos.every((c) => colspansEsperados.has(c)),
      `colspans encontrados: ${colspansDistintos.join(", ")}`,
    );

    porBloque.set(nombreBloque, (porBloque.get(nombreBloque) ?? 0) + columnasFechaEnTabla);
  }

  for (const nombre of ["Equipo", "Mecánico"]) {
    verificar(`'${nombre}': columnas de fecha repartidas suman ${diasDelMes}`, porBloque.get(nombre) === diasDelMes);
  }
  verificar(`'Bitácora': sin columnas de fecha`, (porBloque.get("Bitácora") ?? 0) === 0);

  // La fila del ítem sin verificaciones (i3) debe seguir imprimiéndose
  // (con la celda de Verificación vacía), no desaparecer.
  verificar(`el ítem sin verificaciones sigue presente`, html.includes(">Item 3<"));
}

console.log("Verificación de pureza y consistencia del documento checklist");
console.log("=".repeat(60));

verificarCaso("31 días — mes largo", 31);
verificarCaso("28 días — mes corto", 28);
verificarCaso("0 días — sin columnas de fecha", 0);

console.log("\n" + "=".repeat(60));
if (fallas > 0) {
  console.error(`${fallas} verificación(es) fallaron.`);
  process.exit(1);
}
console.log("Todo consistente.");
