// Las opciones de hoja como las ve el usuario en un <select>. Se derivan
// del catálogo de ./pagina.ts en vez de escribirse a mano en cada
// formulario (ConstructorChecklist, ConstructorFormatoRag, FormatoEditor),
// para que agregar un tamaño sea un solo cambio. Ver docs/decisiones.md D-25.
import { TAMANOS_HOJA, type ClaveTamanoHoja, type OrientacionHoja } from "./pagina";

export const OPCIONES_TAMANO_HOJA: { valor: ClaveTamanoHoja; etiqueta: string }[] = (
  Object.keys(TAMANOS_HOJA) as ClaveTamanoHoja[]
).map((clave) => ({ valor: clave, etiqueta: TAMANOS_HOJA[clave].etiqueta }));

/** "Horizontal"/"Vertical" es como lo pidió el usuario y como lo nombran
 * los diálogos de impresión; "apaisada" queda del lado del código. */
export const OPCIONES_ORIENTACION: { valor: OrientacionHoja; etiqueta: string }[] = [
  { valor: "vertical", etiqueta: "Vertical" },
  { valor: "apaisada", etiqueta: "Horizontal" },
];
