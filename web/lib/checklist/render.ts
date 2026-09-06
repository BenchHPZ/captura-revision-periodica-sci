// DocumentoChecklist → HTML. Sin React, sin JSX — mismo criterio que
// web/lib/rag/render.ts (D-16, D-22): cadenas de texto simples, para que
// el mismo módulo sirva a una página de la app y, más adelante, a un
// generador local.
//
// Estructura: una <table class="chk-hoja"> por GRUPO DE HOJA (ver
// ./paginas.ts) × rebanada de columnas de fecha. Su <thead> es el
// encabezado de página y su <tfoot> el pie, y el navegador los repite una
// vez por hoja impresa — el único mecanismo nativo disponible (D-16). El
// contenido va dentro de una sola celda, como una <table class="chk-seccion">
// anidada por sección, cada una con su propio <colgroup> y su propio
// <thead> (banner + encabezado de columnas), que también se repite cuando
// esa sección cruza de página.
//
// Que las tablas internas tengan colgroup propio es lo que permite que
// bloques con columnas distintas (Equipo de 5 columnas fijas, Mecánico de
// 2, una bitácora con las suyas) compartan hoja sin ninguna rejilla común
// ni mapeo de colspan: basta con que sus zonas fijas sumen lo mismo para
// que las columnas de fecha caigan bajo la fila "Fecha" del encabezado.
// Verificado imprimiendo de verdad antes de construirlo — ver
// docs/decisiones.md D-25.
import { LOGO_VW_SVG } from "../documentos/constantes";
import type { ConfiguracionPagina } from "../documentos/pagina";
import { anchoFijoDe, columnasFijasDe, type ColumnaFijaChecklist } from "./columnas";
import { CIERRE_COLUMNA_CHECKLIST, ENCABEZADO_COLUMNA_CHECKLIST } from "./constantes";
import { estilosChecklist } from "./estilos";
import { agruparBloquesEnHojas, bloqueUsaColumnasFecha, repartoDeGrupo, type GrupoHoja, type RepartoHoja } from "./paginas";
import type {
  BloqueBitacoraLibre,
  BloqueChecklist,
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

/** Mes y año, sin día ni hora: el documento se imprime en blanco y se
 * llena a mano a lo largo del mes, así que la hora exacta de generación no
 * le decía nada a nadie — sólo ensuciaba el encabezado que ahora se repite
 * en cada hoja. Ver docs/decisiones.md D-25. */
function formatearMesAno(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-MX", { month: "short", year: "numeric" });
}

/** Franja superior + título + línea de impresión + AÑO/MES + Fecha +
 * Grupo: exactamente lo que debe aparecer UNA vez al principio de cada
 * hoja. Vive en el <thead> de la tabla de hoja, así que el navegador lo
 * repite solo en cada página que esa hoja ocupe.
 *
 * Ya no lleva el nombre del bloque (una hoja puede traer varios) ni las
 * instrucciones (irían en cada página; ahora se imprimen una sola vez, al
 * principio del documento — ver renderizarGrupoHoja). */
function renderizarEncabezadoHoja(doc: DocumentoChecklist, totalCols: number, reparto: RepartoHoja, columnasFecha: ColumnaFecha[]): string {
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
        <div class="doc-meta">Impreso: ${formatearMesAno(doc.generado)}</div>
      </td>
    </tr>
    <tr class="chk-general-fila">
      <td colspan="${totalCols}">
        <div class="chk-general">
          <span class="chk-general-campo">AÑO<span class="chk-general-caja"></span></span>
          <span class="chk-general-campo">MES<span class="chk-general-caja"></span></span>
        </div>
      </td>
    </tr>
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.fecha, 1, columnasFecha, "chk-celda-marca")}
    ${filaPorColumnaFecha(ENCABEZADO_COLUMNA_CHECKLIST.grupo, 1, columnasFecha, "chk-celda-marca")}`;
}

/** Nombre + Firma + franja de pie: lo que debe aparecer UNA vez al final
 * de cada hoja. Vive en el <tfoot>, por el mismo motivo. */
function renderizarPieHoja(doc: DocumentoChecklist, totalCols: number, columnasFecha: ColumnaFecha[]): string {
  const domicilio = doc.encabezado.domicilio.map(escapeHtml).join(", ");
  const revision = doc.encabezado.revision ? ` Rev. ${escapeHtml(doc.encabezado.revision)}` : "";
  return `
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.nombre, 1, columnasFecha, "chk-celda-cierre")}
    ${filaPorColumnaFecha(CIERRE_COLUMNA_CHECKLIST.firma, 1, columnasFecha, "chk-celda-cierre")}
    <tr class="doc-franja-pie">
      <td colspan="${totalCols}">
        ${escapeHtml(doc.encabezado.razon_social)} — ${domicilio} · ${escapeHtml(doc.clave)}
        ${escapeHtml(doc.encabezado.documento_referencia)}${revision}
      </td>
    </tr>`;
}

/** Fila de encabezado o de cierre repetida por columna de fecha: el
 * mismo patrón sirve para Fecha/Grupo (encabezado) y Nombre/Firma
 * (cierre) — sólo cambia la etiqueta de la primera celda. */
function filaPorColumnaFecha(etiqueta: string, spanEtiqueta: number, columnasFecha: ColumnaFecha[], clase: string): string {
  const celdaEtiqueta = `<th class="chk-etiqueta-fila" colspan="${spanEtiqueta}">${escapeHtml(etiqueta)}</th>`;
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

function anchoTotalMM(reparto: RepartoHoja, columnasFecha: ColumnaFecha[]): number {
  return reparto.anchoFijoMM + columnasFecha.length * reparto.anchoFechaMM;
}

function colgroupDe(anchos: number[]): string {
  return `<colgroup>${anchos.map((a) => `<col style="width:${a}mm">`).join("")}</colgroup>`;
}

/** Un bloque de tabla (equipo o mecánico) como una tabla interna por
 * sección. Sus columnas fijas se estiran al ancho común del grupo
 * (columnasFijasDe con anchoObjetivoMM), para que sus columnas de fecha
 * caigan exactamente bajo las del encabezado de hoja aunque comparta hoja
 * con un bloque de otro tipo.
 *
 * El banner externo se emite sólo cuando CAMBIA respecto de la sección
 * anterior: mientras se mantenga la ubicación física, no hace falta
 * reescribirla cada vez que cambia la categoría de adentro. */
function renderizarBloqueTabla(
  bloque: BloqueTablaVerificacion | BloqueTablaSimple,
  columnasFecha: ColumnaFecha[],
  reparto: RepartoHoja,
): string {
  const columnasFijas = columnasFijasDe(bloque.tipo, reparto.anchoFijoMM);
  const totalCols = columnasFijas.length + columnasFecha.length;
  const colgroup = colgroupDe([...columnasFijas.map((c) => c.anchoMM), ...columnasFecha.map(() => reparto.anchoFechaMM)]);

  let externoAnterior: string | null = null;
  return hojasDeGrupos(bloque.grupos)
    .map((hoja) => {
      const externo =
        hoja.nombreExterno !== null && hoja.nombreExterno !== externoAnterior
          ? `<tr class="chk-categoria"><th colspan="${totalCols}">${escapeHtml(hoja.nombreExterno)}</th></tr>`
          : "";
      externoAnterior = hoja.nombreExterno;
      const interno =
        hoja.nombreInterno !== null ? `<tr class="chk-subgrupo"><th colspan="${totalCols}">${escapeHtml(hoja.nombreInterno)}</th></tr>` : "";

      return `
<table class="doc-tabla chk-seccion">
  ${colgroup}
  <thead>
    ${externo}
    ${interno}
    ${encabezadoColumnasFijas(columnasFijas, columnasFecha)}
  </thead>
  <tbody>
    ${hoja.items.map((item) => renderizarFilasItem(item, columnasFijas, columnasFecha)).join("")}
  </tbody>
</table>`;
    })
    .join("");
}

/** Portada de fotos de identificación de la unidad. Ya no necesita
 * presupuesto de ancho propio: las columnas de fecha las pone el
 * encabezado de hoja, y la cuadrícula ocupa una sola celda a todo lo
 * ancho. Simplificada respecto al PDF de origen: sin la leyenda gráfica de
 * marcado de daños (golpe/abollón/rayón), que es un detalle visual, no
 * estructural. */
function renderizarPortada(bloque: BloquePortadaFotos, columnasFecha: ColumnaFecha[], reparto: RepartoHoja): string {
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
<table class="doc-tabla chk-seccion chk-portada">
  ${colgroupDe([anchoTotalMM(reparto, columnasFecha)])}
  <tbody>
    <tr><td class="chk-portada-celda-grid"><div class="chk-portada-grid">${tarjetas}</div></td></tr>
  </tbody>
</table>`;
}

/** Bitácora libre: columnas propias, sin columnas de fecha, repartidas a
 * partes iguales sobre el ancho de la hoja. Cada renglón en blanco lleva
 * el alto configurado en el bloque — antes no había ninguno y quedaban de
 * ~2.5mm, imposibles de llenar a mano (ver docs/decisiones.md D-25). */
function renderizarBitacora(bloque: BloqueBitacoraLibre, columnasFecha: ColumnaFecha[], reparto: RepartoHoja): string {
  const total = bloque.columnas.length;
  if (total === 0) return "";
  const anchoColumna = anchoTotalMM(reparto, columnasFecha) / total;
  const encabezado = bloque.columnas.map((c) => `<th>${escapeHtml(c.etiqueta)}</th>`).join("");
  const filaBlanco = `<tr class="chk-renglon">${bloque.columnas
    .map(() => `<td style="height:${bloque.altoFilaMM}mm"></td>`)
    .join("")}</tr>`;

  return `
<table class="doc-tabla chk-seccion chk-bitacora">
  ${colgroupDe(bloque.columnas.map(() => anchoColumna))}
  <thead>
    <tr class="chk-encabezado-principal">${encabezado}</tr>
  </thead>
  <tbody>
    ${Array.from({ length: bloque.filasBlanco }, () => filaBlanco).join("")}
  </tbody>
</table>`;
}

function renderizarBloqueInterno(bloque: BloqueChecklist, columnasFecha: ColumnaFecha[], reparto: RepartoHoja): string {
  switch (bloque.tipo) {
    case "portada_fotos":
      return renderizarPortada(bloque, columnasFecha, reparto);
    case "tabla_verificacion":
    case "tabla_simple":
      return renderizarBloqueTabla(bloque, columnasFecha, reparto);
    case "bitacora_libre":
      return renderizarBitacora(bloque, columnasFecha, reparto);
  }
}

/** Un grupo de hoja: una <table class="chk-hoja"> por rebanada de columnas
 * de fecha, con el encabezado y el pie de página en thead/tfoot y todo el
 * contenido dentro de una sola celda. */
function renderizarGrupoHoja(
  doc: DocumentoChecklist,
  grupo: GrupoHoja,
  pagina: ConfiguracionPagina,
  esPrimerGrupo: boolean,
): string {
  const reparto = repartoDeGrupo(grupo, doc.columnasFecha, pagina);

  return reparto.rebanadas
    .map((columnasFecha, indiceRebanada) => {
      const primeraTablaGlobal = esPrimerGrupo && indiceRebanada === 0;
      const saltoPagina = primeraTablaGlobal ? "" : " chk-salto-pagina";
      const totalCols = 1 + columnasFecha.length;

      // Un bloque cuyo contenido no depende de las columnas de fecha (una
      // portada, una bitácora) se imprime sólo en la primera rebanada: las
      // rebanadas existen para cubrir rangos de fechas distintos, y
      // repetirlo en cada una duplicaría la cuadrícula de fotos o los
      // renglones en blanco.
      const bloques = indiceRebanada === 0 ? grupo.bloques : grupo.bloques.filter(bloqueUsaColumnasFecha);

      const instrucciones =
        primeraTablaGlobal && doc.instrucciones.length > 0
          ? `<ol class="doc-instrucciones chk-instrucciones">${doc.instrucciones.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>`
          : "";

      const secciones = bloques.map((b) => renderizarBloqueInterno(b, columnasFecha, reparto)).join("");
      const nombres = bloques.map((b) => b.nombre).join("|");

      return `
<table class="doc-tabla chk-hoja${saltoPagina}" data-grupo="${grupo.indice}" data-rebanada="${indiceRebanada}" data-bloques="${escapeHtml(nombres)}">
  ${colgroupDe([reparto.anchoFijoMM, ...columnasFecha.map(() => reparto.anchoFechaMM)])}
  <thead>
    ${renderizarEncabezadoHoja(doc, totalCols, reparto, columnasFecha)}
  </thead>
  <tfoot>
    ${renderizarPieHoja(doc, totalCols, columnasFecha)}
  </tfoot>
  <tbody>
    <tr><td class="chk-hoja-celda" colspan="${totalCols}">${instrucciones}${secciones}</td></tr>
  </tbody>
</table>`;
    })
    .join("");
}

/** El cuerpo semántico del documento — sin <style>, sin <html>, para
 * incrustarse en una página que ya controla su propio <head> (mismo
 * patrón que renderizarCuerpoRAG).
 *
 * Respeta el orden de doc.bloques tal cual: antes se reordenaba por tipo
 * (portada → tablas → bitácora), lo que hacía imposible que el usuario
 * decidiera qué bloques comparten hoja. */
export function renderizarCuerpoChecklist(doc: DocumentoChecklist, pagina: ConfiguracionPagina): string {
  const grupos = agruparBloquesEnHojas(doc.bloques);
  const partes = grupos.map((grupo, indice) => renderizarGrupoHoja(doc, grupo, pagina, indice === 0));
  return `<div class="chk-doc">${partes.join("")}</div>`;
}

/** Documento HTML completo y autocontenido — el que de verdad se
 * imprime, en un iframe oculto sin el resto de los estilos de la app (ver
 * docs/decisiones.md D-16, D-22). */
export function renderizarDocumentoCompleto(doc: DocumentoChecklist, pagina: ConfiguracionPagina): string {
  const titulo = `${doc.clave} — ${doc.cicloNombre ?? "Checklist"}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>${estilosChecklist(pagina)}</style>
</head>
<body>
${renderizarCuerpoChecklist(doc, pagina)}
</body>
</html>`;
}

export interface DocumentoRenderizado {
  cuerpo: string;
  estilos: string;
  completo: string;
}

/** Una sola entrada para quien renderiza: cuerpo embebido, estilos y
 * documento completo salen de la MISMA ConfiguracionPagina. Antes la
 * página pedía las tres cosas por separado y podía inyectar un <style>
 * calculado con una hoja distinta de la del cuerpo — nadie lo habría
 * notado hasta imprimir. */
export function renderizarChecklist(doc: DocumentoChecklist, pagina: ConfiguracionPagina): DocumentoRenderizado {
  return {
    cuerpo: renderizarCuerpoChecklist(doc, pagina),
    estilos: estilosChecklist(pagina),
    completo: renderizarDocumentoCompleto(doc, pagina),
  };
}

/** Sólo para anchoFijoDe/columnasFijasDe re-exportados por conveniencia de
 * los scripts de verificación, que necesitan recalcular los mismos anchos
 * para asertar contra el HTML. */
export { anchoFijoDe, columnasFijasDe };
