"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/Boton";
import { CampoTexto } from "@/components/Campo";
import type { Zona } from "@/lib/tipos";
import { actualizarZona, crearZona, type DatosZona } from "./actions";

interface Props {
  zonas: Zona[];
}

const VACIO: DatosZona & { clave: string } = { clave: "", nombre: "", descripcion: "", orden: 0, activo: true };

/** Catálogo único de la planta (docs/decisiones.md D-18) — antes sólo se
 * sembraba por migración. 'nombre' es lo que imprime el documento RAG;
 * 'descripcion' es contexto sólo para pantalla. */
export function PanelZonas({ zonas: zonasIniciales }: Props) {
  const [zonas, setZonas] = useState<Zona[]>(zonasIniciales);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function alCrear(clave: string, datos: DatosZona) {
    if (zonas.some((z) => z.clave === clave)) {
      setMensaje(`Ya existe una zona con la clave "${clave}".`);
      return;
    }
    try {
      await crearZona(clave, datos);
      setZonas((prev) => [...prev, { id: crypto.randomUUID(), clave, ...datos }].sort((a, b) => a.orden - b.orden));
      setAgregando(false);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo crear la zona.");
    }
  }

  async function alActualizar(zona: Zona, datos: DatosZona) {
    try {
      await actualizarZona(zona.id, datos);
      setZonas((prev) => prev.map((z) => (z.id === zona.id ? { ...z, ...datos } : z)).sort((a, b) => a.orden - b.orden));
      setEditandoId(null);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar la zona.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-vw-dsb-60">
          Compartido por toda la planta: un elemento de cualquier sistema puede usar la misma zona.
        </p>
        <BotonPrimario onClick={() => setAgregando((v) => !v)}>{agregando ? "Cancelar" : "+ Agregar zona"}</BotonPrimario>
      </div>

      {mensaje && <div className="mt-3"><Aviso tipo="error">{mensaje}</Aviso></div>}

      {agregando && (
        <div className="mt-3 border border-vw-dsb-20 p-3">
          <FormularioZona inicial={VACIO} onGuardar={(clave, datos) => alCrear(clave, datos)} onCancelar={() => setAgregando(false)} />
        </div>
      )}

      <ul className="mt-4 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
        {zonas.map((z) => (
          <li key={z.id}>
            {editandoId === z.id ? (
              <div className="p-3">
                <FormularioZona
                  inicial={{ clave: z.clave, nombre: z.nombre, descripcion: z.descripcion ?? "", orden: z.orden, activo: z.activo }}
                  claveFija
                  onGuardar={(_clave, datos) => alActualizar(z, datos)}
                  onCancelar={() => setEditandoId(null)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditandoId(z.id)}
                className={`flex w-full items-center justify-between gap-3 px-1 py-3 text-left ${z.activo ? "" : "opacity-50"}`}
              >
                <div>
                  <p className="font-medium text-vw-deep-space">{z.nombre}</p>
                  <p className="text-sm text-vw-dsb-60">
                    {z.descripcion || z.clave} · orden {z.orden}
                    {!z.activo && " · inactiva"}
                  </p>
                </div>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormularioZona({
  inicial,
  claveFija,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosZona & { clave: string };
  claveFija?: boolean;
  onGuardar: (clave: string, datos: DatosZona) => void | Promise<void>;
  onCancelar: () => void;
}) {
  const [clave, setClave] = useState(inicial.clave);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion ?? "");
  const [orden, setOrden] = useState(inicial.orden);
  const [activo, setActivo] = useState(inicial.activo);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await onGuardar(clave.trim(), {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        orden,
        activo,
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CampoTexto etiqueta="Clave" valor={clave} onChange={setClave} requerido={!claveFija} />
        <CampoTexto etiqueta="Nombre (imprime en el RAG)" valor={nombre} onChange={setNombre} requerido />
        <CampoTexto etiqueta="Descripción" valor={descripcion} onChange={setDescripcion} />
        <label className="text-sm text-vw-deep-space">
          <span className="block text-xs text-vw-dsb-60">Orden</span>
          <input
            type="number"
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value))}
            className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-vw-deep-space">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Activa
      </label>
      <div className="flex gap-3">
        <BotonPrimario type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
