// DocumentoChecklist → HTML. Sin React, sin JSX — mismo criterio que
// web/lib/rag/render.ts (D-16, D-22): cadenas de texto simples, para que
// el mismo módulo sirva a una página de la app y, más adelante, a un
// generador local.
//
// La diferencia estructural con RAG: ahí una sola <table> alcanza porque
// las columnas (puntos de revisión) siempre caben en el ancho de una
// hoja. Aquí puede haber hasta 31 columnas de fecha — más de las que
// caben en una hoja apaisada — así que cada bloque de tabla se reparte en
// VARIAS <table> independientes (una por grupo de columnas de fecha que
// sí cabe, ver ./columnas.ts), cada una con su propio thead/tfoot
// completo para que sobreviva sola al paginar (page-break-before entre
// ellas). Es el mismo mecanismo nativo del navegador que D-16 documenta
// para RAG, aplicado varias veces en vez de una.
import { LOGO_VW_SVG } from "../documentos/constantes";
import { columnasFijasDe, rebanarColumnasFecha, type ColumnaFijaChecklist } from "./columnas";
import { CIERRE_COLUMNA_CHECKLIST, ENCABEZADO_COLUMNA_CHECKLIST } from "./constantes";
import { ESTILOS_CHECKLIST } from "./estilos";
import type {
  BloqueBitacoraLibre,
  BloquePortadaFotos,
  BloqueTablaSimple,
  BloqueTablaVerificacion,
  ColumnaFecha,
  DocumentoChecklist,
  GrupoChecklist,
  ItemChecklist,
  VerificacionChecklist,
} from "./tipos";

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

/** Franja superior + título + instrucciones — idéntico al de RAG salvo
 * por la sección general de AÑO/MES, propia del checklist (ver plan de
 * ampliación de RAGs: "una sección general para indicar el año y el mes
 * de revisión"). Se repite en el thead de CADA tabla del documento, igual
 * que el resto del encabezado — ver la nota de módulo sobre por qué hay
 * varias <table>. */
function renderizarEncabezadoGeneral(
  doc: DocumentoChecklist,
  totalCols: number,
  nombreBloque: string,
  conInstrucciones: boolean,
): string {
  const instrucciones =
    conInstrucciones && doc.instrucciones.length > 0
      ? `<tr class="doc-instrucciones-fila"><td colspan="${totalCols}"><ol class="doc-instrucciones">${doc.instrucciones
          .map((i) => `<li>${escapeHtml(i)}</li>`)
          .join("")}</ol></td></tr>`
      : "";

  return `
    <tr class="doc-franja-superior">
      <td colspan="${totalCols}">
        <div class="doc-encabezado-linea">
          ${doc.encabezado.clasificacion ? `<span class="doc-clasificacion">${escapeHtml(doc.encabezado.clasificacion)}</span>` : "<span></span>"}
          <span class="doc-logo">${LOGO_VW_SVG}</span>
          <span></span>
        </div>
      </td>
    </tr>
    <tr class="doc-titulo-fila">
      <td colspan="${totalCols}">
        <div class="doc-titulo">${escapeHtml(doc.nombre)}</div>
        <div class="doc-meta">${escapeHtml(nombreBloque)} · Generado ${formatearFecha(doc.generado)}</div>
      </td>
    </tr>
    ${instrucciones}
    <tr class="chk-general-fila">
      <td colspan="${totalCols}">
        <div class="chk-general">
          <span class="chk-general-campo">AÑO<span class="chk-general-caja"></span></span>
          <span class="chk-general-campo">MES<span class="chk-general-caja"></span></span>
        </div>
      </td>
    </tr>`;
}

function renderizarFranjaPie(doc: DocumentoChecklist, totalCols: number): string {
  const domicilio = doc.encabezado.domicilio.map(escapeHtml).join(", ");
  const revision = doc.encabezado.revision ? ` Rev. ${escapeHtml(doc.encabezado.revision)}` : "";
  return `
    <tr class="doc-franja-pie">
      <td colspan="${totalCols}">
        ${escapeHtml(doc.encabezado.razon_social)} — ${domicilio} · ${escapeHtml(doc.clave)}
        ${escapeHtml(doc.encabezado.documento_referencia)}${revision}
      </td>
    </tr>`;
}

/** Fila de encabezado o de cierre repetida por columna de fecha: el
 * mismo patrón sirve para Fecha/Grupo (encabezado) y Nombre/Firma
 * (cierre) — sólo cambia la etiqueta de la primera celda y cuántas
 * columnas fijas hay que saltar con colspan. */
function filaPorColumnaFecha(
  etiqueta: string,
  columnasFijas: ColumnaFijaChecklist[],
  columnasFecha: ColumnaFecha[],
  clase: string,
): string {
  const celdaEtiqueta = `<th class="chk-etiqueta-fila" colspan="${columnasFijas.length}">${escapeHtml(etiqueta)}</th>`;
  const celdas = columnasFecha.map(() => `<td class="${clase}"></td>`).join("");
  return `<tr class="chk-fila-columna">${celdaEtiqueta}${celdas}</tr>`;
}

function encabezadoColumnasFijas(columnasFijas: ColumnaFijaChecklist[], columnasFecha: ColumnaFecha[]): string {
  const fijos = columnasFijas.map((c) => `<th class="${c.clase}">${escapeHtml(c.etiqueta)}</th>`).join("");
  const fecha = columnasFecha.map(() => `<th class="chk-celda-marca"></th>`).join("");
  return `<tr class="chk-encabezado-principal">${fijos}${fecha}</tr>`;
}

/** Celda de una columna fija para la PRIMERA fila de un ítem (con
 * rowspan cuando hay más de una verificación) — todo columnasFijasDe()
 * salvo "verificacion", que nunca llega aquí: se repite por fila, no por
 * rowspan (ver renderizarFilasItem). */
function celdaFijaPrimeraFila(columna: ColumnaFijaChecklist, item: ItemChecklist, totalFilas: number): string {
  const rowspan = totalFilas > 1 ? ` rowspan="${totalFilas}"` : "";
  switch (columna.id) {
    case "numero":
      return `<td class="${columna.clase}"${rowspan}>${item.numero}</td>`;
    case "nombre":
    case "descripcion":
      return `<td class="${columna.clase}"${rowspan}>${escapeHtml(item.nombre)}</td>`;
    case "cantidad":
      return `<td class="${columna.clase}"${rowspan}>${escapeHtml(item.cantidad ?? "")}</td>`;
    case "foto":
      return `<td class="${columna.clase}"${rowspan}>${
        item.fotoReferenciaUrl ? `<img class="chk-foto" src="${escapeHtml(item.fotoReferenciaUrl)}" alt="">` : ""
      }</td>`;
    default:
      return `<td class="${columna.clase}"${rowspan}></td>`;
  }
}

/** Una fila de ítem, expandida a una fila por verificación — refleja el
 * documento de origen, donde "Buen estado"/"Cantidad"/"Limpieza" del
 * mismo equipo son renglones separados que comparten Pos/Equipo/Cantidad/
 * Foto (con rowspan); la columna "Verificación" es la única que SÍ
 * cambia en cada una de esas filas, así que se repite en vez de usar
 * rowspan. Un ítem sin verificaciones (o el sub-checklist mecánico, que
 * no las tiene) queda en una sola fila. */
function renderizarFilasItem(item: ItemChecklist, columnasFijas: ColumnaFijaChecklist[], columnasFecha: ColumnaFecha[]): string {
  const tieneColumnaVerificacion = columnasFijas.some((c) => c.id === "verificacion");
  const verificaciones: (VerificacionChecklist | null)[] =
    tieneColumnaVerificacion && item.verificaciones.length > 0 ? item.verificaciones : [null];
  const totalFilas = verificaciones.length;

  return verificaciones
    .map((verificacion, indice) => {
      const primera = indice === 0;
      const celdas = columnasFijas
        .map((c) => {
          if (c.id === "verificacion") return `<td class="${c.clase}">${escapeHtml(verificacion?.etiqueta ?? "")}</td>`;
          return primera ? celdaFijaPrimeraFila(c, item, totalFilas) : "";
        })
        .join("");
      const celdasFecha = columnasFecha.map(() => `<td class="chk-celda-marca"></td>`).join("");
      return `<tr class="chk-renglon">${celdas}${celdasFecha}</tr>`;
    })
    .join("");
}

/** Una "hoja" del árbol de GrupoChecklist (máx. 2 niveles, invariante ya
 * establecida) — el resultado de aplanarlo a una lista ordenada, en el
 * mismo orden en que se debe imprimir. */
interface HojaGrupo {
  nombreExterno: string | null;
  nombreInterno: string | null;
  items: ItemChecklist[];
}

/** Aplana GrupoChecklist a una lista de hojas — sucesora de la vieja
 * renderizarGrupos(), que recorría el árbol e imprimía los banners
 * inline en un <tbody> compartido por todo el bloque. Ahí un banner no
 * podía repetirse al paginar (los navegadores sólo repiten <thead>/
 * <tfoot> — D-16); moverlo a una tabla POR HOJA (ver renderizarBloqueTabla)
 * exige primero tener la lista de hojas por separado. Un grupo con
 * subgrupos aporta una hoja por subgrupo (comparten el mismo
 * nombreExterno); un grupo sin subgrupos es su propia hoja. Ver
 * docs/decisiones.md D-24. */
function hojasDeGrupos(grupos: GrupoChecklist[]): HojaGrupo[] {
  const hojas: HojaGrupo[] = [];
  for (const grupo of grupos) {
    if (grupo.subgrupos.length > 0) {
      for (const subgrupo of grupo.subgrupos) {
        hojas.push({ nombreExterno: grupo.nombre, nombreInterno: subgrupo.nombre, items: subgrupo.items });
      }
    } else {
      hojas.push({ nombreExterno: grupo.nombre, nombreInterno: null, items: grupo.items });
    }
  }
  return hojas;
}

/** Los banners de una hoja, para el <thead> de su propia tabla — mismas
 * clases que antes (`chk-categoria` verde para el externo, `chk-subgrupo`
 * más claro para el interno), sólo reubicadas: al vivir en <thead> se
 * repiten en cada página que la hoja llegue a ocupar. Una hoja sin
 * nombre en algún nivel (agrupación vacía o de un solo nivel) no imprime
 * ese banner — mismo resultado visual que antes. */
function renderizarBannersHoja(hoja: HojaGrupo, totalCols: number): string {
  const externo =
    hoja.nombreExterno !== null ? `<tr class="chk-categoria"><th colspan="${totalCols}">${escapeHtml(hoja.nombreExterno)}</th></tr>` : "";
  const interno =
    hoja.nombreInterno !== null ? `<tr class="chk-subgrupo"><th colspan="${totalCols}">${escapeHtml(hoja.nombreInterno)}</th></tr>` : "";
  return externo + interno;
}

/** Un bloque de tabla (equipo o mecánico) repartido en tantas <table>
 * como haga falta: una por cada combinación de rebanada de columnas de
 * fecha (ver ./columnas.ts, por ancho de página) × hoja de agrupación
 * (ver hojasDeGrupos(), por banner de sección) — columnasFijasDe() sigue
 * siendo la única fuente de columnas fijas (incluida "Verificación"
 * cuando aplica): el colgroup, el <th> del encabezado principal y los
 * colspan de las demás filas se derivan todos de la MISMA lista, así que
 * sus conteos coinciden por construcción — mismo principio que D-19 en
 * RAG.
 *
 * El salto de página forzado (`chk-salto-pagina`) sólo se aplica al
 * cambiar de REBANADA de fecha (`indiceHoja === 0`), no de hoja a hoja
 * dentro de la misma rebanada — si no, cada categoría chica forzaría su
 * propia página, deshaciendo el ahorro de papel que ya existía. Las
 * hojas de una misma rebanada fluyen libremente; cada una sigue
 * mostrando su propio pie en cualquier página que ocupe, así que ninguna
 * queda sin firma aunque comparta página con otra hoja — verificado
 * contra el PDF real de la ambulancia (ver docs/decisiones.md D-24). */
function renderizarBloqueTabla(doc: DocumentoChecklist, bloque: BloqueTablaVerificacion | BloqueTablaSimple, primerBloqueGlobal: boolean): string {
  const columnasFijas = columnasFijasDe(bloque.tipo);
  const gruposFecha = rebanarColumnasFecha(doc.columnasFecha, columnasFijas);
  const hojas = hojasDeGrupos(bloque.grupos);

  return gruposFecha
    .map((grupoFechas, indice) => {
      const totalCols = columnasFijas.length + grupoFechas.length;
      const colgroup = [
        ...columnasFijas.map((c) => `<col style="width:${c.anchoMM}mm">`),
        ...grupoFechas.map(() => `<col style="width:8mm">`),
      ].join("");

      return hojas
        .map((hoja, indiceHoja) => {
          const primeraTablaGlobal = primerBloqueGlobal && indice === 0 && indiceHoja === 0;
          const saltoPagina = !primeraTablaGlobal && indiceHoja === 0 ? "chk-salto-pagina" : "";

          return `
<table class="doc-tabla chk-tabla ${saltoPagina}">
  <colgroup>${colgroup}</colgroup>
  <thead>
    ${renderizarEncabezadoGeneral(doc, totalCols, bloque.nombre, primeraTablaGlobal)}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.fecha, columnasFijas, grupoFechas, "chk-celda-marca")}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.grupo, columnasFijas, grupoFechas, "chk-celda-marca")}
    ${encabezadoColumnasFijas(columnasFijas, grupoFechas)}
    ${renderizarBannersHoja(hoja, totalCols)}
  </thead>
  <tbody>
    ${hoja.items.map((item) => renderizarFilasItem(item, columnasFijas, grupoFechas)).join("")}
  </tbody>
  <tfoot>
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.nombre, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.firma, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${renderizarFranjaPie(doc, totalCols)}
  </tfoot>
</table>`;
        })
        .join("");
    })
    .join("");
}

// Anchos propios de la portada (no los de columnas.ts): a diferencia de
// Equipo/Mecánico, la portada NUNCA se reparte en varias páginas por
// fecha — siempre trae las hasta 31 columnas completas en una sola hoja
// (ver docs/decisiones.md D-24) — así que su presupuesto de ancho es
// distinto: una columna de fecha un poco más angosta que la de
// Equipo/Mecánico (7.5mm en vez de 8mm) deja lugar para una columna de
// etiqueta legible ("Fecha"/"Grupo"/"Nombre"/"Firma" sin partirse en dos
// renglones): 14mm + 31 × 7.5mm = 246.5mm, dentro del presupuesto de
// ~255mm de una hoja Carta apaisada.
const ANCHO_ETIQUETA_PORTADA_MM = 14;
const ANCHO_COLUMNA_FECHA_PORTADA_MM = 7.5;

/** Portada de fotos de identificación de la unidad — antes un <div> suelto
 * sin el encabezado/pie estándar; ahora una <table> más, con la misma
 * estructura que Equipo/Mecánico (encabezado general, AÑO/MES, Fecha/Grupo,
 * Nombre/Firma, franja-pie) para que desde la portada también se pueda
 * identificar el día/grupo de cada revisión y quién la firmó — pedido
 * explícito del usuario, ver docs/decisiones.md D-24. Simplificada
 * respecto al PDF de origen: sin la leyenda gráfica de marcado de daños
 * (golpe/abollón/rayón), que es un detalle visual, no estructural — queda
 * como mejora posterior si el área la pide. */
function renderizarPortada(doc: DocumentoChecklist, bloque: BloquePortadaFotos): string {
  const columnaEtiqueta: ColumnaFijaChecklist = {
    id: "etiqueta",
    etiqueta: "",
    anchoMM: ANCHO_ETIQUETA_PORTADA_MM,
    clase: "chk-celda-etiqueta-portada",
  };
  const columnasFijas = [columnaEtiqueta];
  // Todas las columnas de fecha, sin rebanar — el presupuesto de ancho de
  // la portada (ver arriba) ya está pensado para que quepan las 31 en una
  // sola tabla, a diferencia de Equipo/Mecánico.
  const grupoFechas = doc.columnasFecha;
  const totalCols = columnasFijas.length + grupoFechas.length;

  const colgroup = [
    `<col style="width:${ANCHO_ETIQUETA_PORTADA_MM}mm">`,
    ...grupoFechas.map(() => `<col style="width:${ANCHO_COLUMNA_FECHA_PORTADA_MM}mm">`),
  ].join("");

  const tarjetas = bloque.items
    .map(
      (item) => `
      <div class="chk-portada-tarjeta">
        <div class="chk-portada-imagen">
          ${item.fotoReferenciaUrl ? `<img src="${escapeHtml(item.fotoReferenciaUrl)}" alt="">` : '<span class="chk-portada-vacio">Sin foto</span>'}
        </div>
        <div class="chk-portada-etiqueta">${escapeHtml(item.nombre)}</div>
      </div>`,
    )
    .join("");

  // La portada es siempre el primer bloque del documento (ver
  // renderizarCuerpoChecklist): las instrucciones se muestran aquí, y no
  // hace falta salto de página forzado — no hay nada antes de qué separarse.
  return `
<table class="doc-tabla chk-tabla chk-portada">
  <colgroup>${colgroup}</colgroup>
  <thead>
    ${renderizarEncabezadoGeneral(doc, totalCols, bloque.nombre, true)}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.fecha, columnasFijas, grupoFechas, "chk-celda-marca")}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.grupo, columnasFijas, grupoFechas, "chk-celda-marca")}
  </thead>
  <tbody>
    <tr><td class="chk-portada-celda-grid" colspan="${totalCols}"><div class="chk-portada-grid">${tarjetas}</div></td></tr>
  </tbody>
  <tfoot>
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.nombre, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.firma, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${renderizarFranjaPie(doc, totalCols)}
  </tfoot>
</table>`;
}

function renderizarBitacora(doc: DocumentoChecklist, bloque: BloqueBitacoraLibre, primerBloqueGlobal: boolean): string {
  const totalCols = bloque.columnas.length;
  const colgroup = bloque.columnas.map(() => `<col>`).join("");
  const encabezado = bloque.columnas.map((c) => `<th>${escapeHtml(c.etiqueta)}</th>`).join("");
  const filaBlanco = `<tr class="chk-renglon">${bloque.columnas.map(() => `<td></td>`).join("")}</tr>`;
  const filas = Array.from({ length: bloque.filasBlanco }, () => filaBlanco).join("");
  const saltoPagina = primerBloqueGlobal ? "" : "chk-salto-pagina";

  return `
<table class="doc-tabla chk-tabla chk-bitacora ${saltoPagina}">
  <colgroup>${colgroup}</colgroup>
  <thead>
    ${renderizarEncabezadoGeneral(doc, totalCols, bloque.nombre, false)}
    <tr class="chk-encabezado-principal">${encabezado}</tr>
  </thead>
  <tbody>
    ${filas}
  </tbody>
  <tfoot>
    ${renderizarFranjaPie(doc, totalCols)}
  </tfoot>
</table>`;
}

/** El cuerpo semántico del documento — sin <style>, sin <html>, para
 * incrustarse en una página que ya controla su propio <head> (mismo
 * patrón que renderizarCuerpoRAG). */
export function renderizarCuerpoChecklist(doc: DocumentoChecklist): string {
  const portada = doc.bloques.find((b): b is BloquePortadaFotos => b.tipo === "portada_fotos");
  const bloquesTabla = doc.bloques.filter(
    (b): b is BloqueTablaVerificacion | BloqueTablaSimple => b.tipo === "tabla_verificacion" || b.tipo === "tabla_simple",
  );
  const bitacora = doc.bloques.find((b): b is BloqueBitacoraLibre => b.tipo === "bitacora_libre");

  let primerBloqueGlobal = true;
  const partes: string[] = [];

  if (portada) {
    partes.push(renderizarPortada(doc, portada));
    primerBloqueGlobal = false;
  }

  for (const bloque of bloquesTabla) {
    partes.push(renderizarBloqueTabla(doc, bloque, primerBloqueGlobal));
    primerBloqueGlobal = false;
  }

  if (bitacora) {
    partes.push(renderizarBitacora(doc, bitacora, primerBloqueGlobal));
  }

  return `<div class="chk-doc">${partes.join("")}</div>`;
}

/** Documento HTML completo y autocontenido — el que de verdad se
 * imprime, en un iframe oculto sin el resto de los estilos de la app (ver
 * docs/decisiones.md D-16, D-22). */
export function renderizarDocumentoCompleto(doc: DocumentoChecklist): string {
  const titulo = `${doc.clave} — ${doc.cicloNombre ?? "Checklist"}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>${ESTILOS_CHECKLIST}</style>
</head>
<body>
${renderizarCuerpoChecklist(doc)}
</body>
</html>`;
}
