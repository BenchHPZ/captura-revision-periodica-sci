"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/Boton";
import { CampoTexto } from "@/components/Campo";
import type { Sistema, TipoDiccionario } from "@/lib/tipos";
import { actualizarSistema, crearSistema, type DatosSistema } from "./actions";

interface Props {
  sistemas: Sistema[];
}

const VACIO: DatosSistema & { clave: string } = { clave: "", nombre: "", rag: "", orden: 0, activo: true, tipos: [] };

/** Antes 'sistemas' sólo se cargaba por migración
 * (0002_sistemas_seed.sql). Ver docs/decisiones.md D-21. El diccionario
 * de tipos (D-18) se edita aquí mismo — es propiedad del sistema, no del
 * elemento. */
export function PanelSistemas({ sistemas: sistemasIniciales }: Props) {
  const [sistemas, setSistemas] = useState<Sistema[]>(sistemasIniciales);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function alCrear(clave: string, datos: DatosSistema) {
    if (sistemas.some((s) => s.clave === clave)) {
      setMensaje(`Ya existe un sistema con la clave "${clave}".`);
      return;
    }
    try {
      await crearSistema(clave, datos);
      setSistemas((prev) => [...prev, { id: crypto.randomUUID(), clave, ...datos }].sort((a, b) => a.orden - b.orden));
      setAgregando(false);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo crear el sistema.");
    }
  }

  async function alActualizar(sistema: Sistema, datos: DatosSistema) {
    try {
      await actualizarSistema(sistema.id, datos);
      setSistemas((prev) => prev.map((s) => (s.id === sistema.id ? { ...s, ...datos } : s)).sort((a, b) => a.orden - b.orden));
      setEditandoId(null);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar el sistema.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-vw-dsb-60">Los cinco sistemas de la revisión, y el diccionario de tipos de cada uno.</p>
        <BotonPrimario onClick={() => setAgregando((v) => !v)}>{agregando ? "Cancelar" : "+ Agregar sistema"}</BotonPrimario>
      </div>

      {mensaje && <div className="mt-3"><Aviso tipo="error">{mensaje}</Aviso></div>}

      {agregando && (
        <div className="mt-3 border border-vw-dsb-20 p-3">
          <FormularioSistema inicial={VACIO} onGuardar={(clave, datos) => alCrear(clave, datos)} onCancelar={() => setAgregando(false)} />
        </div>
      )}

      <ul className="mt-4 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
        {sistemas.map((s) => (
          <li key={s.id}>
            {editandoId === s.id ? (
              <div className="p-3">
                <FormularioSistema
                  inicial={{ clave: s.clave, nombre: s.nombre, rag: s.rag ?? "", orden: s.orden, activo: s.activo, tipos: s.tipos }}
                  claveFija
                  onGuardar={(_clave, datos) => alActualizar(s, datos)}
                  onCancelar={() => setEditandoId(null)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditandoId(s.id)}
                className={`flex w-full items-center justify-between gap-3 px-1 py-3 text-left ${s.activo ? "" : "opacity-50"}`}
              >
                <div>
                  <p className="font-medium text-vw-deep-space">
                    {s.nombre} {s.rag && <span className="text-xs text-vw-dsb-60">· {s.rag}</span>}
                  </p>
                  <p className="text-sm text-vw-dsb-60">
                    {s.clave} · orden {s.orden}
                    {s.tipos.length > 0 && ` · tipos: ${s.tipos.map((t) => t.clave).join(", ")}`}
                    {!s.activo && " · inactivo"}
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

function FormularioSistema({
  inicial,
  claveFija,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosSistema & { clave: string };
  claveFija?: boolean;
  onGuardar: (clave: string, datos: DatosSistema) => void | Promise<void>;
  onCancelar: () => void;
}) {
  const [clave, setClave] = useState(inicial.clave);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [rag, setRag] = useState(inicial.rag ?? "");
  const [orden, setOrden] = useState(inicial.orden);
  const [activo, setActivo] = useState(inicial.activo);
  const [tipos, setTipos] = useState<TipoDiccionario[]>(inicial.tipos);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await onGuardar(clave.trim(), {
        nombre: nombre.trim(),
        rag: rag.trim() || null,
        orden,
        activo,
        tipos: tipos.filter((t) => t.clave.trim() && t.nombre.trim()),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CampoTexto etiqueta="Clave" valor={clave} onChange={setClave} requerido={!claveFija} />
        <CampoTexto etiqueta="Nombre" valor={nombre} onChange={setNombre} requerido />
        <CampoTexto etiqueta="RAG" valor={rag} onChange={setRag} />
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
        Activo
      </label>

      <div>
        <p className="text-xs text-vw-dsb-60">
          Diccionario de tipos. Vacío = la columna Tipo no se dibuja en el documento RAG de este sistema.
        </p>
        <div className="mt-2 space-y-2">
          {tipos.map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <CampoTexto etiqueta="Clave (imprime en el RAG)" valor={t.clave} onChange={(v) => setTipos((prev) => prev.map((x, j) => (j === i ? { ...x, clave: v } : x)))} />
              <CampoTexto etiqueta="Nombre" valor={t.nombre} onChange={(v) => setTipos((prev) => prev.map((x, j) => (j === i ? { ...x, nombre: v } : x)))} />
              <button type="button" onClick={() => setTipos((prev) => prev.filter((_, j) => j !== i))} className="pb-1.5 text-sm text-vw-red hover:underline">
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTipos((prev) => [...prev, { clave: "", nombre: "" }])}
          className="mt-2 text-sm text-vw-vivid-green hover:underline"
        >
          + Agregar tipo
        </button>
      </div>

      <div className="flex gap-3">
        <BotonPrimario type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
