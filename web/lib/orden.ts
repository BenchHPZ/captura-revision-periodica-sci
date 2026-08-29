// Orden de recorrido de los elementos. Función pura, sin dependencias de
// Next ni de Supabase — mismo criterio que lib/estado.ts y lib/rag/*: la
// usan tanto el documento RAG como el informe fotográfico, para que los
// dos presenten los elementos en el mismo lugar relativo (ver
// docs/decisiones.md D-20).
//
// Dentro de una zona, el orden por defecto es ubicación (alfabético
// natural, para que "H-2" quede antes que "H-10") y luego nombre; las
// ubicaciones vacías van al final. Un elemento con 'ordenAnclado' se
// saca de esa regla: los anclados van primero, ordenados entre ellos por
// su propio valor, y el resto seguido por delante. Es una prioridad, no
// una posición entre huecos — más simple, y no había ningún elemento
// anclado que forzara resolver el caso de "intercalar en la lista ya
// ordenada" en esta primera versión.

export interface ElementoParaOrdenar {
  id: string;
  ubicacion: string | null;
  nombre: string;
  ordenAnclado: number | null;
}

export interface ZonaParaOrdenar {
  nombre: string;
  /** zonas.orden, ya resuelto para este grupo. null = zona sin catálogo
   * (o "Sin zona") — va al final, alfabético. */
  orden: number | null;
}

export function compararElementos(a: ElementoParaOrdenar, b: ElementoParaOrdenar): number {
  if (a.ordenAnclado !== null && b.ordenAnclado !== null) return a.ordenAnclado - b.ordenAnclado;
  if (a.ordenAnclado !== null) return -1;
  if (b.ordenAnclado !== null) return 1;

  const ua = a.ubicacion?.trim() || null;
  const ub = b.ubicacion?.trim() || null;
  if (ua && ub) {
    const cmp = ua.localeCompare(ub, "es", { numeric: true });
    if (cmp !== 0) return cmp;
  } else if (ua) {
    return -1;
  } else if (ub) {
    return 1;
  }
  return a.nombre.localeCompare(b.nombre, "es", { numeric: true });
}

/** Ordena los elementos de una misma zona. No muta el arreglo recibido. */
export function ordenarDentroDeZona<T extends ElementoParaOrdenar>(elementos: T[]): T[] {
  return [...elementos].sort(compararElementos);
}

/** Ordena las zonas entre sí: por 'orden' cuando se conoce (las nulas al
 * final), alfabético como respaldo. */
export function compararZonas(a: ZonaParaOrdenar, b: ZonaParaOrdenar): number {
  if (a.orden !== null && b.orden !== null && a.orden !== b.orden) return a.orden - b.orden;
  if (a.orden !== null && b.orden === null) return -1;
  if (a.orden === null && b.orden !== null) return 1;
  return a.nombre.localeCompare(b.nombre, "es");
}
