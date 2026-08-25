"use client";

import { useState } from "react";
import { generarInforme, type InformeGenerado } from "./actions";

type Estado =
  | { fase: "inactivo" }
  | { fase: "generando" }
  | { fase: "listo"; resultado: InformeGenerado }
  | { fase: "error"; mensaje: string };

export function Informe({ ciclo }: { ciclo: { nombre: string } }) {
  const [estado, setEstado] = useState<Estado>({ fase: "inactivo" });

  async function generar() {
    setEstado({ fase: "generando" });
    try {
      const resultado = await generarInforme();
      setEstado({ fase: "listo", resultado });
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo generar el informe.",
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">Informe fotográfico</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <p className="mt-4 max-w-2xl text-sm text-vw-dsb-60">
        Arma una diapositiva por elemento activo, agrupadas por sistema y por sección, con su
        collage fotográfico, sus tres descripciones y el resultado de sus puntos de revisión, sobre
        la plantilla corporativa. Con 221 elementos puede tardar varios minutos — no cierres esta
        pantalla mientras genera.
      </p>

      <button
        type="button"
        onClick={generar}
        disabled={estado.fase === "generando"}
        className="mt-6 bg-vw-vivid-green px-4 py-2 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
      >
        {estado.fase === "generando" ? "Generando…" : "Generar informe"}
      </button>

      {estado.fase === "error" && (
        <p className="mt-4 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
          {estado.mensaje}
        </p>
      )}

      {estado.fase === "listo" && (
        <div className="mt-4 border border-vw-green/40 bg-vw-green/10 p-3 text-sm text-vw-deep-space">
          <p className="font-medium">Informe generado.</p>
          <a
            href={estado.resultado.urlDescarga}
            className="mt-2 inline-block text-vw-vivid-green hover:underline"
          >
            Descargar {estado.resultado.nombreArchivo}
          </a>
          <p className="mt-1 text-xs text-vw-dsb-60">
            También queda guardado en el depósito, en {estado.resultado.ruta}.
          </p>
        </div>
      )}
    </div>
  );
}
