"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario } from "@/components/Boton";
import { CampoTexto } from "@/components/Campo";
import { useRouter } from "next/navigation";
import type { Ciclo, CicloFechas, Sistema } from "@/lib/tipos";
import { cerrarCiclo, guardarCiclo } from "./actions";

interface Props {
  ciclo: Ciclo;
  sistemas: Sistema[];
}

const ETIQUETA_FECHA: Record<keyof CicloFechas, string> = {
  ejecucion_inicio: "Inicio de ejecución",
  ejecucion_fin: "Fin de ejecución",
  entrega: "Entrega del informe",
  supervision_fin: "Fin de supervisión",
};

/** Primera pantalla que escribe sobre 'ciclos' — antes 'config' sólo se
 * fijaba en el insert inicial de cargar_catalogo.py y quedaba inmutable
 * para el resto del ciclo (ver docs/decisiones.md D-21). */
export function PanelCiclo({ ciclo, sistemas }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(ciclo.nombre);
  const [sistemasActivos, setSistemasActivos] = useState(new Set(ciclo.config.sistemas_activos));
  const [capturaDirecta, setCapturaDirecta] = useState(new Set(ciclo.config.captura_directa));
  const [ladoMax, setLadoMax] = useState(ciclo.config.imagen.lado_max);
  const [calidad, setCalidad] = useState(ciclo.config.imagen.calidad);
  const [fechas, setFechas] = useState<CicloFechas>(ciclo.config.fechas ?? {});
  const [estado, setEstado] = useState<{ fase: "editando" | "guardando" | "guardado"; mensaje?: string }>({
    fase: "editando",
  });

  function alternarActivo(clave: string) {
    setEstado({ fase: "editando" });
    setSistemasActivos((prev) => {
      const copia = new Set(prev);
      if (copia.has(clave)) {
        copia.delete(clave);
        setCapturaDirecta((cd) => {
          const c = new Set(cd);
          c.delete(clave);
          return c;
        });
      } else {
        copia.add(clave);
      }
      return copia;
    });
  }

  function alternarCapturaDirecta(clave: string) {
    setEstado({ fase: "editando" });
    setCapturaDirecta((prev) => {
      const copia = new Set(prev);
      if (copia.has(clave)) copia.delete(clave);
      else copia.add(clave);
      return copia;
    });
  }

  async function guardar() {
    setEstado({ fase: "guardando" });
    try {
      await guardarCiclo(ciclo.id, {
        nombre: nombre.trim(),
        config: {
          sistemas_activos: [...sistemasActivos],
          captura_directa: [...capturaDirecta],
          imagen: { lado_max: ladoMax, calidad, formato: "jpeg" },
          fechas,
        },
      });
      setEstado({ fase: "guardado" });
    } catch (error) {
      setEstado({ fase: "editando", mensaje: error instanceof Error ? error.message : "No se pudo guardar." });
    }
  }

  async function cerrar() {
    if (
      !window.confirm(
        `¿Cerrar ${ciclo.nombre}? Ya no admitirá captura; queda disponible para consulta. No hay vuelta atrás desde aquí.`,
      )
    ) {
      return;
    }
    try {
      await cerrarCiclo(ciclo.id);
      router.refresh();
    } catch (error) {
      setEstado({ fase: "editando", mensaje: error instanceof Error ? error.message : "No se pudo cerrar el ciclo." });
    }
  }

  return (
    <div className="space-y-6">
      <CampoTexto etiqueta="Nombre del ciclo" valor={nombre} onChange={(v) => { setEstado({ fase: "editando" }); setNombre(v); }} requerido />

      <div>
        <p className="text-sm font-medium text-vw-deep-space">Sistemas activos y captura directa</p>
        <p className="mt-1 text-xs text-vw-dsb-60">
          Un sistema en captura directa entra por /capturar; el resto se sigue por /recepcion mientras
          llegue evidencia de terceros. Desactivar un sistema lo saca también de captura directa.
        </p>
        <div className="mt-2 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
          {sistemas.map((s) => (
            <div key={s.clave} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-vw-deep-space">{s.nombre}</span>
              <div className="flex gap-4 text-sm text-vw-dsb-60">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={sistemasActivos.has(s.clave)} onChange={() => alternarActivo(s.clave)} />
                  Activo
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={capturaDirecta.has(s.clave)}
                    disabled={!sistemasActivos.has(s.clave)}
                    onChange={() => alternarCapturaDirecta(s.clave)}
                  />
                  Captura directa
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-vw-deep-space">Fechas del ciclo</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(ETIQUETA_FECHA) as (keyof CicloFechas)[]).map((campo) => (
            <label key={campo} className="text-sm text-vw-deep-space">
              <span className="block text-xs text-vw-dsb-60">{ETIQUETA_FECHA[campo]}</span>
              <input
                type="date"
                value={fechas[campo] ?? ""}
                onChange={(e) => {
                  setEstado({ fase: "editando" });
                  setFechas((prev) => ({ ...prev, [campo]: e.target.value || undefined }));
                }}
                className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-vw-deep-space">Fotografías</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:w-64">
          <label className="text-sm text-vw-deep-space">
            <span className="block text-xs text-vw-dsb-60">Lado mayor (px)</span>
            <input
              type="number"
              min={480}
              value={ladoMax}
              onChange={(e) => { setEstado({ fase: "editando" }); setLadoMax(Number(e.target.value)); }}
              className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
            />
          </label>
          <label className="text-sm text-vw-deep-space">
            <span className="block text-xs text-vw-dsb-60">Calidad JPEG (0-100)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={calidad}
              onChange={(e) => { setEstado({ fase: "editando" }); setCalidad(Number(e.target.value)); }}
              className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
            />
          </label>
        </div>
      </div>

      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      {estado.fase === "guardado" && <Aviso tipo="exito">Guardado.</Aviso>}

      <div className="flex items-center justify-between">
        <BotonPrimario onClick={guardar} disabled={estado.fase === "guardando"}>
          {estado.fase === "guardando" ? "Guardando…" : "Guardar cambios"}
        </BotonPrimario>
        <button type="button" onClick={cerrar} className="text-sm text-vw-red hover:underline">
          Cerrar ciclo
        </button>
      </div>
    </div>
  );
}
