// Verificación de pureza y consistencia del documento checklist — corre
// suelto con Node (npx tsx web/scripts/verificar-checklist.ts), sin Next
// ni Supabase. Mismo propósito que verificar-rag.ts (ver ese archivo):
//
// 1. Que lib/checklist/{documento,render,columnas}.ts se puedan importar
//    aquí confirma que nada ahí depende de "server-only", "next/*" ni
//    "react" — condición de D-16, extendida al tipo "checklist" por D-22.
// 2. Que cada <table> que arma render.ts tenga su colgroup, el <th> del
//    encabezado principal y todos sus colspan de acuerdo entre sí — mismo
//    riesgo que D-15/D-19 documentan para RAG. Se agrava aquí porque un
//    solo bloque se reparte en VARIAS tablas: una por cada combinación de
//    rebanada de fecha (columnas.ts, por ancho de página) × hoja de
//    agrupación (render.ts hojasDeGrupos(), por banner de sección — ver
//    docs/decisiones.md D-24) — las tres cosas deben coincidir en CADA
//    una, no sólo en la primera. La portada de fotos tiene su propia
//    estructura (sin columnas fijas de ítem, nunca se reparte) y se
//    verifica aparte.
// 3. Que las columnas de fecha repartidas entre todas las tablas de un
//    mismo bloque sumen exactamente los días pedidos — es la garantía de
//    que rebanarColumnasFecha() no pierde ni duplica columnas al cortar.
//    Con varias hojas por rebanada, varias tablas seguidas comparten el
//    mismo conteo de columnas de fecha (una por hoja) — se cuenta cada
//    valor consecutivo repetido una sola vez antes de sumar.
// 4. Que el "#" autocalculado (numero) reemplace de verdad al viejo "pos"
//    tecleado a mano — ver docs/decisiones.md D-24.
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

// 'pos' en "999" a propósito en todos los ítems: un valor que nunca sería
// un "#" legítimo (1..N), para poder comprobar que ya no se imprime en
// ningún lado — el campo se conserva en el tipo crudo por compatibilidad
// con JSON viejos (ver docs/decisiones.md D-24), pero nada debe leerlo.
const POS_VIEJO_NUNCA_IMPRESO = "999";

const bloquesBase: EntradaDocumentoChecklist["bloques"] = [
  {
    id: "b1",
    tipo: "portada_fotos",
    nombre: "Identificación",
    orden: 1,
    columnas: [],
    filasBlanco: null,
    agrupacion: [],
    items: [
      {
        id: "p1",
        categoria: null,
        ubicacionFisica: null,
        pos: null,
        nombre: "Frontal",
        cantidad: null,
        fotoReferenciaRuta: null,
        verificaciones: [],
        orden: 1,
      },
    ],
  },
  {
    id: "b2",
    tipo: "tabla_verificacion",
    nombre: "Equipo",
    orden: 2,
    columnas: [],
    filasBlanco: null,
    // 2 niveles: ubicación física por fuera, categoría por dentro — el
    // orden por defecto que el usuario confirmó preferir (ver Etapa 2b).
    agrupacion: ["ubicacion_fisica", "categoria"],
    items: [
      {
        id: "i1",
        categoria: "CAT A",
        ubicacionFisica: "Cabina",
        pos: POS_VIEJO_NUNCA_IMPRESO,
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
        ubicacionFisica: "Cabina",
        pos: POS_VIEJO_NUNCA_IMPRESO,
        nombre: "Item 2",
        cantidad: "2",
        fotoReferenciaRuta: null,
        verificaciones: [{ id: "be", etiqueta: "Buen estado" }],
        orden: 2,
      },
      {
        id: "i3",
        categoria: "CAT B",
        ubicacionFisica: "Compartimento trasero",
        pos: POS_VIEJO_NUNCA_IMPRESO,
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
    // 0 niveles: sin agrupación, plano — mismo resultado visual que el
    // sub-checklist mecánico ya tenía antes de la Etapa 2b.
    agrupacion: [],
    items: [
      {
        id: "m1",
        categoria: null,
        ubicacionFisica: null,
        pos: POS_VIEJO_NUNCA_IMPRESO,
        nombre: "Nivel de aceite",
        cantidad: null,
        fotoReferenciaRuta: null,
        verificaciones: [],
        orden: 1,
      },
      {
        id: "m2",
        categoria: null,
        ubicacionFisica: null,
        pos: POS_VIEJO_NUNCA_IMPRESO,
        nombre: "Sirena",
        cantidad: null,
        fotoReferenciaRuta: null,
        verificaciones: [],
        orden: 2,
      },
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
    agrupacion: [],
    items: [],
  },
];

/** Cuenta cada valor consecutivo repetido una sola vez antes de sumar —
 * varias hojas de la MISMA rebanada de fecha muestran el mismo conteo de
 * columnas, y sumarlas tal cual inflaría el total (ver nota de módulo,
 * punto 3). */
function sumarSinRepetirConsecutivos(valores: number[]): number {
  let suma = 0;
  for (let i = 0; i < valores.length; i++) {
    if (i === 0 || valores[i] !== valores[i - 1]) suma += valores[i]!;
  }
  return suma;
}

function verificarCaso(titulo: string, diasDelMes: number) {
  console.log(`\n${titulo} (${diasDelMes} días)`);
  const doc = armarDocumentoChecklist({ formato: formatoBase, bloques: bloquesBase, fotoUrlPorRuta: {}, diasDelMes });
  const html = renderizarCuerpoChecklist(doc);

  const tablas = [...html.matchAll(/<table class="doc-tabla chk-tabla[^"]*">([\s\S]*?)<\/table>/g)];
  verificar(`hay al menos una tabla por bloque de tipo tabla (${tablas.length} tablas encontradas)`, tablas.length >= 4);

  const porBloque = new Map<string, number[]>();
  const cuerpoPorBloque = new Map<string, string>();
  let tablasPortada = 0;

  for (const [, cuerpoCrudo] of tablas) {
    const cuerpo = cuerpoCrudo!;
    const metaMatch = cuerpo.match(/<div class="doc-meta">([^·]+)·/);
    const nombreBloque = metaMatch ? metaMatch[1]!.trim() : "?";

    if (nombreBloque === "Identificación") {
      tablasPortada += 1;
      verificarPortada(cuerpo, diasDelMes);
      continue;
    }

    // '<col[ >]' y no '<col' a secas: éste último también matcheaba
    // '<colgroup>', sumando uno de más a cada tabla.
    const colCount = (cuerpo.match(/<col[ >]/g) ?? []).length;
    const thPrincipal = cuerpo.match(/<tr class="chk-encabezado-principal">([\s\S]*?)<\/tr>/);
    const thCount = thPrincipal ? (thPrincipal[1]!.match(/<th/g) ?? []).length : 0;
    const columnasFechaEnTabla = (cuerpo.match(/<th class="chk-celda-marca">/g) ?? []).length;

    verificar(`'${nombreBloque}': colgroup (${colCount}) === <th> del encabezado principal (${thCount})`, colCount === thCount);

    // Dos colspan válidos conviven aquí (a diferencia de RAG, que sólo
    // tiene uno): las franjas de ancho completo (doc-franja-superior,
    // doc-titulo-fila, chk-general-fila, chk-categoria, chk-subgrupo,
    // doc-franja-pie) usan colCount; las filas Fecha/Grupo/Nombre/Firma
    // sólo saltan las columnas fijas, porque cada columna de fecha lleva
    // su propia celda en blanco.
    const colspans = [...cuerpo.matchAll(/colspan="(\d+)"/g)].map((m) => Number(m[1]));
    const colspansDistintos = [...new Set(colspans)];
    const colspansEsperados = new Set([colCount, colCount - columnasFechaEnTabla].filter((n) => n > 0));
    verificar(
      `'${nombreBloque}': todos los colspan son ancho completo (${colCount}) o sólo columnas fijas (${colCount - columnasFechaEnTabla})`,
      colspansDistintos.every((c) => colspansEsperados.has(c)),
      `colspans encontrados: ${colspansDistintos.join(", ")}`,
    );

    // Una hoja nunca trae más de un banner externo ni más de uno interno.
    const bannersExternos = (cuerpo.match(/<tr class="chk-categoria">/g) ?? []).length;
    const bannersInternos = (cuerpo.match(/<tr class="chk-subgrupo">/g) ?? []).length;
    verificar(`'${nombreBloque}': a lo más un banner externo por tabla`, bannersExternos <= 1);
    verificar(`'${nombreBloque}': a lo más un banner interno por tabla`, bannersInternos <= 1);

    if (!porBloque.has(nombreBloque)) porBloque.set(nombreBloque, []);
    porBloque.get(nombreBloque)!.push(columnasFechaEnTabla);
    if (!cuerpoPorBloque.has(nombreBloque)) cuerpoPorBloque.set(nombreBloque, cuerpo);
  }

  verificar(`'Identificación': produce exactamente 1 tabla (nunca se reparte)`, tablasPortada === 1);

  for (const nombre of ["Equipo", "Mecánico"]) {
    const suma = sumarSinRepetirConsecutivos(porBloque.get(nombre) ?? []);
    verificar(`'${nombre}': columnas de fecha repartidas suman ${diasDelMes}`, suma === diasDelMes, `encontrado: ${suma}`);
  }
  verificar(`'Bitácora': sin columnas de fecha`, sumarSinRepetirConsecutivos(porBloque.get("Bitácora") ?? []) === 0);

  // La fila del ítem sin verificaciones (i3) debe seguir imprimiéndose
  // (con la celda de Verificación vacía), no desaparecer.
  verificar(`el ítem sin verificaciones sigue presente`, html.includes(">Item 3<"));

  // El "#" autocalculado reemplaza al "pos" tecleado — ver
  // docs/decisiones.md D-24. Los ítems de prueba traen a propósito un
  // 'pos' que nunca sería un "#" legítimo; si apareciera impreso sería
  // la prueba de que algo todavía lo está leyendo.
  verificar(`el "#" autocalculado reemplaza a "pos" — el valor viejo nunca se imprime`, !html.includes(`>${POS_VIEJO_NUNCA_IMPRESO}<`));

  // 'Equipo' tiene agrupacion=["ubicacion_fisica","categoria"]: el banner
  // externo (.chk-categoria) debe traer los valores de ubicación física,
  // y el interno (.chk-subgrupo) los de categoría — no al revés.
  const bannersExternos = [...html.matchAll(/<tr class="chk-categoria"><th[^>]*>([^<]+)<\/th><\/tr>/g)].map((m) => m[1]);
  const bannersInternos = [...html.matchAll(/<tr class="chk-subgrupo"><th[^>]*>([^<]+)<\/th><\/tr>/g)].map((m) => m[1]);
  verificar(
    `'Equipo': el banner externo trae ubicación física ("Cabina", "Compartimento trasero")`,
    bannersExternos.includes("Cabina") && bannersExternos.includes("Compartimento trasero"),
    `banners externos encontrados: ${bannersExternos.join(", ")}`,
  );
  verificar(
    `'Equipo': el banner interno trae categoría ("CAT A", "CAT B")`,
    bannersInternos.includes("CAT A") && bannersInternos.includes("CAT B"),
    `banners internos encontrados: ${bannersInternos.join(", ")}`,
  );

  // 'Mecánico' tiene agrupacion=[]: no debe imprimir ningún banner de
  // sección — mismo resultado visual que antes de la Etapa 2b.
  const cuerpoMecanico = cuerpoPorBloque.get("Mecánico") ?? "";
  verificar(
    `'Mecánico': agrupacion=[] no imprime banners de sección`,
    !cuerpoMecanico.includes('class="chk-categoria"') && !cuerpoMecanico.includes('class="chk-subgrupo"'),
  );
  verificar(`'Mecánico': los ítems siguen presentes sin agrupar`, cuerpoMecanico.includes("Nivel de aceite") && cuerpoMecanico.includes("Sirena"));
}

/** La portada tiene su propia estructura (ver renderizarPortada() en
 * render.ts): sin columnas fijas de ítem, así que sin fila
 * "chk-encabezado-principal" — sólo una columna de etiqueta angosta más
 * las columnas de fecha. Nunca se reparte en varias tablas (ver
 * docs/decisiones.md D-24: el presupuesto de ancho está pensado para que
 * quepan las 31 posibles en una sola hoja). */
function verificarPortada(cuerpo: string, diasDelMes: number) {
  const colCount = (cuerpo.match(/<col[ >]/g) ?? []).length;
  verificar(`'Identificación': colgroup (${colCount}) === 1 columna de etiqueta + columnas de fecha (${1 + diasDelMes})`, colCount === 1 + diasDelMes);

  const celdasFecha = (cuerpo.match(/<td class="chk-celda-marca">/g) ?? []).length;
  verificar(`'Identificación': Fecha + Grupo traen ${diasDelMes} columnas cada una (${diasDelMes * 2} celdas)`, celdasFecha === diasDelMes * 2);

  const celdasCierre = (cuerpo.match(/<td class="chk-celda-cierre">/g) ?? []).length;
  verificar(`'Identificación': Nombre + Firma traen ${diasDelMes} columnas cada una (${diasDelMes * 2} celdas)`, celdasCierre === diasDelMes * 2);

  verificar(`'Identificación': conserva el ítem de portada (foto)`, cuerpo.includes("Frontal"));
  verificar(`'Identificación': trae AÑO/MES como el resto de las secciones`, cuerpo.includes(">AÑO<") && cuerpo.includes(">MES<"));
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
