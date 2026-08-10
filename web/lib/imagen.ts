// Reducción de fotografías en el navegador antes de subirlas. Ver
// docs/decisiones.md D-07: lado mayor 2560 px, JPEG calidad 88 por
// defecto (tomados de ciclos.config.imagen, no fijos aquí), con la
// orientación EXIF aplicada al píxel.
//
// createImageBitmap con { imageOrientation: "from-image" } es lo que evita
// que una foto tomada en vertical con el teléfono acostado salga girada:
// sin esa opción, el bitmap ignora el tag EXIF de orientación y el canvas
// dibuja los píxeles crudos tal como vienen del sensor.

export interface ImagenReducida {
  blob: Blob;
  ancho: number;
  alto: number;
}

export interface OpcionesReduccion {
  ladoMax: number;
  /** 0–100, como en PIL/JPEG estándar — no 0–1. */
  calidad: number;
}

export async function reducirImagen(
  archivo: File | Blob,
  { ladoMax, calidad }: OpcionesReduccion,
): Promise<ImagenReducida> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });

  try {
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo preparar el lienzo para reducir la imagen.");
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", calidad / 100),
    );
    if (!blob) {
      throw new Error("No se pudo generar la imagen reducida.");
    }

    return { blob, ancho, alto };
  } finally {
    bitmap.close();
  }
}
