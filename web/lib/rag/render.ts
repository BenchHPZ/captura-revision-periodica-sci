// DocumentoRAG → HTML. Sin React, sin JSX — cadenas de texto simples, a
// propósito: es lo que permite que el mismo módulo sirva tanto a una
// página de la app (embebido con dangerouslySetInnerHTML) como a un
// generador local que escriba un .html a disco más adelante (ver
// docs/decisiones.md D-16). No debe importar "server-only", "next/*" ni
// "react" — ver la prueba de pureza en la verificación del cambio.
import type { PuntoDef, TipoPunto, ValorPunto } from "../tipos";
import { columnasDe, type ColumnaRAG } from "./columnas";
import { LOGO_VW_SVG } from "./constantes";
import { ESTILOS_RAG } from "./estilos";
import type { CierreFormato, DocumentoRAG, ModoDocumentoRAG, RenglonRAG } from "./tipos";

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Un punto SI/NO ocupa UNA sola columna: la respuesta se escribe dentro
 * de la celda. Antes eran dos sub-columnas con casilla, lo que duplicaba
 * el ancho sin agregar información — ver docs/decisiones.md D-15 §7.4. */
function esPuntoRespuesta(tipo: TipoPunto): boolean {
  return tipo === "si_no" || tipo === "si_no_na";
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

/** Normaliza la respuesta a su etiqueta impresa. Los puntos nuevos se
 * capturan como booleano (true/false/null); los capturados antes de ese
 * cambio quedaron como texto "SI"/"NO"/"NA" en registros ya reales — se
 * siguen leyendo igual, no se migran. */
export function respuestaDe(valor: ValorPunto | undefined): "SI" | "NO" | "NA" | undefined {
  if (valor === true || valor === "SI") return "SI";
  if (valor === false || valor === "NO") return "NO";
  if (valor === null || valor === "NA") return "NA";
  return undefined;
}

/** La celda de un punto de revisión para un renglón: una sola, con la
 * respuesta escrita dentro. En modo vacío queda en blanco, para anotar
 * SI o NO a mano igual que en el papel. */
function celdaPunto(punto: PuntoDef, valor: ValorPunto | undefined, modo: ModoDocumentoRAG): string {
  if (!esPuntoRespuesta(punto.tipo)) {
    if (modo === "vacio" || valor === undefined) return `<td></td>`;
    return `<td>${escapeHtml(String(valor))}</td>`;
  }
  const respuesta = modo === "vacio" ? undefined : respuestaDe(valor);
  if (respuesta === undefined) return `<td class="rag-respuesta"></td>`;
  return `<td class="rag-respuesta rag-respuesta-${respuesta.toLowerCase()}">${respuesta}</td>`;
}

/** La celda de una columna cualquiera para un renglón — el único lugar
 * que sabe de dónde sale cada dato, recorriendo la misma lista de
 * columnas que armó el <thead> y el <colgroup> (ver ./columnas.ts). */
function celdaDeColumna(
  columna: ColumnaRAG,
  renglon: RenglonRAG,
  puntosPorId: Map<string, PuntoDef>,
  modo: ModoDocumentoRAG,
): string {
  switch (columna.id) {
    case "id":
      return `<td class="${columna.clase}">${renglon.id}</td>`;
    case "numeracion":
      return `<td class="${columna.clase}">${escapeHtml(renglon.numeracion)}</td>`;
    case "ubicacion":
      return `<td class="${columna.clase}">${escapeHtml(renglon.ubicacion)}</td>`;
    case "referencia":
      return `<td class="${columna.clase}">${escapeHtml(renglon.referencia)}</td>`;
    case "tipo":
      return `<td class="${columna.clase}">${escapeHtml(renglon.tipo)}</td>`;
    case "observaciones":
      return `<td class="${columna.clase}">${modo === "vacio" ? "" : escapeHtml(renglon.observaciones)}</td>`;
    default: {
      const punto = puntosPorId.get(columna.id);
      return punto ? celdaPunto(punto, renglon.valores[columna.id], modo) : `<td class="${columna.clase}"></td>`;
    }
  }
}

function renderizarRenglon(
  renglon: RenglonRAG,
  columnas: ColumnaRAG[],
  puntosPorId: Map<string, PuntoDef>,
  modo: ModoDocumentoRAG,
): string {
  const celdas = columnas.map((c) => celdaDeColumna(c, renglon, puntosPorId, modo)).join("");
  return `<tr class="rag-renglon">${celdas}</tr>`;
}

/** El bloque de firmas como tabla propia, independiente de la rejilla de
 * columnas del documento (el número de firmantes no tiene por qué
 * coincidir con el número de puntos de revisión). */
function renderizarBloqueCierre(cierre: CierreFormato): string {
  const n = cierre.campos.length;
  if (n === 0) return "";
  const anchoCampo = 100 / n;
  const celdas = cierre.campos
    .map(
      (campo) => `
        <td style="width:${anchoCampo}%">
          <div class="rag-cierre-etiqueta">${escapeHtml(campo.etiqueta)}</div>
          <div class="rag-cierre-espacio">&nbsp;</div>
        </td>`,
    )
    .join("");
  return `<table class="rag-cierre-inner"><tr>${celdas}</tr></table>`;
}

function renderizarFilaCierrePie(cierre: CierreFormato, totalCols: number): string {
  return `
    <tr class="rag-cierre-row">
      <td class="rag-cierre-celda" colspan="${totalCols}">${renderizarBloqueCierre(cierre)}</td>
    </tr>`;
}

/** Franja-superior + título + instrucciones — el mismo contenido que
 * antes vivía inline dentro de renderizarCuerpoRAG(), extraído para
 * poder llamarlo una vez por zona (ver renderizarCuerpoRAG): las
 * instrucciones sólo se muestran en la PRIMERA tabla del documento,
 * mismo criterio que ya usaba checklist (renderizarEncabezadoGeneral en
 * web/lib/checklist/render.ts) — ver docs/decisiones.md D-24. */
function renderizarEncabezadoGeneralRAG(doc: DocumentoRAG, totalCols: number, conInstrucciones: boolean): string {
  const metaCiclo = doc.cicloNombre ? `${escapeHtml(doc.cicloNombre)} · ` : "";
  const metaModo = doc.modo === "vacio" ? "Formato en blanco" : "Con lo capturado";
  const instrucciones =
    conInstrucciones && doc.instrucciones.length > 0
      ? `<tr class="rag-instrucciones-fila"><td colspan="${totalCols}"><ol class="rag-instrucciones">${doc.instrucciones.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol></td></tr>`
      : "";

  return `
    <tr class="rag-franja-superior">
      <td colspan="${totalCols}">
        <div class="rag-encabezado-linea">
          ${doc.encabezado.clasificacion ? `<span class="rag-clasificacion">${escapeHtml(doc.encabezado.clasificacion)}</span>` : "<span></span>"}
          <span class="rag-logo">${LOGO_VW_SVG}</span>
          <span></span>
        </div>
      </td>
    </tr>
    <tr class="rag-titulo-fila">
      <td colspan="${totalCols}">
        <div class="rag-titulo">${escapeHtml(doc.nombre)}</div>
        <div class="rag-meta">${metaCiclo}Generado ${formatearFecha(doc.generado)} · ${metaModo} · ${doc.totalRenglones} elemento${doc.totalRenglones === 1 ? "" : "s"}</div>
      </td>
    </tr>
    ${instrucciones}`;
}

/** Una zona sin nombre (documento sin elementos, caso límite) — para que
 * la tabla igual se imprima con encabezado/pie y sin ningún renglón, sin
 * ampliar SeccionRAG a nullable (ver docs/decisiones.md D-24): el tipo
 * público sigue siendo honesto, esta forma sólo existe dentro de esta
 * función. */
interface SeccionParaImprimir {
  nombre: string | null;
  renglones: RenglonRAG[];
}

/**
 * El cuerpo semántico del documento — sin `<style>`, sin `<html>`. Para
 * incrustarse dentro de una página que ya controla su propio `<head>`
 * (la vista de la app inyecta ESTILOS_RAG aparte, una sola vez).
 *
 * Una `<table>` POR ZONA, no una sola para todo el documento: antes el
 * banner de zona (`rag-seccion`) era un `<tr>` cualquiera dentro de
 * `<tbody>`, así que si una zona con muchos renglones se repartía entre
 * varias páginas impresas, el banner sólo aparecía en la primera — los
 * navegadores sólo repiten nativamente `<thead>`/`<tfoot>` al paginar, no
 * un renglón de en medio (ver docs/decisiones.md D-16 y D-24). Ahora el
 * banner vive dentro del `<thead>` de la tabla de SU zona, así que se
 * repite igual que el resto del encabezado en cualquier página que esa
 * zona llegue a ocupar. Sin salto de página forzado entre zonas — cada
 * tabla sigue mostrando su propio `<tfoot>` en cualquier página que
 * toque, así que ninguna página se queda sin firma aunque comparta
 * página con la zona siguiente (verificado contra el PDF real de la
 * ambulancia, ver D-24). `columnasDe(doc)` no varía por zona, así que el
 * `colgroup` es idéntico en cada tabla, sólo repetido.
 */
export function renderizarCuerpoRAG(doc: DocumentoRAG): string {
  const columnas = columnasDe(doc);
  // Antes este número se calculaba aparte (4 + puntos.length + 1) y podía
  // desincronizarse del resto — ver docs/decisiones.md D-19. Ahora es
  // literalmente cuántas columnas se armaron.
  const totalCols = columnas.length;
  const puntosPorId = new Map(doc.puntos.map((p) => [p.id, p]));

  const colgroup = columnas.map((c) => `<col style="width:${c.anchoMM}mm">`).join("");

  // La etiqueta va en vertical para que la columna de un punto SI/NO
  // quede angosta; su altura está acotada por CSS (.rag-punto-vertical),
  // de modo que una etiqueta larga se parte en dos renglones en vez de
  // estirar el encabezado hacia abajo sin límite.
  const encabezados = columnas
    .map((c) =>
      c.origen === "punto"
        ? `<th class="${c.clase}"><span>${escapeHtml(c.etiqueta)}</span></th>`
        : `<th class="${c.clase}">${escapeHtml(c.etiqueta)}</th>`,
    )
    .join("");

  const domicilio = doc.encabezado.domicilio.map(escapeHtml).join(", ");
  const revision = doc.encabezado.revision ? ` Rev. ${escapeHtml(doc.encabezado.revision)}` : "";

  const secciones: SeccionParaImprimir[] = doc.secciones.length > 0 ? doc.secciones : [{ nombre: null, renglones: [] }];

  const tablas = secciones
    .map((seccion, indice) => {
      const primeraTabla = indice === 0;
      const banner =
        seccion.nombre !== null ? `<tr class="rag-seccion"><th colspan="${totalCols}">${escapeHtml(seccion.nombre)}</th></tr>` : "";
      const filas = seccion.renglones.map((r) => renderizarRenglon(r, columnas, puntosPorId, doc.modo)).join("");

      return `
<table class="rag-tabla">
  <colgroup>
    ${colgroup}
  </colgroup>
  <thead>
    ${renderizarEncabezadoGeneralRAG(doc, totalCols, primeraTabla)}
    ${banner}
    <tr class="rag-encabezado-principal">
      ${encabezados}
    </tr>
  </thead>
  <tbody>
    ${filas}
  </tbody>
  <tfoot>
    ${doc.cierre.repetir ? renderizarFilaCierrePie(doc.cierre, totalCols) : ""}
    <tr class="rag-franja-pie">
      <td colspan="${totalCols}">
        ${escapeHtml(doc.encabezado.razon_social)} — ${domicilio} · ${escapeHtml(doc.clave)}
        ${escapeHtml(doc.encabezado.documento_referencia)}${revision}
      </td>
    </tr>
  </tfoot>
</table>`;
    })
    .join("");

  return `
<div class="rag-doc">
  ${tablas}
  ${!doc.cierre.repetir ? `<div class="rag-cierre-final">${renderizarBloqueCierre(doc.cierre)}</div>` : ""}
</div>`;
}

/** Documento HTML completo y autocontenido: incluye el CSS embebido. Es
 * lo que usa "Imprimir" — una ventana nueva sin el resto de los estilos
 * de la app de por medio (ver docs/decisiones.md D-16 §7.5). Su
 * `<title>` es el nombre que Chrome/Edge sugieren al "Guardar como PDF". */
export function renderizarDocumentoCompleto(doc: DocumentoRAG): string {
  const titulo = `${doc.clave} — ${doc.cicloNombre ?? doc.periodicidad}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>${ESTILOS_RAG}</style>
</head>
<body>
${renderizarCuerpoRAG(doc)}
</body>
</html>`;
}
