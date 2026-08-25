import "server-only";

import sharp from "sharp";

// Lienzo cuadrado — mismo tamaño que usaba el generador anterior
// (H:\My Drive\...\reporte.py, "optimizado para media diapositiva").
const ANCHO = 900;
const ALTO = 900;

interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface ImagenAjustada {
  buffer: Buffer;
  ancho: number;
  alto: number;
}

async function ajustar(foto: Buffer, anchoCaja: number, altoCaja: number): Promise<ImagenAjustada> {
  const { data, info } = await sharp(foto)
    .resize(Math.round(anchoCaja), Math.round(altoCaja), { fit: "inside", withoutEnlargement: true })
    .jpeg()
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, ancho: info.width, alto: info.height };
}

async function esVertical(foto: Buffer): Promise<boolean> {
  const metadatos = await sharp(foto).metadata();
  return (metadatos.height ?? 0) > (metadatos.width ?? 0);
}

function colocar(caja: Caja, imagen: ImagenAjustada) {
  return {
    input: imagen.buffer,
    left: caja.x + Math.round((caja.ancho - imagen.ancho) / 2),
    top: caja.y + Math.round((caja.alto - imagen.alto) / 2),
  };
}

/**
 * Arma un collage de hasta 6 fotografías en un lienzo cuadrado de 900×900.
 * Espejo deliberado de generar_collage() en reporte.py (H:\My Drive\VW\03 -
 * Reportes\Revision periodica mensual\) — mismos cinco acomodos según
 * cantidad y orientación, para que el criterio visual no cambie entre el
 * informe legado de ciclos cerrados y éste. Las fotos ya vienen en el
 * orden correcto (momento, orden) desde la consulta a Supabase.
 */
export async function generarCollage(fotos: Buffer[]): Promise<Buffer | null> {
  const imagenes = fotos.slice(0, 6);
  const n = imagenes.length;
  if (n === 0) return null;

  const capas: { input: Buffer; left: number; top: number }[] = [];

  if (n === 1) {
    const primera = imagenes[0]!;
    const img = await ajustar(primera, ANCHO, ALTO);
    capas.push(colocar({ x: 0, y: 0, ancho: ANCHO, alto: ALTO }, img));
  } else if (n === 2) {
    const [v0, v1] = await Promise.all(imagenes.map(esVertical));
    if (v0 && v1) {
      for (const [i, foto] of imagenes.entries()) {
        const img = await ajustar(foto, ANCHO, ALTO / 2);
        capas.push(colocar({ x: 0, y: i * (ALTO / 2), ancho: ANCHO, alto: ALTO / 2 }, img));
      }
    } else {
      for (const [i, foto] of imagenes.entries()) {
        const img = await ajustar(foto, ANCHO / 2, ALTO);
        capas.push(colocar({ x: i * (ANCHO / 2), y: 0, ancho: ANCHO / 2, alto: ALTO }, img));
      }
    }
  } else if (n === 3) {
    const primera = imagenes[0]!;
    const resto = imagenes.slice(1);
    const arriba = await ajustar(primera, ANCHO, ALTO / 2);
    capas.push(colocar({ x: 0, y: 0, ancho: ANCHO, alto: ALTO / 2 }, arriba));
    for (const [i, foto] of resto.entries()) {
      const img = await ajustar(foto, ANCHO / 2, ALTO / 2);
      capas.push(colocar({ x: i * (ANCHO / 2), y: ALTO / 2, ancho: ANCHO / 2, alto: ALTO / 2 }, img));
    }
  } else if (n === 4) {
    for (const [i, foto] of imagenes.entries()) {
      const img = await ajustar(foto, ANCHO / 2, ALTO / 2);
      const col = i % 2;
      const fila = Math.floor(i / 2);
      capas.push(colocar({ x: col * (ANCHO / 2), y: fila * (ALTO / 2), ancho: ANCHO / 2, alto: ALTO / 2 }, img));
    }
  } else {
    const arriba = imagenes.slice(0, 2);
    const abajo = imagenes.slice(2);
    for (const [i, foto] of arriba.entries()) {
      const img = await ajustar(foto, ANCHO / 2, ALTO / 2);
      capas.push(colocar({ x: i * (ANCHO / 2), y: 0, ancho: ANCHO / 2, alto: ALTO / 2 }, img));
    }
    for (const [i, foto] of abajo.entries()) {
      const img = await ajustar(foto, ANCHO / 3, ALTO / 2);
      capas.push(colocar({ x: i * (ANCHO / 3), y: ALTO / 2, ancho: ANCHO / 3, alto: ALTO / 2 }, img));
    }
  }

  return sharp({ create: { width: ANCHO, height: ALTO, channels: 3, background: "#ffffff" } })
    .composite(capas)
    .jpeg({ quality: 95 })
    .toBuffer();
}
