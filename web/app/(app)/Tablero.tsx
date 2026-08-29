"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoBadge, etiquetaEstado } from "@/components/EstadoBadge";
import { descargar } from "@/lib/descargas";
import type { Estado } from "@/lib/tipos";

interface SistemaCaptura {
  clave: string;
  nombre: string;
  rag: string | null;
  total: number;
  completo: number;
  parcial: number;
  pendiente: number;
  siguientePendiente: { id: string; nombre: string } | null;
}

type Ritmo =
  | { disponible: false }
  | { disponible: true; pendientes: number; diasRestantes: number; ejecucionFin: string };

interface Responsable {
  responsable: string;
  total: number;
  llegaron: number;
  faltan: number;
  diasSinReportar: number | null;
}

interface Fila {
  elementoId: string;
  sistemaClave: string;
  sistemaNombre: string;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  responsable: string | null;
  estado: Estado;
  fotosPorMomento: Record<string, number>;
  capturadoPor: string | null;
  actualizado: string | null;
}

interface Props {
  ciclo: { clave: string; nombre: string };
  sistemas: { clave: string; nombre: string }[];
  captura: SistemaCaptura[];
  ritmo: Ritmo;
  responsables: Responsable[];
  entradaPendienteCount: number;
  momentosPorSistema: Record<string, { id: string; etiqueta: string }[]>;
  filas: Fila[];
}

function formatoFotos(fotosPorMomento: Record<string, number>, momentos: { id: string; etiqueta: string }[]) {
  const idsConocidos = new Set(momentos.map((m) => m.id));
  const partes = [
    ...momentos.map((m) => `${m.etiqueta}: ${fotosPorMomento[m.id] ?? 0}`),
    ...Object.entries(fotosPorMomento)
      .filter(([id]) => !idsConocidos.has(id))
      .map(([id, n]) => `${id}: ${n}`),
  ];
  return partes.length > 0 ? partes.join(" · ") : "—";
}

function celdaCsv(valor: string) {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function Tablero({
  ciclo,
  sistemas,
  captura,
  ritmo,
  responsables,
  entradaPendienteCount,
  momentosPorSistema,
  filas,
}: Props) {
  const router = useRouter();
  const [sistemaFiltro, setSistemaFiltro] = useState("");
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<Estado | "">("");

  const responsablesUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const f of filas) if (f.responsable) set.add(f.responsable);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [filas]);

  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) =>
          (!sistemaFiltro || f.sistemaClave === sistemaFiltro) &&
          (!responsableFiltro || f.responsable === responsableFiltro) &&
          (!estadoFiltro || f.estado === estadoFiltro),
      ),
    [filas, sistemaFiltro, responsableFiltro, estadoFiltro],
  );

  function exportarCsv() {
    const encabezado = [
      "Sistema",
      "Identificador",
      "Rótulo",
      "Ubicación",
      "Responsable",
      "Estado",
      "Fotos",
      "Capturó",
      "Actualizado",
    ];
    const renglones = filasFiltradas.map((f) => [
      f.sistemaNombre,
      f.codigo,
      f.nombre,
      f.ubicacion ?? "",
      f.responsable ?? "",
      etiquetaEstado(f.estado),
      formatoFotos(f.fotosPorMomento, momentosPorSistema[f.sistemaClave] ?? []),
      f.capturadoPor ?? "",
      f.actualizado ? f.actualizado.slice(0, 10) : "",
    ]);
    const csv = [encabezado, ...renglones].map((fila) => fila.map(celdaCsv).join(",")).join("\r\n");
    // El BOM al frente le indica a Excel que el archivo es UTF-8; sin él,
    // los acentos de "Válvulas", "Benjamín", etc. se ven mal en Windows.
    descargar(`tablero_${ciclo.clave}.csv`, `﻿${csv}`, "text/csv;charset=utf-8");
  }

  function exportarJson() {
    descargar(`tablero_${ciclo.clave}.json`, JSON.stringify(filas, null, 2), "application/json;charset=utf-8");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl text-vw-deep-space">Tablero</h1>
        <Link href="/informe" className="text-sm text-vw-vivid-green hover:underline">
          Generar informe →
        </Link>
      </div>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-vw-deep-space">Mi captura</h2>
        {captura.length === 0 ? (
          <p className="mt-2 text-sm text-vw-dsb-60">
            El ciclo no tiene ningún sistema marcado para captura directa.
          </p>
        ) : (
          <>
            <div className="mt-3 space-y-3">
              {captura.map((s) => {
                const avance = s.total === 0 ? 0 : Math.round((s.completo / s.total) * 100);
                return (
                  <div key={s.clave} className="border border-vw-dsb-20 p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-vw-deep-space">{s.nombre}</span>
                      {s.rag && <span className="text-xs text-vw-dsb-60">{s.rag}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-vw-dsb-60">
                      <span>
                        <span className="font-medium text-vw-green">{s.completo}</span> completos
                      </span>
                      <span>
                        <span className="font-medium text-vw-deep-space">{s.parcial}</span> parciales
                      </span>
                      <span>
                        <span className="font-medium text-vw-deep-space">{s.pendiente}</span> pendientes
                      </span>
                      <span>
                        <span className="font-medium text-vw-deep-space">{s.total}</span> en total
                      </span>
                      <span className="font-medium text-vw-vivid-green">{avance}% de avance</span>
                    </div>
                    {s.siguientePendiente ? (
                      <Link
                        href={`/capturar/${s.clave}/${s.siguientePendiente.id}`}
                        className="mt-3 inline-block bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80"
                      >
                        Continuar con {s.siguientePendiente.nombre}
                      </Link>
                    ) : (
                      <p className="mt-3 text-sm text-vw-green">Completo.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
              {!ritmo.disponible ? (
                "El ciclo no tiene configurada la fecha de cierre de ejecución; no se puede calcular el ritmo necesario."
              ) : ritmo.pendientes === 0 ? (
                "No quedan elementos pendientes en captura directa."
              ) : ritmo.diasRestantes <= 0 ? (
                <>
                  La ventana de ejecución venció el {ritmo.ejecucionFin} y quedan{" "}
                  <span className="font-medium">{ritmo.pendientes}</span> elementos pendientes.
                </>
              ) : (
                <>
                  Quedan <span className="font-medium">{ritmo.pendientes}</span> elementos pendientes y{" "}
                  <span className="font-medium">{ritmo.diasRestantes}</span> día
                  {ritmo.diasRestantes === 1 ? "" : "s"} hasta el cierre de ejecución ({ritmo.ejecucionFin}) —
                  ritmo necesario: <span className="font-medium">{(ritmo.pendientes / ritmo.diasRestantes).toFixed(1)}</span>{" "}
                  elementos por día.
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-vw-deep-space">Recepción</h2>
        <p className="mt-1 text-sm text-vw-dsb-60">
          {entradaPendienteCount} fotografía{entradaPendienteCount === 1 ? "" : "s"} sin clasificar en{" "}
          <Link href="/recepcion" className="text-vw-vivid-green hover:underline">
            recepción
          </Link>
          .
        </p>

        {responsables.length === 0 ? (
          <p className="mt-2 text-sm text-vw-dsb-60">
            El ciclo no tiene ningún sistema fuera de captura directa.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {responsables.map((r) => (
              <div key={r.responsable} className="border border-vw-dsb-20 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-vw-deep-space">{r.responsable}</span>
                  <span className="text-sm text-vw-dsb-60">
                    {r.diasSinReportar === null
                      ? "sin evidencia recibida todavía"
                      : r.diasSinReportar === 0
                        ? "reportó hoy"
                        : `${r.diasSinReportar} día${r.diasSinReportar === 1 ? "" : "s"} sin reportar`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-vw-dsb-60">
                  <span>
                    <span className="font-medium text-vw-green">{r.llegaron}</span> completos
                  </span>
                  <span>
                    <span className="font-medium text-vw-deep-space">{r.faltan}</span> pendientes
                  </span>
                  <span>
                    <span className="font-medium text-vw-deep-space">{r.total}</span> en total
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium text-vw-deep-space">Detalle</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportarCsv}
              className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={exportarJson}
              className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green"
            >
              Exportar JSON
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={sistemaFiltro}
            onChange={(e) => setSistemaFiltro(e.target.value)}
            className="border border-vw-dsb-20 px-2 py-1.5 text-sm text-vw-deep-space"
          >
            <option value="">Todos los sistemas</option>
            {sistemas.map((s) => (
              <option key={s.clave} value={s.clave}>
                {s.nombre}
              </option>
            ))}
          </select>
          <select
            value={responsableFiltro}
            onChange={(e) => setResponsableFiltro(e.target.value)}
            className="border border-vw-dsb-20 px-2 py-1.5 text-sm text-vw-deep-space"
          >
            <option value="">Todos los responsables</option>
            {responsablesUnicos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as Estado | "")}
            className="border border-vw-dsb-20 px-2 py-1.5 text-sm text-vw-deep-space"
          >
            <option value="">Todos los estados</option>
            <option value="sin_iniciar">Sin iniciar</option>
            <option value="parcial">Parcial</option>
            <option value="completo">Completo</option>
          </select>
          <span className="text-sm text-vw-dsb-60">
            {filasFiltradas.length} de {filas.length}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto border border-vw-dsb-10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-vw-vg-10 text-xs uppercase text-vw-dsb-60">
              <tr>
                <th className="px-3 py-2 font-medium">Identificador</th>
                <th className="px-3 py-2 font-medium">Rótulo</th>
                <th className="px-3 py-2 font-medium">Sistema</th>
                <th className="px-3 py-2 font-medium">Ubicación</th>
                <th className="px-3 py-2 font-medium">Responsable</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Fotos</th>
                <th className="px-3 py-2 font-medium">Capturó</th>
                <th className="px-3 py-2 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vw-dsb-10">
              {filasFiltradas.map((f) => (
                <tr
                  key={f.elementoId}
                  onClick={() => router.push(`/capturar/${f.sistemaClave}/${f.elementoId}`)}
                  className="cursor-pointer hover:bg-vw-vg-10"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/capturar/${f.sistemaClave}/${f.elementoId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-vw-deep-space hover:text-vw-vivid-green"
                    >
                      {f.codigo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.nombre}</td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.sistemaNombre}</td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.ubicacion ?? "—"}</td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.responsable ?? "—"}</td>
                  <td className="px-3 py-2">
                    <EstadoBadge estado={f.estado} />
                  </td>
                  <td className="px-3 py-2 text-vw-dsb-60">
                    {formatoFotos(f.fotosPorMomento, momentosPorSistema[f.sistemaClave] ?? [])}
                  </td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.capturadoPor ?? "—"}</td>
                  <td className="px-3 py-2 text-vw-dsb-60">{f.actualizado ? f.actualizado.slice(0, 10) : "—"}</td>
                </tr>
              ))}
              {filasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-vw-dsb-60">
                    Ningún elemento coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
