"use client";

import { useState } from "react";
import Link from "next/link";
import { generarInforme, type InformeGenerado } from "./actions";

type Estado =
  | { fase: "inactivo" }
  | { fase: "generando" }
  | { fase: "listo"; resultado: InformeGenerado }
  | { fase: "error"; mensaje: string };

interface Props {
  ciclo: { nombre: string };
  sistemas: { clave: string; nombre: string }[];
}

export function Informe({ ciclo, sistemas }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: "inactivo" });
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set(sistemas.map((s) => s.clave)));

  function alternar(clave: string) {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  }

  const todosSeleccionados = seleccionados.size === sistemas.length;
  const ningunoSeleccionado = seleccionados.size === 0;

  async function generar() {
    setEstado({ fase: "generando" });
    try {
      // Con todos marcados se manda undefined: el informe completo, sin
      // sufijo en el nombre — distinto de mandar la lista completa, que
      // el generador también trataría como completo pero perdería la
      // oportunidad de decirlo con un nombre de archivo más simple.
      const resultado = await generarInforme(todosSeleccionados ? undefined : [...seleccionados]);
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
      <Link href="/" className="text-sm text-vw-dsb-60 hover:text-vw-vivid-green">
        ← Tablero
      </Link>

      <h1 className="mt-2 text-2xl text-vw-deep-space">Informe fotográfico</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <p className="mt-4 max-w-2xl text-sm text-vw-dsb-60">
        Arma una diapositiva por elemento activo, agrupadas por sistema y por zona, con su
        collage fotográfico, sus observaciones y el resultado de sus puntos de revisión, sobre
        la plantilla corporativa. Con 221 elementos puede tardar varios minutos — no cierres esta
        pantalla mientras genera.
      </p>

      <div className="mt-6 max-w-md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-vw-deep-space">Sistemas a incluir</p>
          <button
            type="button"
            onClick={() => setSeleccionados(new Set(todosSeleccionados ? [] : sistemas.map((s) => s.clave)))}
            className="text-xs text-vw-vivid-green hover:underline"
          >
            {todosSeleccionados ? "Ninguno" : "Todos"}
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {sistemas.map((s) => (
            <li key={s.clave}>
              <label className="flex items-center gap-2 text-sm text-vw-deep-space">
                <input type="checkbox" checked={seleccionados.has(s.clave)} onChange={() => alternar(s.clave)} />
                {s.nombre}
              </label>
            </li>
          ))}
        </ul>
        {!todosSeleccionados && !ningunoSeleccionado && (
          <p className="mt-2 text-xs text-vw-dsb-60">
            Informe parcial: sólo lleva el capítulo de {seleccionados.size === 1 ? "este sistema" : "estos sistemas"}. La
            portada y la agenda se generan igual — la agenda es fija y siempre lista los cinco.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={generar}
        disabled={estado.fase === "generando" || ningunoSeleccionado}
        className="mt-4 bg-vw-vivid-green px-4 py-2 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
      >
        {estado.fase === "generando" ? "Generando…" : todosSeleccionados ? "Generar informe" : "Generar informe parcial"}
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
