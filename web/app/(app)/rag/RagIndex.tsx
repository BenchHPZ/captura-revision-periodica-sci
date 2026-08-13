"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claveASlug } from "@/lib/rag/documento";
import type { Formato } from "@/lib/tipos";
import {
  confirmarFormatos,
  previsualizarFormatos,
  type FormatosImportados,
  type ResumenFormatos,
} from "./actions";

interface Props {
  ciclo: { nombre: string } | null;
  formatos: Formato[];
  nombrePorSistemaId: Record<string, string>;
}

type EstadoCarga =
  | { fase: "inactivo" }
  | { fase: "error"; mensaje: string }
  | { fase: "vista_previa"; datos: FormatosImportados; resultado: ResumenFormatos }
  | { fase: "aplicando"; datos: FormatosImportados }
  | { fase: "aplicado"; resultado: ResumenFormatos };

export function RagIndex({ ciclo, formatos, nombrePorSistemaId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<EstadoCarga>({ fase: "inactivo" });

  async function elegirArchivo(lista: FileList | null) {
    const archivo = lista?.[0];
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as FormatosImportados;
      const resultado = await previsualizarFormatos(datos);
      setEstado({ fase: "vista_previa", datos, resultado });
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo leer el archivo.",
      });
    }
  }

  async function confirmar() {
    if (estado.fase !== "vista_previa") return;
    setEstado({ fase: "aplicando", datos: estado.datos });
    try {
      const resultado = await confirmarFormatos(estado.datos);
      setEstado({ fase: "aplicado", resultado });
      router.refresh();
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo cargar el archivo.",
      });
    }
  }

  function cancelar() {
    setEstado({ fase: "inactivo" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">Formatos RAG</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">
        {ciclo ? ciclo.nombre : "Sin ciclo abierto — los formatos se pueden ver e imprimir en blanco."}
      </p>

      <div className="mt-6 divide-y divide-vw-dsb-10 border border-vw-dsb-10">
        {formatos.map((f) => (
          <Link
            key={f.id}
            href={`/rag/${claveASlug(f.clave)}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-vw-vg-10"
          >
            <div>
              <p className="font-medium text-vw-deep-space">
                {f.clave} — {f.nombre}
              </p>
              <p className="mt-0.5 text-sm capitalize text-vw-dsb-60">
                {f.periodicidad}
                {f.sistema_id && nombrePorSistemaId[f.sistema_id] ? ` · ${nombrePorSistemaId[f.sistema_id]}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-vw-dsb-60">→</span>
          </Link>
        ))}
        {formatos.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-vw-dsb-60">Todavía no hay formatos cargados.</p>
        )}
      </div>

      <section className="mt-8 border border-vw-dsb-20 p-4">
        <h2 className="text-lg font-medium text-vw-deep-space">Cargar formatos</h2>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Sube <code>formatos_mensuales.json</code> (o una versión editada): identidad, encabezado,
          instrucciones y cierre de cada RAG. No toca <code>elementos</code> ni <code>plantillas</code>
          — eso sigue en <Link href="/catalogo" className="text-vw-vivid-green hover:underline">Catálogo</Link>.
        </p>

        <label className="mt-3 inline-block cursor-pointer border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
          Cargar formatos (JSON)…
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void elegirArchivo(e.target.files)}
          />
        </label>

        {estado.fase === "error" && (
          <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
            {estado.mensaje}
          </p>
        )}

        {(estado.fase === "vista_previa" || estado.fase === "aplicando") && (
          <div className="mt-3 border border-vw-amber/40 bg-vw-amber/10 p-3 text-sm text-vw-deep-space">
            <p className="font-medium">Vista previa — todavía no se guarda nada.</p>
            {estado.fase === "vista_previa" && <ResumenTexto resultado={estado.resultado} />}
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={confirmar}
                disabled={estado.fase === "aplicando"}
                className="bg-vw-vivid-green px-3 py-1.5 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
              >
                {estado.fase === "aplicando" ? "Cargando…" : "Confirmar carga"}
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
            <p className="font-medium">Formatos cargados.</p>
            <ResumenTexto resultado={estado.resultado} />
            <button type="button" onClick={cancelar} className="mt-2 text-vw-vivid-green hover:underline">
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ResumenTexto({ resultado }: { resultado: ResumenFormatos }) {
  return (
    <>
      <p className="mt-2">
        <span className="font-medium">{resultado.altas}</span> alta{resultado.altas === 1 ? "" : "s"},{" "}
        <span className="font-medium">{resultado.actualizaciones}</span> actualizaci
        {resultado.actualizaciones === 1 ? "ón" : "ones"}.
      </p>
      {resultado.advertencias.map((a) => (
        <p key={a} className="mt-2 text-vw-red">
          {a}
        </p>
      ))}
    </>
  );
}
