"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/Boton";
import { CampoTexto } from "@/components/Campo";
import { claveASlug } from "@/lib/rag/documento";
import type { Formato, Sistema } from "@/lib/tipos";
import { cambiarActivoFormato, eliminarFormatoPermanente } from "./actions";

interface Props {
  formatosIniciales: Formato[];
  sistemas: Sistema[];
  tipo: "rag" | "checklist";
}

type FaseFila =
  | { fase: "normal" }
  | { fase: "confirmando_eliminar"; claveTecleada: string }
  | { fase: "eliminando" };

/**
 * Fila de acciones de ciclo de vida para AMBOS tipos de formato — mismo
 * mecanismo que ElementosCatalogo.tsx (checkbox "Mostrar de baja", estado
 * local optimista, window.confirm() sólo al dar de baja), más una tercera
 * fase disponible únicamente cuando el formato ya está de baja: "Eliminar
 * permanentemente", que exige teclear la clave exacta — la doble fricción
 * (dado de baja primero, clave tecleada después) es la confirmación
 * "pesada" para el primer borrado real de una fila de definición en esta
 * aplicación. Ver docs/decisiones.md D-23.
 */
export function FormatosLista({ formatosIniciales, sistemas, tipo }: Props) {
  const router = useRouter();
  const [formatos, setFormatos] = useState<Formato[]>(formatosIniciales);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [fasePorId, setFasePorId] = useState<Record<string, FaseFila>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const sistemaPorId = useMemo(() => new Map(sistemas.map((s) => [s.id, s])), [sistemas]);
  const visibles = formatos.filter((f) => mostrarInactivos || f.activo);

  function faseDe(id: string): FaseFila {
    return fasePorId[id] ?? { fase: "normal" };
  }

  async function alCambiarActivo(f: Formato) {
    const activar = !f.activo;
    if (!activar && !window.confirm(`¿Dar de baja "${f.clave}"? No se borra nada; se puede reactivar o eliminar después.`)) {
      return;
    }
    try {
      await cambiarActivoFormato(f.id, activar);
      setFormatos((prev) => prev.map((x) => (x.id === f.id ? { ...x, activo: activar } : x)));
      router.refresh();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    }
  }

  function iniciarEliminar(f: Formato) {
    setMensaje(null);
    setFasePorId((prev) => ({ ...prev, [f.id]: { fase: "confirmando_eliminar", claveTecleada: "" } }));
  }

  function cancelarEliminar(f: Formato) {
    setFasePorId((prev) => ({ ...prev, [f.id]: { fase: "normal" } }));
  }

  function cambiarClaveTecleada(f: Formato, valor: string) {
    setFasePorId((prev) => ({ ...prev, [f.id]: { fase: "confirmando_eliminar", claveTecleada: valor } }));
  }

  async function confirmarEliminar(f: Formato) {
    const estado = faseDe(f.id);
    if (estado.fase !== "confirmando_eliminar") return;
    setFasePorId((prev) => ({ ...prev, [f.id]: { fase: "eliminando" } }));
    try {
      await eliminarFormatoPermanente(f.id, estado.claveTecleada);
      setFormatos((prev) => prev.filter((x) => x.id !== f.id));
      router.refresh();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar.");
      setFasePorId((prev) => ({ ...prev, [f.id]: { fase: "confirmando_eliminar", claveTecleada: estado.claveTecleada } }));
    }
  }

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-vw-dsb-60">
        <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />
        Mostrar de baja
      </label>

      {mensaje && (
        <div className="mt-3">
          <Aviso tipo="error">{mensaje}</Aviso>
        </div>
      )}

      <ul className="mt-3 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
        {visibles.map((f) => {
          const sistema = f.sistema_id ? sistemaPorId.get(f.sistema_id) : null;
          const href = sistema ? `/sistemas/${sistema.clave}` : `/rag/${claveASlug(f.clave)}`;
          const fase = faseDe(f.id);

          return (
            <li key={f.id} className={f.activo ? "" : "opacity-60"}>
              <div className="flex items-center justify-between gap-3 px-1 py-3">
                <Link href={href} className="min-w-0 flex-1 hover:bg-vw-vg-10">
                  <p className="font-medium text-vw-deep-space">
                    {f.clave} <span className="text-sm font-normal text-vw-dsb-60">· {f.nombre}</span>
                    {!f.activo && <span className="ml-2 text-xs text-vw-red">De baja</span>}
                  </p>
                  <p className="text-sm text-vw-dsb-60">
                    {tipo === "checklist" ? "Checklist" : "RAG"} · {f.periodicidad}
                    {sistema && ` · ${sistema.nombre}`}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <button type="button" onClick={() => alCambiarActivo(f)} className="text-sm text-vw-dsb-60 hover:text-vw-red">
                    {f.activo ? "Dar de baja" : "Reactivar"}
                  </button>
                  {!f.activo && fase.fase === "normal" && (
                    <button type="button" onClick={() => iniciarEliminar(f)} className="text-sm text-vw-red hover:underline">
                      Eliminar permanentemente
                    </button>
                  )}
                </div>
              </div>

              {fase.fase !== "normal" && (
                <div className="pb-3">
                  <Aviso tipo="error">
                    <p className="font-medium">Eliminar &quot;{f.clave}&quot; en definitiva — no se puede deshacer.</p>
                    <div className="mt-2 max-w-xs">
                      <CampoTexto
                        etiqueta={`Escribe "${f.clave}" para confirmar`}
                        valor={fase.fase === "confirmando_eliminar" ? fase.claveTecleada : ""}
                        onChange={(v) => cambiarClaveTecleada(f, v)}
                        deshabilitado={fase.fase === "eliminando"}
                      />
                    </div>
                    <div className="mt-3 flex gap-3">
                      <BotonPrimario
                        onClick={() => confirmarEliminar(f)}
                        disabled={fase.fase === "eliminando" || (fase.fase === "confirmando_eliminar" && fase.claveTecleada !== f.clave)}
                      >
                        {fase.fase === "eliminando" ? "Eliminando…" : "Eliminar definitivamente"}
                      </BotonPrimario>
                      <BotonSecundario onClick={() => cancelarEliminar(f)} disabled={fase.fase === "eliminando"}>
                        Cancelar
                      </BotonSecundario>
                    </div>
                  </Aviso>
                </div>
              )}
            </li>
          );
        })}
        {visibles.length === 0 && <li className="py-3 text-sm text-vw-dsb-60">Ningún formato coincide.</li>}
      </ul>
    </div>
  );
}
