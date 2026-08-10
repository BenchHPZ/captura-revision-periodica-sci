// Construye la ruta de un objeto en el depósito 'evidencias'. Ver
// docs/modelo-de-datos.md §5:  {ciclo}/{sistema}/{codigo}/{momento}_{NN}.jpg
//
// El código de un elemento puede traer espacios (p. ej. 'V- BY PASS 01',
// heredado tal cual del RAG de origen) — se sustituyen aquí sólo para la
// ruta del archivo; el campo `elementos.codigo` en la base no se toca.
//
// Vive fuera de lib/datos.ts a propósito: ese módulo está marcado
// "server-only" (correcto, usa el cliente con la llave de servicio) y el
// navegador también necesita el nombre del depósito para subir directo
// (docs/decisiones.md D-06). Importar algo de un módulo server-only desde
// un componente de cliente rompe el build, así que esta constante y
// rutaFoto() quedan en un archivo sin esa marca.
export const DEPOSITO = "evidencias";

function segmento(valor: string): string {
  return valor.trim().replace(/[\s/]+/g, "-");
}

export function rutaFoto(
  cicloClave: string,
  sistemaClave: string,
  codigoElemento: string,
  momento: string,
  orden: number,
): string {
  const numero = String(orden).padStart(2, "0");
  return `${cicloClave}/${sistemaClave}/${segmento(codigoElemento)}/${momento}_${numero}.jpg`;
}
