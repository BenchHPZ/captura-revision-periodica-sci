"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Formato, Sistema } from "@/lib/tipos";
import { guardarFormato, type DatosFormatoEditable } from "../actions";

interface Props {
  formato: Formato;
  sistemas: Sistema[];
}

type Estado =
  | { fase: "editando" }
  | { fase: "guardando" }
  | { fase: "guardado" }
  | { fase: "error"; mensaje: string };

/**
 * Edita sólo lo que ES de este formato: nombre, periodicidad, sistema,
 * documento de referencia, revisión e instrucciones propias — nunca
 * `clave` (llave única y slug de la URL) ni los campos globales
 * (clasificación, razón social, domicilio, instrucción general, cierre),
 * que ni siquiera llegan a esta pantalla porque viven en código
 * (lib/rag/constantes.ts, ver docs/decisiones.md D-15 §7.1). Tampoco
 * toca `elementos` ni `plantillas` — eso sigue en /catalogo.
 */
export function FormatoEditor({ formato, sistemas }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(formato.nombre);
  const [periodicidad, setPeriodicidad] = useState(formato.periodicidad);
  const [sistemaId, setSistemaId] = useState<string | null>(formato.sistema_id);
  const [documentoReferencia, setDocumentoReferencia] = useState(formato.documento_referencia);
  const [revision, setRevision] = useState(formato.revision ?? "");
  const [instruccionesTexto, setInstruccionesTexto] = useState(formato.instrucciones.join("\n"));
  const [estado, setEstado] = useState<Estado>({ fase: "editando" });

  async function guardar() {
    setEstado({ fase: "guardando" });
    try {
      const datos: DatosFormatoEditable = {
        nombre: nombre.trim(),
        periodicidad: periodicidad.trim(),
        sistema_id: sistemaId,
        documento_referencia: documentoReferencia.trim(),
        revision: revision.trim() || null,
        instrucciones: instruccionesTexto
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      };
      await guardarFormato(formato.id, datos);
      setEstado({ fase: "guardado" });
      router.refresh();
    } catch (error) {
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo guardar." });
    }
  }

  return (
    <div className="mb-4 border border-vw-dsb-20">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-vw-deep-space transition hover:bg-vw-vg-10"
      >
        Editar formato
        <span className="text-vw-dsb-60">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="border-t border-vw-dsb-20 p-4">
          <p className="text-xs text-vw-dsb-60">
            Sólo lo particular de este formato. La clasificación, razón social, domicilio, la
            instrucción general y el bloque de cierre son iguales en los cinco RAG y no se editan
            aquí. Los elementos y los puntos de revisión se editan en{" "}
            <Link href="/catalogo" className="text-vw-vivid-green hover:underline">
              Catálogo
            </Link>
            .
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Clave (no editable)">
              <input
                value={formato.clave}
                disabled
                className="w-full border border-vw-dsb-20 bg-vw-dsb-10 px-2 py-1.5 text-sm text-vw-dsb-60"
              />
            </Campo>
            <Campo etiqueta="Nombre">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              />
            </Campo>
            <Campo etiqueta="Periodicidad">
              <input
                value={periodicidad}
                onChange={(e) => setPeriodicidad(e.target.value)}
                className="w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              />
            </Campo>
            <Campo etiqueta="Sistema">
              <select
                value={sistemaId ?? ""}
                onChange={(e) => setSistemaId(e.target.value || null)}
                className="w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              >
                <option value="">(ninguno)</option>
                {sistemas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Documento de referencia">
              <input
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                className="w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              />
            </Campo>
            <Campo etiqueta="Revisión">
              <input
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              />
            </Campo>
          </div>

          <div className="mt-3">
            <span className="block text-xs text-vw-dsb-60">Instrucciones propias de este formato (una por línea)</span>
            <textarea
              value={instruccionesTexto}
              onChange={(e) => setInstruccionesTexto(e.target.value)}
              rows={3}
              placeholder="p. ej. Tipo de hidrante: P = Pie, G = Gabinete."
              className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
            />
          </div>

          {estado.fase === "error" && (
            <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
              {estado.mensaje}
            </p>
          )}
          {estado.fase === "guardado" && (
            <p className="mt-3 border border-vw-green/40 bg-vw-green/10 px-3 py-2 text-sm text-vw-deep-space">
              Guardado.
            </p>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={estado.fase === "guardando"}
            className="mt-3 bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
          >
            {estado.fase === "guardando" ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="text-sm text-vw-deep-space">
      <span className="block text-xs text-vw-dsb-60">{etiqueta}</span>
      {children}
    </label>
  );
}
