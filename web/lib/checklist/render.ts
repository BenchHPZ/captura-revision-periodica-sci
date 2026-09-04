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
  CategoriaChecklist,
  ColumnaFecha,
  DocumentoChecklist,
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
    case "pos":
      return `<td class="${columna.clase}"${rowspan}>${escapeHtml(item.pos ?? "")}</td>`;
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

function renderizarCategorias(
  categorias: CategoriaChecklist[],
  columnasFijas: ColumnaFijaChecklist[],
  columnasFecha: ColumnaFecha[],
  totalCols: number,
): string {
  return categorias
    .map((cat) => {
      const banner = `<tr class="chk-categoria"><th colspan="${totalCols}">${escapeHtml(cat.nombre)}</th></tr>`;
      const filas = cat.items.map((item) => renderizarFilasItem(item, columnasFijas, columnasFecha)).join("");
      return banner + filas;
    })
    .join("");
}

/** Un bloque de tabla (equipo o mecánico) repartido en tantas <table>
 * como haga falta para que las columnas de fecha quepan en una hoja
 * apaisada — ver ./columnas.ts. columnasFijasDe() es la única fuente de
 * columnas fijas (incluida "Verificación" cuando aplica): el colgroup, el
 * <th> del encabezado principal y los colspan de las demás filas se
 * derivan todos de la MISMA lista, así que sus conteos coinciden por
 * construcción — mismo principio que D-19 en RAG. */
function renderizarBloqueTabla(doc: DocumentoChecklist, bloque: BloqueTablaVerificacion | BloqueTablaSimple, primerBloqueGlobal: boolean): string {
  const columnasFijas = columnasFijasDe(bloque.tipo);
  const grupos = rebanarColumnasFecha(doc.columnasFecha, columnasFijas);

  return grupos
    .map((grupoFechas, indice) => {
      const totalCols = columnasFijas.length + grupoFechas.length;
      const colgroup = [
        ...columnasFijas.map((c) => `<col style="width:${c.anchoMM}mm">`),
        ...grupoFechas.map(() => `<col style="width:8mm">`),
      ].join("");

      const saltoPagina = primerBloqueGlobal && indice === 0 ? "" : "chk-salto-pagina";

      return `
<table class="doc-tabla chk-tabla ${saltoPagina}">
  <colgroup>${colgroup}</colgroup>
  <thead>
    ${renderizarEncabezadoGeneral(doc, totalCols, bloque.nombre, primerBloqueGlobal && indice === 0)}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.fecha, columnasFijas, grupoFechas, "chk-celda-marca")}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.grupo, columnasFijas, grupoFechas, "chk-celda-marca")}
    ${encabezadoColumnasFijas(columnasFijas, grupoFechas)}
  </thead>
  <tbody>
    ${renderizarCategorias(bloque.categorias, columnasFijas, grupoFechas, totalCols)}
  </tbody>
  <tfoot>
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.nombre, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.firma, columnasFijas, grupoFechas, "chk-celda-cierre")}
    ${renderizarFranjaPie(doc, totalCols)}
  </tfoot>
</table>`;
    })
    .join("");
}

/** Franja fija con las fotos de identificación de la unidad — no es una
 * tabla de columnas de fecha, es la portada del documento. Simplificada
 * respecto al PDF de origen: sin la leyenda gráfica de marcado de daños
 * (golpe/abollón/rayón), que es un detalle visual, no estructural —
 * queda como mejora posterior si el área la pide. */
function renderizarPortada(doc: DocumentoChecklist, bloque: BloquePortadaFotos): string {
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

  return `
<div class="chk-portada">
  <div class="doc-encabezado-linea chk-portada-encabezado">
    ${doc.encabezado.clasificacion ? `<span class="doc-clasificacion">${escapeHtml(doc.encabezado.clasificacion)}</span>` : "<span></span>"}
    <span class="doc-logo">${LOGO_VW_SVG}</span>
    <span></span>
  </div>
  <div class="doc-titulo chk-portada-titulo">${escapeHtml(doc.nombre)}</div>
  <div class="chk-portada-grid">${tarjetas}</div>
</div>`;
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
