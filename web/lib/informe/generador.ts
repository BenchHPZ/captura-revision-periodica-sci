import "server-only";

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import Automizer from "pptx-automizer";
import { DEPOSITO, obtenerElementosParaInforme, obtenerPlantilla, obtenerSistemas, type ElementoParaInforme } from "../datos";
import { agruparPorSeccion, type ElementoParaDocumento } from "../rag/documento";
import { respuestaDe } from "../rag/render";
import type { Ciclo, PuntoDef, Sistema } from "../tipos";
import { generarCollage } from "./collage";
import * as geo from "./geometria";

/**
 * Arma el informe fotográfico mensual: una diapositiva por elemento activo,
 * agrupadas por sistema y, dentro de cada sistema, por `seccion` — el mismo
 * criterio que usa el documento RAG (agruparPorSeccion, reutilizada tal
 * cual, no reimplementada: ver docs/decisiones.md D-17). Corre del lado del
 * servidor con la sesión del usuario (nunca la llave de servicio — esa
 * queda reservada a las utilerías locales, ver README § Variables de
 * entorno), así que las mismas políticas de RLS que ya rigen el resto de
 * la aplicación aplican aquí sin nada especial.
 *
 * Arma un archivo .pptx *por sistema* y los combina al final en vez de ir
 * agregando las 221 diapositivas a una sola presentación en construcción:
 * verificado contra el ciclo real, lo segundo se comporta bien con pocas
 * diapositivas pero se dispara a varios minutos según qué tan cargado esté
 * el sistema que se esté armando en ese momento (no es un patrón simple de
 * "cuenta de elementos" ni de "cantidad de puntos" — ver docs/decisiones.md
 * D-17). Con un Automizer nuevo por sistema y una combinación final que
 * sólo clona diapositivas ya armadas, el total pasó de varios minutos a
 * menos de quince segundos en el mismo ciclo, sin tocar el contenido de
 * ninguna diapositiva.
 */
export async function generarInformePptx(supabase: SupabaseClient, ciclo: Ciclo): Promise<Buffer> {
  const carpetaTemp = await mkdtemp(path.join(tmpdir(), "informe-"));
  await descargarPlantilla(supabase, carpetaTemp);

  const sistemas = await obtenerSistemas(supabase);
  const partes: { archivo: string; totalDiapositivas: number }[] = [];

  for (const sistema of sistemas) {
    const parte = await armarParteSistema(supabase, ciclo, sistema, carpetaTemp);
    if (parte.totalDiapositivas > 0) partes.push(parte);
  }

  const nombreSalida = `Informe_Reporte_${ciclo.nombre.replace(/\s+/g, "")}.pptx`;
  await combinarPartes(partes, carpetaTemp, nombreSalida);
  return readFile(path.join(carpetaTemp, nombreSalida));
}

async function descargarPlantilla(supabase: SupabaseClient, carpetaTemp: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(DEPOSITO)
    .download(`_plantillas/${geo.NOMBRE_PLANTILLA_ARCHIVO}`);
  if (error) throw error;
  await writeFile(path.join(carpetaTemp, geo.NOMBRE_PLANTILLA_ARCHIVO), Buffer.from(await data.arrayBuffer()));
}

function nuevoAutomizer(carpetaTemp: string) {
  // removeExistingSlides es obligatorio, no cosmético: sin él, las
  // diapositivas de muestra de la plantilla corporativa (guías de color,
  // iconos, portadas) se cargan y se vuelven a escribir en cada write()
  // junto con las generadas — ver docs/decisiones.md D-17.
  return new Automizer({ templateDir: carpetaTemp, outputDir: carpetaTemp, removeExistingSlides: true });
}

async function armarParteSistema(
  supabase: SupabaseClient,
  ciclo: Ciclo,
  sistema: Sistema,
  carpetaTemp: string,
): Promise<{ archivo: string; totalDiapositivas: number }> {
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
    seccion: e.seccion,
    ordenSeccion: e.orden_seccion,
    orden: e.orden,
  }));
  const porId = new Map(elementos.map((e) => [e.id, e]));

  const pres = nuevoAutomizer(carpetaTemp)
    .loadRoot(geo.NOMBRE_PLANTILLA_ARCHIVO)
    .load(geo.NOMBRE_PLANTILLA_ARCHIVO, "plantilla");

  let total = 0;
  for (const [, elementosSeccion] of agruparPorSeccion(paraAgrupar)) {
    const ordenados = [...elementosSeccion].sort((a, b) => a.orden - b.orden);
    for (const ref of ordenados) {
      const elemento = porId.get(ref.id);
      if (!elemento) continue;
      await agregarDiapositiva(supabase, pres, sistema, elemento, puntos);
      total += 1;
    }
  }

  const archivo = `_parte_${sistema.clave}.pptx`;
  if (total > 0) await pres.write(archivo);
  return { archivo, totalDiapositivas: total };
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

  const filasTabla = puntos.map((punto) => {
    const respuesta = respuestaDe(elemento.registro?.valores?.[punto.id]);
    const relleno = respuesta === "SI" ? "C2FE06" : respuesta === "NO" ? "E5484D" : "E8E8E8";
    return [
      { text: punto.etiqueta, options: { fontSize: 9, color: "002733" } },
      { text: respuesta ?? "—", options: { fontSize: 9, fill: { color: relleno }, align: "center" as const } },
    ];
  });

  const metadatos = [
    `Sistema: ${sistema.nombre}`,
    elemento.seccion && `Sección: ${elemento.seccion}`,
    (elemento.ubicacion || elemento.referencia) &&
      `Ubicación: ${[elemento.ubicacion, elemento.referencia].filter(Boolean).join(" · ")}`,
    elemento.responsable && `Responsable: ${elemento.responsable}`,
  ]
    .filter(Boolean)
    .join("   ·   ");

  const textos = [
    elemento.registro?.como_se_encontro && `Cómo se encontró: ${elemento.registro.como_se_encontro}`,
    elemento.registro?.que_se_realizo && `Qué se le realizó: ${elemento.registro.que_se_realizo}`,
    elemento.registro?.pendientes && `Pendientes: ${elemento.registro.pendientes}`,
  ]
    .filter(Boolean)
    .join("\n");

  pres.addSlide("plantilla", geo.SLIDE_ELEMENTO_REFERENCIA, (slide) => {
    slide.generate((pgenSlide) => {
      if (collage) {
        pgenSlide.addImage({
          data: `data:image/jpeg;base64,${collage.toString("base64")}`,
          ...geo.IMAGEN,
          sizing: { type: "cover", w: geo.IMAGEN.w, h: geo.IMAGEN.h },
        });
      }
      pgenSlide.addText(`Elemento: ${elemento.nombre}`, { ...geo.TITULO, fontSize: 20, bold: true, color: "002733" });
      pgenSlide.addText(metadatos, { ...geo.METADATOS, fontSize: 10, color: "002733" });
      if (textos) {
        pgenSlide.addText(textos, { ...geo.TEXTOS, fontSize: 10, color: "002733" });
      }
      if (filasTabla.length > 0) {
        pgenSlide.addTable(filasTabla, {
          ...geo.TABLA_PUNTOS,
          fontSize: 9,
          border: { type: "solid", color: "CCCCCC", pt: 0.5 },
          autoPage: false,
        });
      }
    });
  });
}

async function combinarPartes(
  partes: { archivo: string; totalDiapositivas: number }[],
  carpetaTemp: string,
  nombreSalida: string,
): Promise<void> {
  if (partes.length === 0) {
    throw new Error("Ningún sistema tiene elementos activos — no hay nada que combinar.");
  }
  const primera = partes[0]!;
  let pres = nuevoAutomizer(carpetaTemp).loadRoot(primera.archivo).load(primera.archivo, primera.archivo);
  for (const parte of partes.slice(1)) {
    pres = pres.load(parte.archivo, parte.archivo);
  }
  for (const parte of partes) {
    for (let i = 1; i <= parte.totalDiapositivas; i++) {
      pres.addSlide(parte.archivo, i);
    }
  }
  await pres.write(nombreSalida);
}
