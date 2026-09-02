"use server";

import { createClient } from "@/lib/supabase/server";
import { DEPOSITO, obtenerCicloAbierto } from "@/lib/datos";
import { generarInformePptx } from "@/lib/informe/generador";

export interface InformeGenerado {
  ruta: string;
  urlDescarga: string;
  nombreArchivo: string;
}

/**
 * Genera el informe fotográfico del ciclo abierto y lo deja en el
 * depósito, junto a las fotografías (prefijo `_informe/`, mismo patrón que
 * `_entrada/` para lo que llega sin clasificar). Devuelve una URL firmada
 * de descarga en vez de mandar el archivo en la respuesta — un .pptx con
 * fotos de 221 elementos puede pesar varios cientos de MB, muy por encima
 * de lo razonable para el cuerpo de una función serverless.
 *
 * `sistemasClaves`, si se da, limita el informe a esos sistemas — para
 * reimprimir el capítulo de uno en concreto sin regenerar el ciclo
 * completo. Omitido o con los cinco sistemas, genera el informe completo.
 */
export async function generarInforme(sistemasClaves?: string[]): Promise<InformeGenerado> {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);
  if (!ciclo) throw new Error("No hay ningún ciclo abierto.");

  const { archivo, nombreArchivo } = await generarInformePptx(supabase, ciclo, sistemasClaves);
  const ruta = `${ciclo.clave}/_informe/${nombreArchivo}`;

  const { error: errorSubida } = await supabase.storage.from(DEPOSITO).upload(ruta, archivo, {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    upsert: true,
  });
  if (errorSubida) throw errorSubida;

  const { data, error: errorFirma } = await supabase.storage.from(DEPOSITO).createSignedUrl(ruta, 3600);
  if (errorFirma) throw errorFirma;

  return { ruta, urlDescarga: data.signedUrl, nombreArchivo };
}
