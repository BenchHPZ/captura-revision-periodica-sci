import { ETIQUETA_TEXTO_LIBRE, type CampoTextoLibre, type Estado, type Plantilla } from "./tipos";

export interface DatosRegistro {
  como_se_encontro: string | null;
  que_se_realizo: string | null;
  pendientes: string | null;
  valores: Record<string, string>;
}

const vacio = (v: string | null | undefined): boolean => !v || v.trim() === "";

/**
 * Deriva el estado de un elemento contra la plantilla vigente de su
 * sistema. Ver docs/modelo-de-datos.md §4 — es la única fuente de verdad
 * para esta regla; no debe haber una segunda copia de esta lógica.
 *
 * `fotosPorMomento` cuenta las fotografías ya subidas, agrupadas por el
 * id del bloque fotográfico (p. ej. { antes: 1, despues: 0 }).
 */
export function calcularEstado(
  plantilla: Plantilla,
  registro: DatosRegistro | null,
  fotosPorMomento: Record<string, number>,
): Estado {
  const totalFotos = Object.values(fotosPorMomento).reduce((a, b) => a + b, 0);

  if (!registro && totalFotos === 0) {
    return "sin_iniciar";
  }

  const fotosCompletas = plantilla.fotos.every(
    (bloque) => !bloque.requerido || (fotosPorMomento[bloque.id] ?? 0) >= bloque.min,
  );

  const textosCompletos = plantilla.texto_libre.every(
    (campo) => !vacio(registro?.[campo as CampoTextoLibre]),
  );

  const puntosCompletos = plantilla.puntos.every(
    (punto) => !punto.requerido || !vacio(registro?.valores?.[punto.id]),
  );

  if (fotosCompletas && textosCompletos && puntosCompletos) {
    return "completo";
  }

  return "parcial";
}

/** Qué falta para completar, en español, para mostrarlo al capturar. */
export function faltantes(
  plantilla: Plantilla,
  registro: DatosRegistro | null,
  fotosPorMomento: Record<string, number>,
): string[] {
  const lista: string[] = [];

  for (const bloque of plantilla.fotos) {
    if (bloque.requerido && (fotosPorMomento[bloque.id] ?? 0) < bloque.min) {
      lista.push(`Foto — ${bloque.etiqueta}`);
    }
  }
  for (const campo of plantilla.texto_libre) {
    const clave = campo as CampoTextoLibre;
    if (vacio(registro?.[clave])) {
      lista.push(ETIQUETA_TEXTO_LIBRE[clave] ?? campo);
    }
  }
  for (const punto of plantilla.puntos) {
    if (punto.requerido && vacio(registro?.valores?.[punto.id])) {
      lista.push(punto.etiqueta);
    }
  }
  return lista;
}
