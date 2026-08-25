// Coordenadas del layout "Elemento" de la plantilla corporativa
// (Reporte sistemas - MASTER.pptx, slide_layouts[5]), medidas directamente
// del archivo con python-pptx — no inventadas. pptx-automizer no puede
// escribir contenido dinámico DENTRO de un placeholder vacío (no hay
// texto ni imagen previa que "modificar": ver docs/decisiones.md D-17),
// así que cada diapositiva se arma agregando elementos nuevos con
// PptxGenJS encima del layout, en las mismas posiciones que ocupan sus
// placeholders. Unidades en pulgadas (PptxGenJS trabaja en pulgadas).

const CM_A_PULGADAS = 1 / 2.54;

function caja(leftCm: number, topCm: number, anchoCm: number, altoCm: number) {
  return {
    x: leftCm * CM_A_PULGADAS,
    y: topCm * CM_A_PULGADAS,
    w: anchoCm * CM_A_PULGADAS,
    h: altoCm * CM_A_PULGADAS,
  };
}

/** Nombre del layout dentro de slide_layouts / de la diapositiva de
 * referencia ya existente en la plantilla (slide 10, 1-indexado) que se
 * clona para cada elemento. */
export const NOMBRE_PLANTILLA_ARCHIVO = "Reporte sistemas - MASTER.pptx";
export const SLIDE_ELEMENTO_REFERENCIA = 10;

// left/top/ancho/alto en cm, tal como los reporta python-pptx (Emu → cm).
export const TITULO = caja(1.13, 1.79, 15.0, 1.08);
export const METADATOS = caja(1.13, 2.93, 15.01, 0.77);
export const TABLA_PUNTOS = caja(1.13, 5.12, 15.01, 8.95);
export const TEXTOS = caja(1.13, 14.66, 15.01, 3.26);
export const IMAGEN = caja(16.93, 0, 16.93, 17.93);
