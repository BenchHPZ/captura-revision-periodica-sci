// Verificación de pureza y consistencia del documento checklist — corre
// suelto con Node (npx tsx web/scripts/verificar-checklist.ts), sin Next
// ni Supabase. Mismo propósito que verificar-rag.ts (ver ese archivo):
//
// 1. Que lib/checklist/{documento,render,columnas,paginas}.ts se puedan
//    importar aquí confirma que nada ahí depende de "server-only",
//    "next/*" ni "react" — condición de D-16, extendida al tipo
//    "checklist" por D-22.
// 2. Que la estructura de dos niveles cuadre: una <table class="chk-hoja">
//    por grupo de hoja × rebanada de fecha, y dentro una
//    <table class="chk-seccion"> por sección, cada una con su propio
//    colgroup (ver docs/decisiones.md D-25).
// 3. LA INVARIANTE CRÍTICA: en CADA tabla, cada fila debe cubrir
//    exactamente tantas columnas como declara su colgroup — contando las
//    celdas heredadas por rowspan, que render.ts omite en las filas 2..n
//    de un ítem con varias verificaciones. Es lo que atrapa un colspan
//    olvidado en cualquiera de las cuatro filas de etiqueta
//    (Fecha/Grupo/Nombre/Firma).
// 4. Que las columnas de fecha repartidas entre las hojas de un grupo
//    sumen exactamente los días pedidos — garantía de que
//    rebanarColumnasFecha() no pierde ni duplica columnas al cortar.
// 5. Que el "#" autocalculado (numero) reemplace de verdad al viejo "pos"
//    tecleado a mano — ver docs/decisiones.md D-24.
// 6. Que el presupuesto de anchos derivado de la hoja (D-25) reproduzca
//    exactamente los números que antes estaban tecleados a mano, y que la
//    suma de los <col> no se salga del papel.
import { armarDocumentoChecklist, type EntradaDocumentoChecklist } from "../lib/checklist/documento";
import { presupuestoChecklistMM } from "../lib/checklist/columnas";
import { agruparBloquesEnHojas, repartoDeGrupo } from "../lib/checklist/paginas";
import { renderizarCuerpoChecklist } from "../lib/checklist/render";
import { presupuestoColumnasMM, type ConfiguracionPagina } from "../lib/documentos/pagina";

let fallas = 0;

function verificar(nombre: string, condicion: boolean, detalle?: string) {
  if (condicion) {
    console.log(`  OK  ${nombre}`);
  } else {
    fallas += 1;
    console.log(`  FALLA  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const CARTA_APAISADA: ConfiguracionPagina = { tamano: "carta", orientacion: "apaisada", margenMM: 8 };
const A4_APAISADA: ConfiguracionPagina = { tamano: "a4", orientacion: "apaisada", margenMM: 8 };

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

const ALTO_FILA_BITACORA_PRUEBA = 12;

function bloques(hojaPropia: { equipo: boolean; mecanico: boolean; bitacora: boolean }): EntradaDocumentoChecklist["bloques"] {
  return [
    {
      id: "b1",
      tipo: "portada_fotos",
      nombre: "Identificación",
      orden: 1,
      columnas: [],
      filasBlanco: null,
      altoFilaMM: null,
      agrupacion: [],
      hojaPropia: true,
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
      altoFilaMM: null,
      // 2 niveles: ubicación física por fuera, categoría por dentro — el
      // orden por defecto que el usuario confirmó preferir (ver Etapa 2b).
      agrupacion: ["ubicacion_fisica", "categoria"],
      hojaPropia: hojaPropia.equipo,
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
          // Misma ubicación física que i1, otra categoría: sirve para
          // comprobar que el banner externo NO se reescribe cuando sólo
          // cambia el interno (ver docs/decisiones.md D-25).
          categoria: "CAT B",
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
          categoria: "CAT C",
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
      altoFilaMM: null,
      // 0 niveles: sin agrupación, plano — mismo resultado visual que el
      // sub-checklist mecánico ya tenía antes de la Etapa 2b.
      agrupacion: [],
      hojaPropia: hojaPropia.mecanico,
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
      altoFilaMM: ALTO_FILA_BITACORA_PRUEBA,
      agrupacion: [],
      hojaPropia: hojaPropia.bitacora,
      items: [],
    },
  ];
}

const TODOS_EN_HOJA_PROPIA = { equipo: true, mecanico: true, bitacora: true };

// =====================================================================
// Análisis del HTML — con tablas anidadas ya no alcanza un regex simple:
// hay que contar la profundidad para no cerrar una tabla externa con el
// </table> de una interna.
// =====================================================================

interface Tabla {
  apertura: string;
  interior: string;
}

/** Las tablas del nivel más externo del HTML dado (llamar de nuevo sobre
 * el interior de una para obtener las suyas). */
function tablasDeNivel(html: string): Tabla[] {
  const encontradas: Tabla[] = [];
  const tokens = /<table\b[^>]*>|<\/table>/g;
  let profundidad = 0;
  let inicio = 0;
  let apertura = "";
  let m: RegExpExecArray | null;
  while ((m = tokens.exec(html)) !== null) {
    if (m[0].startsWith("</")) {
      profundidad -= 1;
      if (profundidad === 0) encontradas.push({ apertura, interior: html.slice(inicio, m.index) });
    } else {
      if (profundidad === 0) {
        apertura = m[0];
        inicio = m.index + m[0].length;
      }
      profundidad += 1;
    }
  }
  return encontradas;
}

/** El interior de una tabla sin sus tablas anidadas — para contar SUS
 * propias filas sin arrastrar las de adentro. */
function sinTablasAnidadas(interior: string): string {
  let resultado = "";
  const tokens = /<table\b[^>]*>|<\/table>/g;
  let profundidad = 0;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = tokens.exec(interior)) !== null) {
    if (m[0].startsWith("</")) {
      profundidad -= 1;
      if (profundidad === 0) cursor = m.index + m[0].length;
    } else {
      if (profundidad === 0) resultado += interior.slice(cursor, m.index);
      profundidad += 1;
    }
  }
  return resultado + interior.slice(cursor);
}

function numeroDeAtributo(atributos: string, nombre: string): number {
  const m = atributos.match(new RegExp(`${nombre}="(\\d+)"`));
  return m ? Number(m[1]) : 1;
}

/** Cuántas columnas cubre cada fila propia de esta tabla, contando las
 * celdas heredadas por rowspan de filas anteriores. */
function anchosDeFilas(interiorPropio: string): number[] {
  const anchos: number[] = [];
  const pendientes: { columnas: number; filasRestantes: number }[] = [];
  for (const fila of interiorPropio.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    // Lo heredado de filas ANTERIORES cuenta para ésta, y se descuenta
    // aquí mismo. Lo que esta fila declare con rowspan cuenta para las
    // siguientes, no para ella (su celda ya se contó una vez).
    let ancho = pendientes.reduce((suma, p) => suma + p.columnas, 0);
    for (let i = pendientes.length - 1; i >= 0; i--) {
      pendientes[i]!.filasRestantes -= 1;
      if (pendientes[i]!.filasRestantes <= 0) pendientes.splice(i, 1);
    }
    for (const celda of fila[1]!.matchAll(/<(?:td|th)\b([^>]*)>/g)) {
      const atributos = celda[1]!;
      const colspan = numeroDeAtributo(atributos, "colspan");
      const rowspan = numeroDeAtributo(atributos, "rowspan");
      ancho += colspan;
      if (rowspan > 1) pendientes.push({ columnas: colspan, filasRestantes: rowspan - 1 });
    }
    anchos.push(ancho);
  }
  return anchos;
}

function anchosDeColumnas(interiorPropio: string): number[] {
  return [...interiorPropio.matchAll(/<col style="width:([\d.]+)mm">/g)].map((m) => Number(m[1]));
}

function atributo(apertura: string, nombre: string): string {
  const m = apertura.match(new RegExp(`${nombre}="([^"]*)"`));
  return m ? m[1]! : "";
}

/** La invariante crítica, aplicada a una tabla y a todas sus anidadas. */
function verificarTabla(etiqueta: string, tabla: Tabla, pagina: ConfiguracionPagina) {
  const propio = sinTablasAnidadas(tabla.interior);
  const columnas = anchosDeColumnas(propio);
  verificar(`${etiqueta}: declara su colgroup (${columnas.length} columnas)`, columnas.length > 0);

  const anchos = anchosDeFilas(propio);
  const malas = anchos.filter((a) => a !== columnas.length);
  verificar(
    `${etiqueta}: las ${anchos.length} filas cubren exactamente ${columnas.length} columnas`,
    malas.length === 0,
    malas.length > 0 ? `anchos distintos encontrados: ${[...new Set(malas)].join(", ")}` : undefined,
  );

  const sumaMM = columnas.reduce((s, a) => s + a, 0);
  const presupuesto = presupuestoChecklistMM(pagina);
  verificar(
    `${etiqueta}: los <col> suman ${sumaMM.toFixed(1)}mm, dentro del presupuesto de ${presupuesto}mm`,
    sumaMM <= presupuesto + 1,
  );

  for (const [i, anidada] of tablasDeNivel(tabla.interior).entries()) {
    verificarTabla(`${etiqueta} › sección ${i + 1}`, anidada, pagina);
  }
}

function verificarCaso(titulo: string, diasDelMes: number, pagina: ConfiguracionPagina, hojaPropia = TODOS_EN_HOJA_PROPIA) {
  console.log(`\n${titulo}`);
  const listaBloques = bloques(hojaPropia);
  const doc = armarDocumentoChecklist({ formato: formatoBase, bloques: listaBloques, fotoUrlPorRuta: {}, diasDelMes });
  const html = renderizarCuerpoChecklist(doc, pagina);

  const hojas = tablasDeNivel(html);

  // Cuántas tablas de hoja debe haber, calculado con las mismas funciones
  // que usa el renderizador — si alguna de las dos cambia sin la otra,
  // esto lo delata.
  const grupos = agruparBloquesEnHojas(doc.bloques);
  const esperadas = grupos.reduce((suma, g) => suma + repartoDeGrupo(g, doc.columnasFecha, pagina).rebanadas.length, 0);
  verificar(`produce ${esperadas} tabla(s) de hoja`, hojas.length === esperadas, `encontradas: ${hojas.length}`);

  for (const [i, hoja] of hojas.entries()) {
    verificarTabla(`hoja ${i + 1} (grupo ${atributo(hoja.apertura, "data-grupo")})`, hoja, pagina);
  }

  // Las columnas de fecha repartidas entre las rebanadas de un grupo deben
  // sumar exactamente los días pedidos.
  for (const grupo of grupos) {
    const nombres = grupo.bloques.map((b) => b.nombre).join("|");
    const suyas = hojas.filter((h) => atributo(h.apertura, "data-grupo") === String(grupo.indice));
    const suma = suyas.reduce((s, h) => s + (sinTablasAnidadas(h.interior).match(/<td class="chk-celda-marca"><\/td>/g) ?? []).length / 2, 0);
    verificar(`grupo '${nombres}': las filas Fecha+Grupo suman ${diasDelMes} columnas`, suma === diasDelMes, `encontrado: ${suma}`);
  }

  // La fila del ítem sin verificaciones (i3) debe seguir imprimiéndose
  // (con la celda de Verificación vacía), no desaparecer.
  verificar(`el ítem sin verificaciones sigue presente`, html.includes(">Item 3<"));

  // El "#" autocalculado reemplaza al "pos" tecleado — ver
  // docs/decisiones.md D-24.
  verificar(`el "#" autocalculado reemplaza a "pos" — el valor viejo nunca se imprime`, !html.includes(`>${POS_VIEJO_NUNCA_IMPRESO}<`));

  // 'Equipo' tiene agrupacion=["ubicacion_fisica","categoria"]: el banner
  // externo (.chk-categoria) trae ubicación física, el interno
  // (.chk-subgrupo) categoría — no al revés.
  const bannersExternos = [...html.matchAll(/<tr class="chk-categoria"><th[^>]*>([^<]+)<\/th><\/tr>/g)].map((m) => m[1]);
  const bannersInternos = [...html.matchAll(/<tr class="chk-subgrupo"><th[^>]*>([^<]+)<\/th><\/tr>/g)].map((m) => m[1]);
  verificar(
    `'Equipo': el banner externo trae ubicación física ("Cabina", "Compartimento trasero")`,
    bannersExternos.includes("Cabina") && bannersExternos.includes("Compartimento trasero"),
    `banners externos encontrados: ${bannersExternos.join(", ")}`,
  );
  verificar(
    `'Equipo': el banner interno trae categoría ("CAT A", "CAT B", "CAT C")`,
    ["CAT A", "CAT B", "CAT C"].every((c) => bannersInternos.includes(c)),
    `banners internos encontrados: ${bannersInternos.join(", ")}`,
  );

  // "Cabina" cubre CAT A y CAT B: debe imprimirse UNA vez por rebanada,
  // no una por categoría de adentro — el pedido explícito de no reescribir
  // el nivel superior cuando sólo cambia el inferior (D-25).
  const rebanadasDelGrupoEquipo = grupos
    .filter((g) => g.bloques.some((b) => b.nombre === "Equipo"))
    .reduce((suma, g) => suma + repartoDeGrupo(g, doc.columnasFecha, pagina).rebanadas.length, 0);
  const vecesCabina = bannersExternos.filter((b) => b === "Cabina").length;
  verificar(
    `'Equipo': "Cabina" se imprime una vez por rebanada (${rebanadasDelGrupoEquipo}), no una por categoría`,
    vecesCabina === rebanadasDelGrupoEquipo,
    `encontrado: ${vecesCabina}`,
  );

  // 'Mecánico' tiene agrupacion=[]: no imprime banners de sección.
  verificar(`'Mecánico': los ítems siguen presentes sin agrupar`, html.includes("Nivel de aceite") && html.includes("Sirena"));

  // Bitácora: alto de renglón configurable (antes no existía y las filas
  // quedaban de ~2.5mm) — ver docs/decisiones.md D-25.
  const filasConAlto = (html.match(new RegExp(`<td style="height:${ALTO_FILA_BITACORA_PRUEBA}mm"></td>`, "g")) ?? []).length;
  verificar(`'Bitácora': 5 filas × 2 columnas con alto de ${ALTO_FILA_BITACORA_PRUEBA}mm`, filasConAlto === 10, `encontrado: ${filasConAlto}`);

  // Las instrucciones se imprimen una sola vez en todo el documento, no
  // una por hoja (ver docs/decisiones.md D-25).
  const vecesInstrucciones = (html.match(/class="doc-instrucciones chk-instrucciones"/g) ?? []).length;
  verificar(`las instrucciones se imprimen una sola vez`, vecesInstrucciones === 1, `encontrado: ${vecesInstrucciones}`);

  // AÑO/MES una vez por hoja, junto con el resto del encabezado.
  const vecesAno = (html.match(/>AÑO</g) ?? []).length;
  verificar(`AÑO/MES aparece una vez por hoja (${hojas.length})`, vecesAno === hojas.length, `encontrado: ${vecesAno}`);
}

console.log("Verificación de pureza y consistencia del documento checklist");
console.log("=".repeat(60));

// El presupuesto derivado de la hoja debe reproducir EXACTAMENTE los
// números que antes estaban tecleados a mano, para que el cambio de
// infraestructura de D-25 sea demostrablemente neutro.
console.log("\nPresupuesto de anchos derivado de la hoja (D-25)");
verificar(
  "Carta apaisada con 8mm de holgura da 255mm (el valor que estaba cableado)",
  presupuestoChecklistMM(CARTA_APAISADA) === 255,
  `dio ${presupuestoChecklistMM(CARTA_APAISADA)}`,
);
verificar(
  "Carta vertical sin holgura da 200mm (el valor cableado en RAG)",
  presupuestoColumnasMM({ tamano: "carta", orientacion: "vertical", margenMM: 8 }, 0) === 200,
  `dio ${presupuestoColumnasMM({ tamano: "carta", orientacion: "vertical", margenMM: 8 }, 0)}`,
);
verificar("A4 apaisada es más ancha que Carta apaisada", presupuestoChecklistMM(A4_APAISADA) > presupuestoChecklistMM(CARTA_APAISADA));

verificarCaso("31 días — mes largo, A4 apaisada", 31, A4_APAISADA);
verificarCaso("28 días — mes corto, A4 apaisada", 28, A4_APAISADA);
verificarCaso("0 días — sin columnas de fecha", 0, A4_APAISADA);
verificarCaso("31 días — Carta apaisada (la hoja de antes)", 31, CARTA_APAISADA);
verificarCaso("31 días — Equipo, Mecánico y Bitácora comparten hoja", 31, A4_APAISADA, {
  equipo: true,
  mecanico: false,
  bitacora: false,
});

// Agrupar debe gastar menos tablas de hoja, no más: es el objetivo del
// cambio (ver docs/decisiones.md D-25).
console.log("\nCompartir hoja reduce el número de hojas");
{
  const doc = armarDocumentoChecklist({ formato: formatoBase, bloques: bloques(TODOS_EN_HOJA_PROPIA), fotoUrlPorRuta: {}, diasDelMes: 31 });
  const docUnido = armarDocumentoChecklist({
    formato: formatoBase,
    bloques: bloques({ equipo: true, mecanico: false, bitacora: false }),
    fotoUrlPorRuta: {},
    diasDelMes: 31,
  });
  const hojasSeparadas = tablasDeNivel(renderizarCuerpoChecklist(doc, A4_APAISADA)).length;
  const hojasUnidas = tablasDeNivel(renderizarCuerpoChecklist(docUnido, A4_APAISADA)).length;
  verificar(
    `unir Mecánico y Bitácora al grupo de Equipo baja de ${hojasSeparadas} a ${hojasUnidas} tablas de hoja`,
    hojasUnidas < hojasSeparadas,
  );
}

console.log("\n" + "=".repeat(60));
if (fallas > 0) {
  console.error(`${fallas} verificación(es) fallaron.`);
  process.exit(1);
}
console.log("Todo consistente.");
