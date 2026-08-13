import {
  ETIQUETA_TEXTO_LIBRE,
  type CampoTextoLibre,
  type Estado,
  type Plantilla,
  type PuntoDef,
  type ValorPunto,
} from "./tipos";

export interface DatosRegistro {
  como_se_encontro: string | null;
  que_se_realizo: string | null;
  /** Alimenta la columna Observaciones del documento RAG — ver
   * docs/decisiones.md D-15 §7.2. No hay campo 'observaciones' aparte. */
  pendientes: string | null;
  valores: Record<string, ValorPunto>;
}

const vacio = (v: string | null | undefined): boolean => !v || v.trim() === "";

/**
 * Si un punto de revisión ya tiene respuesta. Para si_no/si_no_na es
 * presencia de la llave, no veracidad del valor: false (NO) es una
 * respuesta tan válida como true (SI), y tratarla como "vacía" dejaría un
 * elemento con todo en NO atascado en 'parcial' para siempre (ver
 * docs/modelo-de-datos.md §3.3 y §4). Para el resto de los tipos sigue
 * siendo "no vacío", convirtiendo a texto antes de comparar — así 0 en un
 * punto 'numero' tampoco se lee como vacío.
 */
function contestado(punto: PuntoDef, valores: Record<string, ValorPunto> | undefined): boolean {
  if (punto.tipo === "si_no" || punto.tipo === "si_no_na") {
    return !!valores && Object.prototype.hasOwnProperty.call(valores, punto.id);
  }
  const valor = valores?.[punto.id];
  return valor !== null && valor !== undefined && String(valor).trim() !== "";
}

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
    (punto) => !punto.requerido || contestado(punto, registro?.valores),
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
    if (punto.requerido && !contestado(punto, registro?.valores)) {
      lista.push(punto.etiqueta);
    }
  }
  return lista;
}
