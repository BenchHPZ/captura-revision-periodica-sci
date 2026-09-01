#!/usr/bin/env -S npx tsx
/**
 * Sube la plantilla del informe (Plantilla_Informe.pptx) al depósito de
 * Storage, bajo `_plantillas/`, de donde el informe fotográfico la
 * descarga en cada corrida (ver docs/decisiones.md D-17). Se corre una
 * sola vez, o cuando cambie el archivo — no depende de ningún ciclo,
 * mismo criterio que cargar-formatos.ts con 'formatos'.
 *
 * OJO: la plantilla que va aquí NO es la corporativa tal cual, sino la que
 * produce scripts/preparar_plantilla_informe.py — 'Reporte sistemas.pptx'
 * más una diapositiva de 'Elemento' que sirve de molde. La corporativa no
 * trae ninguna, y pptx-automizer sólo sabe clonar diapositivas que ya
 * existen. Correr primero:
 *   python scripts/preparar_plantilla_informe.py --origen "<...>" --destino "<...>"
 *
 * Usa la llave de servicio (SUPABASE_SERVICE_ROLE_KEY), así que se ejecuta
 * sólo desde el equipo local, nunca dentro de la aplicación desplegada.
 *
 * Sin --confirmar sólo valida que el archivo exista y muestra su tamaño;
 * no se conecta a Supabase. Con --confirmar sí sube (sobrescribe si ya
 * existe).
 *
 * Uso (desde web/):
 *   npx tsx scripts/subir-plantilla-informe.ts --archivo "<ruta al .pptx>"
 *   npx tsx scripts/subir-plantilla-informe.ts --archivo "<ruta al .pptx>" --confirmar
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// web/scripts -> web -> raíz del repo
const RAIZ = path.resolve(__dirname, "..", "..");
const DEPOSITO = "evidencias";
const RUTA_DESTINO = "_plantillas/Plantilla_Informe.pptx";

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

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const confirmar = args.includes("--confirmar");
  const rutaArgumento = leerArgumento(args, "--archivo");

  if (!rutaArgumento) {
    console.error('Falta --archivo "<ruta a Plantilla_Informe.pptx>".');
    console.error("Se genera con: python scripts/preparar_plantilla_informe.py --origen <corporativa> --destino <esta>");
    return 1;
  }
  const rutaArchivo = path.resolve(rutaArgumento);
  if (!existsSync(rutaArchivo)) {
    console.error(`No existe: ${rutaArchivo}`);
    return 1;
  }

  const tamañoMB = statSync(rutaArchivo).size / 1024 / 1024;
  console.log(`Archivo: ${rutaArchivo}`);
  console.log(`Tamaño: ${tamañoMB.toFixed(2)} MB`);
  console.log(`Destino: ${DEPOSITO}/${RUTA_DESTINO}`);

  if (!confirmar) {
    console.log("\nModo de validación: no se subió nada. Agregar --confirmar para subirlo a Supabase.");
    return 0;
  }

  const env = cargarEnv(path.join(RAIZ, "web", ".env.local"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en web/.env.local.");
    return 1;
  }

  const cliente = createClient(url, llave);
  const { error } = await cliente.storage.from(DEPOSITO).upload(RUTA_DESTINO, readFileSync(rutaArchivo), {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    upsert: true,
  });
  if (error) throw error;

  console.log("\nListo. Plantilla subida.");
  return 0;
}

main()
  .then((codigo) => process.exit(codigo))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
