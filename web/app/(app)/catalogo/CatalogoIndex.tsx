"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { descargar } from "@/lib/descargas";
import {
  confirmarImportacion,
  previsualizarImportacion,
  type CatalogoImportado,
  type ResultadoImportacion,
} from "./actions";

interface SistemaResumen {
  clave: string;
  nombre: string;
  rag: string | null;
  activos: number;
  inactivos: number;
}

interface Props {
  ciclo: { id: string; clave: string; nombre: string };
  sistemas: SistemaResumen[];
  catalogoCompleto: unknown;
  plantillasCompletas: unknown;
}

type EstadoImportacion =
  | { fase: "inactivo" }
  | { fase: "error"; mensaje: string }
  | { fase: "vista_previa"; catalogo: CatalogoImportado; resultado: ResultadoImportacion }
  | { fase: "aplicando"; catalogo: CatalogoImportado }
  | { fase: "aplicado"; resultado: ResultadoImportacion };

export function CatalogoIndex({ ciclo, sistemas, catalogoCompleto, plantillasCompletas }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<EstadoImportacion>({ fase: "inactivo" });

  function exportarCatalogo() {
    descargar(`catalogo_${ciclo.clave}.json`, JSON.stringify(catalogoCompleto, null, 2), "application/json;charset=utf-8");
  }

  function exportarPlantillas() {
    descargar(
      `plantillas_${ciclo.clave}.json`,
      JSON.stringify(plantillasCompletas, null, 2),
      "application/json;charset=utf-8",
    );
  }

  async function elegirArchivo(lista: FileList | null) {
    const archivo = lista?.[0];
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const catalogo = JSON.parse(texto) as CatalogoImportado;
      const resultado = await previsualizarImportacion(ciclo.id, catalogo);
      setEstado({ fase: "vista_previa", catalogo, resultado });
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo leer el archivo.",
      });
    }
  }

  async function confirmar() {
    if (estado.fase !== "vista_previa") return;
    setEstado({ fase: "aplicando", catalogo: estado.catalogo });
    try {
      const resultado = await confirmarImportacion(ciclo.id, estado.catalogo);
      setEstado({ fase: "aplicado", resultado });
      router.refresh();
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo aplicar la importación.",
      });
    }
  }

  function cancelar() {
    setEstado({ fase: "inactivo" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">Catálogo</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <div className="mt-6 space-y-3">
        {sistemas.map((s) => (
          <Link
            key={s.clave}
            href={`/catalogo/${s.clave}`}
            className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-vw-deep-space">{s.nombre}</span>
              {s.rag && <span className="text-xs text-vw-dsb-60">{s.rag}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-vw-dsb-60">
              <span>
                <span className="font-medium text-vw-deep-space">{s.activos}</span> activos
              </span>
              {s.inactivos > 0 && (
                <span>
                  <span className="font-medium text-vw-deep-space">{s.inactivos}</span> inactivos
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-8 border border-vw-dsb-20 p-4">
        <h2 className="text-lg font-medium text-vw-deep-space">Importar y exportar</h2>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Para cambios extensos: exporta el catálogo, edítalo fuera de la aplicación y vuelve a
          importarlo. La conciliación es por sistema y código — ver docs/flujos-de-usuario.md Flujo 5.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarCatalogo}
            className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green"
          >
            Exportar catálogo (JSON)
          </button>
          <button
            type="button"
            onClick={exportarPlantillas}
            className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green"
          >
            Exportar plantillas (JSON)
          </button>
          <label className="cursor-pointer border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
            Importar catálogo…
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void elegirArchivo(e.target.files)}
            />
          </label>
        </div>

        {estado.fase === "error" && (
          <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
            {estado.mensaje}
          </p>
        )}

        {(estado.fase === "vista_previa" || estado.fase === "aplicando") && (
          <div className="mt-3 border border-vw-amber/40 bg-vw-amber/10 p-3 text-sm text-vw-deep-space">
            <p className="font-medium">Vista previa — todavía no se guarda nada.</p>
            <ResumenTabla resumen={estado.fase === "vista_previa" ? estado.resultado.resumen : []} />
            {estado.fase === "vista_previa" &&
              estado.resultado.advertencias.map((a) => (
                <p key={a} className="mt-2 text-vw-red">
                  {a}
                </p>
              ))}
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={confirmar}
                disabled={estado.fase === "aplicando"}
                className="bg-vw-vivid-green px-3 py-1.5 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
              >
                {estado.fase === "aplicando" ? "Aplicando…" : "Confirmar importación"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={estado.fase === "aplicando"}
                className="text-vw-dsb-60 hover:text-vw-deep-space"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {estado.fase === "aplicado" && (
          <div className="mt-3 border border-vw-green/40 bg-vw-green/10 p-3 text-sm text-vw-deep-space">
            <p className="font-medium">Importación aplicada.</p>
            <ResumenTabla resumen={estado.resultado.resumen} />
            <button type="button" onClick={cancelar} className="mt-2 text-vw-vivid-green hover:underline">
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ResumenTabla({ resumen }: { resumen: { sistema: string; altas: number; actualizaciones: number; bajas: number }[] }) {
  if (resumen.length === 0) return <p className="mt-2 text-vw-dsb-60">Nada que conciliar.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {resumen.map((r) => (
        <li key={r.sistema}>
          <span className="font-medium">{r.sistema}</span>: {r.altas} alta{r.altas === 1 ? "" : "s"},{" "}
          {r.actualizaciones} actualizaci{r.actualizaciones === 1 ? "ón" : "ones"}, {r.bajas} baja
          {r.bajas === 1 ? "" : "s"}
        </li>
      ))}
    </ul>
  );
}
