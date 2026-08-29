"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario } from "@/components/Boton";
import { CampoTexto } from "@/components/Campo";
import type { Formato } from "@/lib/tipos";
import { guardarFormato, type DatosFormatoEditable } from "./actions";

interface Props {
  formato: Formato;
}

type Estado = { fase: "editando" } | { fase: "guardando" } | { fase: "guardado" } | { fase: "error"; mensaje: string };

/**
 * Edita sólo lo que ES de este formato: nombre, periodicidad, documento
 * de referencia, revisión, instrucciones propias y qué columnas
 * opcionales lleva (D-19) — nunca `clave` (llave única y slug de la URL
 * de la vieja /rag/[formato], ver docs/decisiones.md D-15 §7.5) ni los
 * campos globales (clasificación, razón social, domicilio, instrucción
 * general, cierre), que ni siquiera llegan aquí porque viven en código
 * (lib/rag/constantes.ts). El sistema ya no se elige aquí: esta pantalla
 * vive dentro de /sistemas/[clave], así que la asociación es implícita.
 */
export function FormatoEditor({ formato }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(formato.nombre);
  const [periodicidad, setPeriodicidad] = useState(formato.periodicidad);
  const [documentoReferencia, setDocumentoReferencia] = useState(formato.documento_referencia);
  const [revision, setRevision] = useState(formato.revision ?? "");
  const [instruccionesTexto, setInstruccionesTexto] = useState(formato.instrucciones.join("\n"));
  const [ubicacion, setUbicacion] = useState(formato.columnas.ubicacion);
  const [referencia, setReferencia] = useState(formato.columnas.referencia);
  const [estado, setEstado] = useState<Estado>({ fase: "editando" });

  async function guardar() {
    setEstado({ fase: "guardando" });
    try {
      const datos: DatosFormatoEditable = {
        nombre: nombre.trim(),
        periodicidad: periodicidad.trim(),
        documento_referencia: documentoReferencia.trim(),
        revision: revision.trim() || null,
        instrucciones: instruccionesTexto
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        columnas: { ubicacion, referencia },
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
        Editar formato ({formato.clave})
        <span className="text-vw-dsb-60">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="border-t border-vw-dsb-20 p-4">
          <p className="text-xs text-vw-dsb-60">
            La clasificación, razón social, domicilio, la instrucción general y el bloque de cierre
            son iguales en los cinco RAG y no se editan aquí. Los elementos y los puntos de revisión
            se editan abajo, en esta misma pantalla.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoTexto etiqueta="Nombre" valor={nombre} onChange={setNombre} />
            <CampoTexto etiqueta="Periodicidad" valor={periodicidad} onChange={setPeriodicidad} />
            <CampoTexto etiqueta="Documento de referencia" valor={documentoReferencia} onChange={setDocumentoReferencia} />
            <CampoTexto etiqueta="Revisión" valor={revision} onChange={setRevision} />
          </div>

          <div className="mt-3">
            <p className="text-xs text-vw-dsb-60">Columnas opcionales del documento (D-19)</p>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-vw-deep-space">
                <input type="checkbox" checked={ubicacion} onChange={(e) => setUbicacion(e.target.checked)} />
                Ubicación
              </label>
              <label className="flex items-center gap-2 text-sm text-vw-deep-space">
                <input type="checkbox" checked={referencia} onChange={(e) => setReferencia(e.target.checked)} />
                Referencia
              </label>
            </div>
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

          {estado.fase === "error" && <div className="mt-3"><Aviso tipo="error">{estado.mensaje}</Aviso></div>}
          {estado.fase === "guardado" && <div className="mt-3"><Aviso tipo="exito">Guardado.</Aviso></div>}

          <div className="mt-3">
            <BotonPrimario onClick={guardar} disabled={estado.fase === "guardando"}>
              {estado.fase === "guardando" ? "Guardando…" : "Guardar cambios"}
            </BotonPrimario>
          </div>
        </div>
      )}
    </div>
  );
}
