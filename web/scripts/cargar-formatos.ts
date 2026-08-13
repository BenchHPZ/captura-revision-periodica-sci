#!/usr/bin/env -S npx tsx
/**
 * Carga supabase/seed/formatos_mensuales.json a la tabla 'formatos'.
 *
 * A diferencia de scripts/cargar_catalogo.py, esto no depende de ningún
 * ciclo (ver docs/decisiones.md D-15): 'formatos' declara la identidad y
 * la imagen de un RAG, estable entre meses. Se corre una sola vez, o
 * cuando cambie el documento oficial de un formato — no cada mes.
 *
 * Usa la llave de servicio (SUPABASE_SERVICE_ROLE_KEY), así que se
 * ejecuta sólo desde el equipo local, nunca dentro de la aplicación
 * desplegada — mismo principio que cargar_catalogo.py.
 *
 * Sin --confirmar sólo valida el archivo y muestra un resumen; no se
 * conecta a Supabase. Con --confirmar sí escribe (upsert por 'clave').
 *
 * Uso (desde web/):
 *   npx tsx scripts/cargar-formatos.ts
 *   npx tsx scripts/cargar-formatos.ts --confirmar
 *   npx tsx scripts/cargar-formatos.ts --archivo ../supabase/seed/formatos_mensuales.json --confirmar
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// web/scripts -> web -> raíz del repo
const RAIZ = path.resolve(__dirname, "..", "..");

/**
 * Sólo lo PARTICULAR de cada formato. Lo que debe ser idéntico en los
 * cinco (clasificación, razón social, domicilio, instrucción general,
 * cierre) no está en este JSON — vive en código, en
 * web/lib/rag/constantes.ts (ver docs/decisiones.md D-15 §7.1).
 */
interface FormatoJSON {
  clave: string;
  nombre: string;
  periodicidad: string;
  sistema?: string | null;
  documento_referencia: string;
  revision?: string | null;
  instrucciones: string[];
  notas?: string | null;
}

/**
 * Parser mínimo de .env: no se agrega la dependencia 'dotenv' sólo para
 * esto. Next.js carga web/.env.local cuando corre por su cuenta (next
 * dev/build), pero no cuando tsx ejecuta este script suelto — hay que
 * leerlo a mano, igual que cargar_catalogo.py hace con python-dotenv.
 */
function cargarEnv(ruta: string): Record<string, string> {
  if (!existsSync(ruta)) return {};
  const env: Record<string, string> = {};
  for (const lineaCruda of readFileSync(ruta, "utf-8").split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith("#")) continue;
    const igual = linea.indexOf("=");
    if (igual === -1) continue;
    const clave = linea.slice(0, igual).trim();
    let valor = linea.slice(igual + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    env[clave] = valor;
  }
  return env;
}

function leerArgumento(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  return i !== -1 ? args[i + 1] : undefined;
}

async function cargar(url: string, llave: string, formatos: FormatoJSON[]): Promise<void> {
  const cliente = createClient(url, llave);
  console.log(`\nConectado. Cargando ${formatos.length} formato(s)...`);

  const { data: sistemas, error: errorSistemas } = await cliente.from("sistemas").select("id, clave");
  if (errorSistemas) throw errorSistemas;
  const idPorClave = new Map<string, string>((sistemas ?? []).map((s) => [s.clave as string, s.id as string]));

  const filas = formatos.map((f) => {
    let sistemaId: string | null = null;
    if (f.sistema) {
      sistemaId = idPorClave.get(f.sistema) ?? null;
      if (!sistemaId) {
        console.warn(
          `  [!!] '${f.clave}': el sistema '${f.sistema}' no existe en la tabla 'sistemas'; se carga con sistema_id = null.`,
        );
      }
    }
    return {
      clave: f.clave,
      nombre: f.nombre,
      periodicidad: f.periodicidad,
      sistema_id: sistemaId,
      documento_referencia: f.documento_referencia,
      revision: f.revision ?? null,
      instrucciones: f.instrucciones ?? [],
      notas: f.notas ?? null,
    };
  });

  const { error } = await cliente.from("formatos").upsert(filas, { onConflict: "clave" });
  if (error) throw error;

  console.log(`\nListo. ${filas.length} formato(s) cargado(s)/actualizado(s) (upsert por 'clave').`);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const confirmar = args.includes("--confirmar");
  const rutaArgumento = leerArgumento(args, "--archivo");
  const rutaArchivo = rutaArgumento
    ? path.resolve(rutaArgumento)
    : path.join(RAIZ, "supabase", "seed", "formatos_mensuales.json");

  if (!existsSync(rutaArchivo)) {
    console.error(`No existe: ${rutaArchivo}`);
    return 1;
  }

  const datos = JSON.parse(readFileSync(rutaArchivo, "utf-8")) as { formatos?: FormatoJSON[] };
  const formatos = datos.formatos ?? [];
  console.log(`Archivo: ${rutaArchivo}`);
  console.log(`Formatos encontrados: ${formatos.length}`);
  for (const f of formatos) {
    console.log(`  - ${f.clave} — ${f.nombre} (${f.periodicidad}) -> sistema: ${f.sistema ?? "(ninguno)"}`);
  }

  if (!confirmar) {
    console.log("\nModo de validación: no se escribió nada. Agregar --confirmar para cargar a Supabase.");
    return 0;
  }

  const rutaEnv = path.join(RAIZ, "web", ".env.local");
  const env = cargarEnv(rutaEnv);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error(`Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ${rutaEnv}.`);
    return 1;
  }

  await cargar(url, llave, formatos);
  return 0;
}

main()
  .then((codigo) => process.exit(codigo))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
