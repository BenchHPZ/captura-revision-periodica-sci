// Lo propio del tipo "checklist" — la identidad global (clasificación,
// razón social, domicilio, logo) viene de web/lib/documentos/constantes.ts,
// compartida con RAG. Ver docs/decisiones.md D-22.

export const INSTRUCCION_GENERAL_CHECKLIST =
  "Marque el estado de cada elemento en la columna de la fecha en que se realiza la revisión. " +
  "Toda anomalía debe reportarse de inmediato al Coordinador de Soporte de PCI.";

/** Encabezado de CADA columna de fecha — no un bloque único como
 * CIERRE_ESTANDAR de RAG, porque aquí el encabezado varía por columna:
 * cada fecha de revisión trae su propio grupo/turno. */
export const ENCABEZADO_COLUMNA_CHECKLIST = {
  fecha: "Fecha",
  grupo: "Grupo",
};

/** Cierre de CADA columna de fecha — nombre y firma de quien revisó ESE
 * día, no un bloque de firmas único al final del documento (a diferencia
 * de CIERRE_ESTANDAR de RAG). */
export const CIERRE_COLUMNA_CHECKLIST = {
  nombre: "Nombre",
  firma: "Firma",
};

/** Cuántas columnas de fecha se generan por defecto cuando no hay un
 * ciclo abierto del que derivar los días del mes (ver documento.ts). Un
 * mes de 31 días cubre cualquier caso real sin quedar corto. */
export const DIAS_POR_DEFECTO = 31;

/** Alto de cada renglón en blanco de una bitácora, cuando el bloque no lo
 * trae. Cercano al de la fila de cierre (.chk-celda-cierre, 9mm), que sí
 * estaba dimensionada para escribir encima. Ver docs/decisiones.md D-25. */
export const ALTO_FILA_BITACORA_POR_DEFECTO_MM = 8;
