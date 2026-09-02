import "server-only";

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import Automizer, { ModifyTextHelper } from "pptx-automizer";
import { DEPOSITO, obtenerElementosParaInforme, obtenerPlantilla, obtenerSistemas, type ElementoParaInforme } from "../datos";
import { ordenarDentroDeZona, type ElementoParaOrdenar } from "../orden";
import { agruparPorZona, type ElementoParaDocumento } from "../rag/documento";
import { respuestaDe } from "../rag/render";
import type { Ciclo, PuntoDef, Sistema, TipoDiccionario } from "../tipos";
import { generarCollage } from "./collage";
import * as geo from "./geometria";

/**
 * Arma el informe fotográfico mensual reproduciendo el entregable que el
 * área ya produce (ver Informe_Reporte_Marzo2026.pptx): las diapositivas
 * base de la plantilla, y luego, por cada sistema, su divisor de capítulo
 * seguido de una diapositiva por elemento activo — esté completo o no.
 *
 * Corre del lado del servidor con la sesión del usuario (nunca la llave de
 * servicio, ver README § Variables de entorno), así que las mismas
 * políticas de RLS que rigen el resto de la aplicación aplican aquí.
 *
 * Sobre el fondo oscuro: el layout 'Elemento' hereda `bg2 → dk2 = #002733`
 * del master, así que TODO el texto va claro. La primera versión escribía
 * en #002733 sobre ese mismo #002733 y salía invisible — ver
 * docs/decisiones.md D-17.
 *
 * Se arma en UNA sola pasada, en el orden final del documento. Una versión
 * anterior armaba un .pptx por sistema y los combinaba al final, creyendo
 * que acumular diapositivas en una sola instancia era lo que disparaba el
 * tiempo; medirlo mostró que no —221 diapositivas en una instancia tardan
 * unos tres segundos, y el costo real es descargar fotografías y componer
 * los collages—, y a cambio esa partición introducía un defecto sutil: el
 * identificador de `addSlide` es el número de archivo XML de la
 * diapositiva, no su posición en el mazo, así que al pedir las
 * diapositivas 1..N de un archivo de parte se recogían las de la plantilla
 * que `removeExistingSlides` había dejado huérfanas. Ver D-17.
 *
 * `sistemasClaves`, si se da, limita el informe a esos sistemas — para
 * cuando sólo hace falta reimprimir el capítulo de uno en concreto, en vez
 * del ciclo completo. La intro y la portada se agregan igual (diapositivas
 * fijas de la plantilla); la agenda y los divisores de capítulo, en
 * cambio, se arman en cada corrida a partir de los sistemas seleccionados
 * — de 2 a `geo.AGENDA_MAX_SISTEMAS` —, no de un contenido fijo pensado
 * para cinco. El divisor usa un solo molde (`geo.SLIDE_MOLDE_DIVISOR`)
 * clonado una vez por sistema con elementos, numerado en el orden en que
 * aparecen; la agenda llena las `geo.AGENDA_MAX_SISTEMAS` casillas que
 * `scripts/preparar_plantilla_informe.py` amplió a partir de las 5
 * originales, y deja vacías las que sobren.
 */
export interface InformePptx {
  archivo: Buffer;
  /** Ya incluye el sufijo de sistemas cuando el informe es parcial, para
   * que el nombre de descarga no mienta diciendo "el ciclo completo". */
  nombreArchivo: string;
}

export async function generarInformePptx(
  supabase: SupabaseClient,
  ciclo: Ciclo,
  sistemasClaves?: string[],
): Promise<InformePptx> {
  const carpetaTemp = await mkdtemp(path.join(tmpdir(), "informe-"));
  await descargarPlantilla(supabase, carpetaTemp);

  const todosLosSistemas = await obtenerSistemas(supabase);
  const sistemas = sistemasClaves
    ? todosLosSistemas.filter((s) => sistemasClaves.includes(s.clave))
    : todosLosSistemas;
  if (sistemas.length === 0) {
    throw new Error("No hay ningún sistema seleccionado para el informe.");
  }
  if (sistemas.length > geo.AGENDA_MAX_SISTEMAS) {
    throw new Error(
      `Un informe admite hasta ${geo.AGENDA_MAX_SISTEMAS} sistemas; hay ${sistemas.length} seleccionados.`,
    );
  }

  const pres = nuevoAutomizer(carpetaTemp)
    .loadRoot(geo.NOMBRE_PLANTILLA_ARCHIVO)
    .load(geo.NOMBRE_PLANTILLA_ARCHIVO, "plantilla");

  // Intro, portada y agenda, tal como vienen en la plantilla. La portada
  // y los pies traen el ciclo y el KSU con los que se armó la plantilla
  // ("… / Marzo 2026", "KSU XXX"), así que hay que ponerles los del ciclo
  // en curso: es de los pocos lugares donde `modify` sirve, porque el
  // placeholder SÍ tiene contenido previo que reemplazar (ver D-17 sobre
  // por qué no sirve en las de elemento).
  const fecha = `${String(ciclo.mes).padStart(2, "0")}.${ciclo.anio}`;

  pres.addSlide("plantilla", geo.SLIDE_INTRO);
  pres.addSlide("plantilla", geo.SLIDE_PORTADA, (slide) => {
    slide.modifyElement(geo.PORTADA_SUBTITULO, ModifyTextHelper.setText(`${geo.GRUPO} / Protección Contra Incendios / ${ciclo.nombre}`));
    slide.modifyElement(geo.PORTADA_KSU, ModifyTextHelper.setText(geo.KSU));
  });
  pres.addSlide("plantilla", geo.SLIDE_AGENDA, (slide) => {
    slide.modifyElement(geo.FECHA_AGENDA, ModifyTextHelper.setText(fecha));
    slide.modifyElement(geo.PIE_AGENDA, ModifyTextHelper.setText(geo.PIE_TEXTO));
    // Lista los sistemas SELECCIONADOS para esta corrida, no sólo los que
    // terminan con elementos — mismo criterio que el filtro parcial. Las
    // casillas sobrantes (hasta AGENDA_MAX_SISTEMAS) quedan vacías.
    for (let i = 1; i <= geo.AGENDA_MAX_SISTEMAS; i += 1) {
      const sistema = sistemas[i - 1];
      slide.modifyElement(geo.agendaNumero(i), ModifyTextHelper.setText(sistema ? String(i) : ""));
      slide.modifyElement(geo.agendaNombre(i), ModifyTextHelper.setText(sistema ? sistema.nombre : ""));
    }
  });

  let totalElementos = 0;
  let numeroCapitulo = 1;
  for (const sistema of sistemas) {
    const agregadas = await agregarSistema(supabase, ciclo, sistema, pres, fecha, numeroCapitulo);
    if (agregadas > 0) numeroCapitulo += 1;
    totalElementos += agregadas;
  }

  if (totalElementos === 0) {
    throw new Error("Ningún sistema tiene elementos activos — no hay nada que incluir en el informe.");
  }

  const esParcial = sistemasClaves !== undefined && sistemas.length < todosLosSistemas.length;
  const sufijo = esParcial ? `_${sistemas.map((s) => s.clave).join("-")}` : "";
  const nombreArchivo = `Informe_Reporte_${ciclo.nombre.replace(/\s+/g, "")}${sufijo}.pptx`;
  await pres.write(nombreArchivo);
  const archivo = await readFile(path.join(carpetaTemp, nombreArchivo));
  return { archivo, nombreArchivo };
}

async function descargarPlantilla(supabase: SupabaseClient, carpetaTemp: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(DEPOSITO)
    .download(`_plantillas/${geo.NOMBRE_PLANTILLA_ARCHIVO}`);
  if (error) throw error;
  await writeFile(path.join(carpetaTemp, geo.NOMBRE_PLANTILLA_ARCHIVO), Buffer.from(await data.arrayBuffer()));
}

function nuevoAutomizer(carpetaTemp: string) {
  // removeExistingSlides descarta las diapositivas de la plantilla para
  // que sólo queden las que agregamos, en el orden que queremos. Sin él,
  // además, cada write() reescribe también las de la plantilla y el
  // tiempo total se dispara — D-17.
  return new Automizer({ templateDir: carpetaTemp, outputDir: carpetaTemp, removeExistingSlides: true });
}

/** Agrega el divisor de capítulo del sistema y una diapositiva por
 * elemento activo. Devuelve cuántos elementos se agregaron. */
async function agregarSistema(
  supabase: SupabaseClient,
  ciclo: Ciclo,
  sistema: Sistema,
  pres: ReturnType<Automizer["loadRoot"]>,
  fecha: string,
  numeroCapitulo: number,
): Promise<number> {
  const [elementos, plantilla] = await Promise.all([
    obtenerElementosParaInforme(supabase, ciclo.id, sistema.id),
    obtenerPlantilla(supabase, ciclo.id, sistema.id),
  ]);
  // Mismo filtro defensivo que armarDocumentoRAG: 'observaciones' ya no
  // debería llegar como punto de plantilla (D-15), pero por si una
  // plantilla vieja lo trae, no se duplica contra el texto 'Pendientes'.
  const puntos = (plantilla?.puntos ?? []).filter((p) => p.id !== "observaciones");

  const paraAgrupar: ElementoParaDocumento[] = elementos.map((e) => ({
    id: e.id,
    numeracion: e.nombre,
    ubicacion: e.ubicacion,
    referencia: e.referencia,
    tipo: e.tipo,
    zona: e.zona?.nombre ?? null,
    zonaOrden: e.zona?.orden ?? null,
    ordenAnclado: e.orden_anclado,
    orden: e.orden,
  }));
  const porId = new Map(elementos.map((e) => [e.id, e]));

  if (elementos.length === 0) return 0;

  pres.addSlide("plantilla", geo.SLIDE_MOLDE_DIVISOR, (slide) => {
    slide.modifyElement(geo.DIVISOR_NUMERO, ModifyTextHelper.setText(String(numeroCapitulo)));
    slide.modifyElement(
      geo.DIVISOR_TITULO,
      ModifyTextHelper.setText(sistema.rag ? `${sistema.nombre} – ${sistema.rag}` : sistema.nombre),
    );
    slide.modifyElement(geo.FECHA_DIVISOR, ModifyTextHelper.setText(fecha));
    slide.modifyElement(geo.PIE_DIVISOR, ModifyTextHelper.setText(geo.PIE_TEXTO));
  });

  let total = 0;
  for (const [, elementosZona] of agruparPorZona(paraAgrupar)) {
    const ordenados = ordenarDentroDeZona(
      elementosZona.map(
        (el): ElementoParaOrdenar => ({
          id: el.id,
          ubicacion: el.ubicacion,
          nombre: el.numeracion,
          ordenAnclado: el.ordenAnclado,
        }),
      ),
    );
    for (const ref of ordenados) {
      const elemento = porId.get(ref.id);
      if (!elemento) continue;
      await agregarDiapositiva(supabase, pres, sistema, elemento, puntos);
      total += 1;
    }
  }

  return total;
}

/** Los siete renglones del bloque de datos, SIEMPRE los mismos y en el
 * mismo orden — es lo que permite anclarlo abajo con altura conocida. Lo
 * que falta se marca con una raya en vez de omitirse, para que el bloque
 * no cambie de tamaño entre diapositivas. */
function renglonesDatos(sistema: Sistema, elemento: ElementoParaInforme, tipos: TipoDiccionario[]): string[] {
  const nombreTipo = elemento.tipo ? (tipos.find((t) => t.clave === elemento.tipo)?.nombre ?? elemento.tipo) : null;
  const ETIQUETA_ESTADO: Record<string, string> = {
    completo: "Completo",
    parcial: "Parcial",
    sin_iniciar: "Sin iniciar",
  };
  const o = (valor: string | null | undefined) => valor?.trim() || "—";

  return [
    `Sistema: ${sistema.nombre}`,
    `Zona: ${o(elemento.zona?.nombre)}`,
    `Tipo: ${o(nombreTipo)}`,
    `Ubicación: ${o(elemento.ubicacion)}`,
    `Referencia: ${o(elemento.referencia)}`,
    `Responsable: ${o(elemento.responsable)}`,
    `Estado: ${ETIQUETA_ESTADO[elemento.registro?.estado ?? "sin_iniciar"] ?? "Sin iniciar"}`,
  ];
}

/** Los tres textos de campo, con su etiqueta. Van juntos para que ningún
 * comentario se quede fuera. */
function textoObservaciones(elemento: ElementoParaInforme): string {
  const texto = [
    elemento.registro?.como_se_encontro && `Cómo se encontró: ${elemento.registro.como_se_encontro}`,
    elemento.registro?.que_se_realizo && `Qué se le realizó: ${elemento.registro.que_se_realizo}`,
    elemento.registro?.pendientes && `Pendientes: ${elemento.registro.pendientes}`,
  ]
    .filter(Boolean)
    .join("\n");
  return texto || "Sin comentarios capturados.";
}

/** Alto de renglón de la tabla, encogido si el sistema trae tantos puntos
 * que la tabla llegaría al bloque de abajo. Con los cinco sistemas de hoy
 * (de 1 a 5 puntos) nunca hace falta, pero un punto más en una plantilla
 * futura no debe empujar la tabla encima de las observaciones. */
function altoRenglonTabla(filas: number): number {
  const disponible = geo.TABLA.yMax - geo.TABLA.y;
  return Math.min(geo.TABLA.altoRenglon, disponible / Math.max(1, filas));
}

async function agregarDiapositiva(
  supabase: SupabaseClient,
  pres: ReturnType<Automizer["loadRoot"]>,
  sistema: Sistema,
  elemento: ElementoParaInforme,
  puntos: PuntoDef[],
): Promise<void> {
  const fotos = [...(elemento.registro?.fotos ?? [])].sort(
    (a, b) => a.momento.localeCompare(b.momento) || a.orden - b.orden,
  );
  // En paralelo: cada descarga es independiente y un elemento trae como
  // máximo unas pocas fotos, así que no hay riesgo real de saturar la
  // conexión — y con 221 elementos, hacerlo en serie sí se nota.
  const resultados = await Promise.all(
    fotos.map(async (foto): Promise<Buffer[]> => {
      const { data, error } = await supabase.storage.from(DEPOSITO).download(foto.ruta);
      // Una fotografía individual que falle no debe tirar todo el informe
      // — el elemento simplemente sale con menos fotos en su collage, o
      // sin collage si ninguna se pudo bajar.
      if (error) return [];
      return [Buffer.from(await data.arrayBuffer())];
    }),
  );
  const buffersFotos = resultados.flat();
  const collage = buffersFotos.length > 0 ? await generarCollage(buffersFotos) : null;

  const observaciones = textoObservaciones(elemento);
  const datos = renglonesDatos(sistema, elemento, sistema.tipos).join("\n");

  const filasTabla =
    puntos.length > 0
      ? [
          [
            { text: "Punto", options: { bold: true, color: geo.BLANCO } },
            { text: "Resultado", options: { bold: true, color: geo.BLANCO, align: "center" as const } },
          ],
          ...puntos.map((punto) => {
            const respuesta = respuestaDe(elemento.registro?.valores?.[punto.id]);
            const color =
              respuesta === "SI" ? geo.RESPUESTA_SI : respuesta === "NO" ? geo.RESPUESTA_NO : geo.RESPUESTA_NA;
            return [
              { text: punto.etiqueta, options: { color: geo.BLANCO } },
              { text: respuesta ?? "—", options: { color, bold: true, align: "center" as const } },
            ];
          }),
        ]
      : [];

  pres.addSlide("plantilla", geo.SLIDE_MOLDE_ELEMENTO, (slide) => {
    slide.generate((pgenSlide) => {
      if (collage) {
        pgenSlide.addImage({
          data: `data:image/jpeg;base64,${collage.toString("base64")}`,
          ...geo.IMAGEN,
          // 'contain', no 'cover': el collage es cuadrado y la caja no,
          // así que 'cover' recortaba ~6% del ancho y se comía las fotos
          // de los extremos en los acomodos de dos y tres columnas.
          sizing: { type: "contain", w: geo.IMAGEN.w, h: geo.IMAGEN.h },
        });
      }

      const subtitulo = {
        fontSize: geo.PT_SUBTITULO,
        fontFace: geo.FUENTE_TITULO,
        color: geo.CONDICION_COLOR,
        valign: "top" as const,
      };

      pgenSlide.addText(`Elemento: ${elemento.nombre}`, {
        ...geo.TITULO,
        fontSize: geo.PT_TITULO,
        fontFace: geo.FUENTE_TITULO,
        color: geo.BLANCO,
        valign: "top",
      });

      // --- Tabla de características, justo debajo del título ---
      pgenSlide.addText(geo.ETIQUETA_SUB_TABLA, { ...geo.SUB_TABLA, ...subtitulo });
      if (filasTabla.length > 0) {
        pgenSlide.addTable(filasTabla, {
          x: geo.TABLA.x,
          y: geo.TABLA.y,
          w: geo.TABLA.w,
          colW: geo.TABLA.colW,
          rowH: altoRenglonTabla(filasTabla.length),
          fontSize: geo.PT_TABLA,
          fontFace: geo.FUENTE_TEXTO,
          border: { type: "solid", color: geo.REGLA_TABLA, pt: 0.5 },
          autoPage: false,
        });
      } else {
        pgenSlide.addText("Este sistema no tiene puntos de revisión definidos.", {
          x: geo.TABLA.x,
          y: geo.TABLA.y,
          w: geo.TABLA.w,
          h: 0.3,
          fontSize: geo.PT_OBSERVACIONES,
          fontFace: geo.FUENTE_TEXTO,
          color: geo.RESPUESTA_NA,
        });
      }

      // --- Observaciones de campo ---
      pgenSlide.addText(geo.ETIQUETA_SUB_OBSERVACIONES, { ...geo.SUB_OBSERVACIONES, ...subtitulo });
      pgenSlide.addText(observaciones, {
        ...geo.OBSERVACIONES,
        fontSize: geo.PT_OBSERVACIONES,
        fontFace: geo.FUENTE_TEXTO,
        color: geo.BLANCO,
        valign: "top",
        // Los tres comentarios juntos pueden ser largos; que el texto se
        // encoja antes que desbordarse sobre el bloque de abajo.
        fit: "shrink",
      });

      // --- Datos del sistema, anclados abajo ---
      pgenSlide.addText(geo.ETIQUETA_SUB_DATOS, { ...geo.SUB_DATOS, ...subtitulo });
      pgenSlide.addText(datos, {
        ...geo.DATOS,
        fontSize: geo.PT_DATOS,
        fontFace: geo.FUENTE_TEXTO,
        bold: true,
        color: geo.BLANCO,
        valign: "top",
      });
    });
  });
}
