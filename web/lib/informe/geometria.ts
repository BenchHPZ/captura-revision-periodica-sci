// Geometría, tipografía y color del informe fotográfico, tomados del
// entregable real (Informe_Reporte_Marzo2026.pptx) y de la plantilla
// corporativa 'Reporte sistemas.pptx', layout 'Elemento' — medidos con
// python-pptx, no inventados.
//
// pptx-automizer no puede escribir dentro de un placeholder vacío (no hay
// contenido previo que "modificar": ver docs/decisiones.md D-17), así que
// cada diapositiva se arma clonando el molde y dibujando encima con
// PptxGenJS, en las mismas posiciones que ocupan sus placeholders.
// Unidades en pulgadas (PptxGenJS trabaja en pulgadas).

/** La plantilla del informe: 'Reporte sistemas.pptx' más una diapositiva
 * de 'Elemento' que sirve de molde, generada por
 * scripts/preparar_plantilla_informe.py — la corporativa no trae ninguna,
 * y pptx-automizer sólo sabe clonar diapositivas existentes. */
export const NOMBRE_PLANTILLA_ARCHIVO = "Plantilla_Informe.pptx";

/** Diapositivas de la plantilla, 1-indexadas como las numera
 * pptx-automizer. Los cinco divisores (4 a 8) ya vienen redactados con su
 * '– RAG 2.x' y en el mismo orden que `sistemas.orden`. */
export const SLIDE_INTRO = 1;
export const SLIDE_PORTADA = 2;
export const SLIDE_AGENDA = 3;
export const PRIMER_DIVISOR = 4;
export const TOTAL_DIVISORES = 5;
/** El molde que se clona una vez por elemento. */
export const SLIDE_MOLDE_ELEMENTO = 9;

// ------------------------------------------- datos del grupo que firma
//
// La plantilla corporativa viene con estos valores sin llenar ("KSU XXX",
// "KSU XX") y con el grupo del deck de origen. No salen de la base: son
// del área que entrega el informe, así que viven aquí hasta que haga
// falta cambiarlos por ciclo.

export const GRUPO = "Grupo 1";
export const KSU = "KSU 1";

/** Nombre de la forma del subtítulo de la portada, para ponerle el grupo
 * y el ciclo en curso. */
export const PORTADA_SUBTITULO = "Subtitle 2";
/** La forma con el "KSU XXX" de la portada. */
export const PORTADA_KSU = "Text Placeholder 3";

/** La fecha y el pie, que la plantilla trae del ciclo con el que se armó
 * ("03.2026", "KSU XX"). La agenda y los divisores nombran esas formas
 * distinto — la agenda conserva el nombre alemán del deck original. */
export const FECHA_AGENDA = "Datumsplatzhalter 3";
export const FECHA_DIVISOR = "Date Placeholder 5";
export const PIE_AGENDA = "Fußzeilenplatzhalter 4";
export const PIE_DIVISOR = "Footer Placeholder 6";

/** El pie corporativo, ya con el KSU resuelto. Doble espacio tras cada
 * barra, como en la plantilla. */
export const PIE_TEXTO = `Protección Contra Incendios |  Reporte mensual inspección SCI |  ${KSU}`;

// --------------------------------------------------------------- cajas
//
// La columna izquierda lleva tres bloques, cada uno con su subtítulo, en
// posiciones FIJAS: así todas las diapositivas se ven iguales aunque su
// contenido varíe. Lo único que cambia de alto es la tabla (según cuántos
// puntos tenga el sistema) y el texto de observaciones, que se encoge si
// hace falta en vez de invadir el bloque de abajo.

const COLUMNA_X = 0.613;
const COLUMNA_W = 5.132;
/** Hasta dónde puede llegar el contenido sin salirse del margen: la banda
 * del pie del layout empieza en 7.196". */
export const LIMITE_INFERIOR = 7.02;

/** Título del elemento — el único texto de 28pt. */
export const TITULO = { x: COLUMNA_X, y: 0.705, w: COLUMNA_W, h: 0.424 };

/** Los tres subtítulos, en el estilo que la plantilla reserva para ellos. */
export const SUB_TABLA = { x: COLUMNA_X, y: 1.30, w: COLUMNA_W, h: 0.30 };
export const SUB_OBSERVACIONES = { x: COLUMNA_X, y: 3.42, w: COLUMNA_W, h: 0.30 };
export const SUB_DATOS = { x: COLUMNA_X, y: 4.92, w: COLUMNA_W, h: 0.30 };

/** La tabla de características, justo debajo del título. */
export const TABLA = {
  x: COLUMNA_X,
  y: 1.70,
  w: COLUMNA_W,
  /** Piso: más abajo chocaría con el subtítulo de observaciones. */
  yMax: SUB_OBSERVACIONES.y - 0.08,
  /** Reparto de las dos columnas: la respuesta sólo lleva dos letras. */
  colW: [4.0, 1.132] as [number, number],
  altoRenglon: 0.24,
};

/** Los comentarios de campo. Alto fijo; el texto se encoge si no cabe. */
export const OBSERVACIONES = { x: COLUMNA_X, y: 3.80, w: COLUMNA_W, h: 1.02 };

/** Los datos del elemento: cantidad fija de renglones, anclados a la
 * parte inferior de la diapositiva sin salirse del margen. */
export const DATOS = { x: COLUMNA_X, y: 5.32, w: COLUMNA_W, h: LIMITE_INFERIOR - 5.32 };

/** El collage ocupa la mitad derecha, casi de borde a borde. */
export const IMAGEN = { x: 6.142, y: 0.08, w: 7.192, h: 6.978 };

// ---------------------------------------------------------- tipografía

/** Las mismas que usa el entregable real. No se embeben: son un activo
 * con licencia restringida (ver web/tailwind.config.ts). Si no están
 * instaladas, PowerPoint sustituye — igual que hoy. */
export const FUENTE_TITULO = "The Group HEAD Light";
export const FUENTE_TEXTO = "The Group TEXT";

export const PT_TITULO = 28;
/** El estilo que la plantilla reserva para subtítulos, y que aquí marca
 * cada uno de los tres bloques de la columna. */
export const PT_SUBTITULO = 18;
export const PT_OBSERVACIONES = 11;
export const PT_DATOS = 12;
export const PT_TABLA = 9;

export const ETIQUETA_SUB_TABLA = "Tabla de características";
export const ETIQUETA_SUB_OBSERVACIONES = "Observaciones";
export const ETIQUETA_SUB_DATOS = "Datos del sistema";

// --------------------------------------------------------------- color
//
// El fondo del layout 'Elemento' es Deep Space Blue: el master mapea
// `bg2 → dk2 = #002733`. TODO el texto va claro sobre ese fondo — escribir
// en #002733, como hacía la primera versión, lo dejaba invisible.

export const BLANCO = "FFFFFF";
/** Vivid Green 40%: el tinte de marca para el bloque de descripción. */
export const CONDICION_COLOR = "99D1CD";
/** Electric Neon. La marca lo reserva para fondo oscuro — aquí sí aplica. */
export const RESPUESTA_SI = "C2FE06";
export const RESPUESTA_NO = "DA0C1F";
/** DSB 40%, legible sobre el fondo oscuro. */
export const RESPUESTA_NA = "99A9AD";
/** DSB 60% para la regla de la tabla. */
export const REGLA_TABLA = "667D85";
