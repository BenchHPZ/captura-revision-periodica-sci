"use client";

import { useState } from "react";
import {
  CAMPO_TEXTO_LIBRE,
  ETIQUETA_TEXTO_LIBRE,
  type CampoTextoLibre,
  type FotoDef,
  type Plantilla,
  type PuntoDef,
  type TipoPunto,
} from "@/lib/tipos";
import {
  guardarPlantilla as guardarPlantillaAccion,
  previsualizarPlantilla as previsualizarPlantillaAccion,
  type ImpactoPlantilla,
} from "./actions";

const TIPOS: { valor: TipoPunto; etiqueta: string }[] = [
  { valor: "si_no", etiqueta: "Sí / No" },
  { valor: "si_no_na", etiqueta: "Sí / No / N/A" },
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "seleccion", etiqueta: "Selección de lista" },
  { valor: "fecha", etiqueta: "Fecha" },
];

interface FotoFila extends FotoDef {
  key: string;
  esNueva: boolean;
}

interface PuntoFila extends PuntoDef {
  key: string;
  esNueva: boolean;
}

type EstadoGuardado =
  | { fase: "editando" }
  | { fase: "calculando" }
  | { fase: "revision"; impacto: ImpactoPlantilla }
  | { fase: "guardando" }
  | { fase: "guardado"; impacto: ImpactoPlantilla }
  | { fase: "error"; mensaje: string };

interface Props {
  ciclo: { id: string };
  sistema: { id: string; clave: string };
  plantillaInicial: Plantilla;
}

export function PlantillaEditor({ ciclo, sistema, plantillaInicial }: Props) {
  const [fotos, setFotos] = useState<FotoFila[]>(() =>
    plantillaInicial.fotos.map((f) => ({ ...f, key: f.id, esNueva: false })),
  );
  const [puntos, setPuntos] = useState<PuntoFila[]>(() =>
    plantillaInicial.puntos.map((p) => ({ ...p, key: p.id, esNueva: false })),
  );
  const [textoLibre, setTextoLibre] = useState<string[]>(plantillaInicial.texto_libre);
  const [estado, setEstado] = useState<EstadoGuardado>({ fase: "editando" });

  function moverFoto(key: string, direccion: -1 | 1) {
    setFotos((prev) => mover(prev, key, direccion));
  }
  function moverPunto(key: string, direccion: -1 | 1) {
    setPuntos((prev) => mover(prev, key, direccion));
  }

  function alternarTextoLibre(campo: string) {
    setEstado({ fase: "editando" });
    setTextoLibre((prev) => (prev.includes(campo) ? prev.filter((c) => c !== campo) : [...prev, campo]));
  }

  function construirPlantilla(): Plantilla {
    return {
      fotos: fotos.map((f) => ({ id: f.id.trim(), etiqueta: f.etiqueta, requerido: f.requerido, min: f.min })),
      puntos: puntos.map((p) => ({
        id: p.id.trim(),
        etiqueta: p.etiqueta,
        tipo: p.tipo,
        requerido: p.requerido,
        opciones: p.opciones,
      })),
      texto_libre: textoLibre,
    };
  }

  function validar(): string | null {
    if (fotos.some((f) => !f.id.trim() || !f.etiqueta.trim())) {
      return "Cada bloque de fotos necesita un identificador y una etiqueta.";
    }
    const idsFotos = fotos.map((f) => f.id.trim());
    if (new Set(idsFotos).size !== idsFotos.length) return "Hay identificadores de fotos repetidos.";

    if (puntos.some((p) => !p.id.trim() || !p.etiqueta.trim())) {
      return "Cada punto de revisión necesita un identificador y una etiqueta.";
    }
    const idsPuntos = puntos.map((p) => p.id.trim());
    if (new Set(idsPuntos).size !== idsPuntos.length) return "Hay identificadores de puntos repetidos.";
    if (puntos.some((p) => p.tipo === "seleccion" && (p.opciones ?? []).length === 0)) {
      return 'Los puntos de tipo "selección de lista" necesitan al menos una opción.';
    }
    return null;
  }

  async function previsualizar() {
    const mensaje = validar();
    if (mensaje) {
      setEstado({ fase: "error", mensaje });
      return;
    }
    setEstado({ fase: "calculando" });
    try {
      const impacto = await previsualizarPlantillaAccion(ciclo.id, sistema.id, construirPlantilla());
      setEstado({ fase: "revision", impacto });
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo calcular el impacto.",
      });
    }
  }

  async function confirmar() {
    setEstado({ fase: "guardando" });
    try {
      const impacto = await guardarPlantillaAccion(ciclo.id, sistema.id, construirPlantilla());
      setEstado({ fase: "guardado", impacto });
    } catch (error) {
      setEstado({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo guardar la plantilla.",
      });
    }
  }

  return (
    <section className="border border-vw-dsb-20 p-4">
      <h2 className="text-lg font-medium text-vw-deep-space">Plantilla</h2>
      <p className="mt-1 text-sm text-vw-dsb-60">
        Lo que se supervisa este ciclo en este sistema: bloques de fotos, puntos de revisión y
        textos de descripción habilitados.
      </p>

      <div className="mt-4">
        <p className="text-sm font-medium text-vw-deep-space">Bloques de fotos</p>
        <div className="mt-2 space-y-2">
          {fotos.map((f, i) => (
            <FilaFoto
              key={f.key}
              fila={f}
              esPrimera={i === 0}
              esUltima={i === fotos.length - 1}
              onCambiar={(cambios) => {
                setEstado({ fase: "editando" });
                setFotos((prev) => prev.map((x) => (x.key === f.key ? { ...x, ...cambios } : x)));
              }}
              onQuitar={() => {
                setEstado({ fase: "editando" });
                setFotos((prev) => prev.filter((x) => x.key !== f.key));
              }}
              onMover={(d) => moverFoto(f.key, d)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setEstado({ fase: "editando" });
            setFotos((prev) => [...prev, { key: crypto.randomUUID(), id: "", etiqueta: "", requerido: true, min: 1, esNueva: true }]);
          }}
          className="mt-2 text-sm text-vw-vivid-green hover:underline"
        >
          + Agregar bloque de fotos
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-vw-deep-space">Puntos de revisión</p>
        <div className="mt-2 space-y-2">
          {puntos.map((p, i) => (
            <FilaPunto
              key={p.key}
              fila={p}
              esPrimera={i === 0}
              esUltima={i === puntos.length - 1}
              onCambiar={(cambios) => {
                setEstado({ fase: "editando" });
                setPuntos((prev) => prev.map((x) => (x.key === p.key ? { ...x, ...cambios } : x)));
              }}
              onQuitar={() => {
                setEstado({ fase: "editando" });
                setPuntos((prev) => prev.filter((x) => x.key !== p.key));
              }}
              onMover={(d) => moverPunto(p.key, d)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setEstado({ fase: "editando" });
            setPuntos((prev) => [
              ...prev,
              { key: crypto.randomUUID(), id: "", etiqueta: "", tipo: "si_no", requerido: true, esNueva: true },
            ]);
          }}
          className="mt-2 text-sm text-vw-vivid-green hover:underline"
        >
          + Agregar punto de revisión
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-vw-deep-space">Textos de descripción</p>
        <div className="mt-2 flex flex-wrap gap-4">
          {(Object.keys(CAMPO_TEXTO_LIBRE) as CampoTextoLibre[]).map((campo) => (
            <label key={campo} className="flex items-center gap-2 text-sm text-vw-deep-space">
              <input
                type="checkbox"
                checked={textoLibre.includes(campo)}
                onChange={() => alternarTextoLibre(campo)}
              />
              {ETIQUETA_TEXTO_LIBRE[campo]}
            </label>
          ))}
        </div>
      </div>

      {estado.fase === "error" && (
        <p className="mt-4 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
          {estado.mensaje}
        </p>
      )}

      {(estado.fase === "revision" || estado.fase === "guardando") && (
        <div className="mt-4 border border-vw-amber/40 bg-vw-amber/10 p-3 text-sm text-vw-deep-space">
          <ResumenImpacto impacto={estado.fase === "revision" ? estado.impacto : undefined} />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={estado.fase === "guardando"}
              className="bg-vw-vivid-green px-3 py-1.5 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
            >
              {estado.fase === "guardando" ? "Guardando…" : "Confirmar y guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEstado({ fase: "editando" })}
              disabled={estado.fase === "guardando"}
              className="text-vw-dsb-60 hover:text-vw-deep-space"
            >
              Seguir editando
            </button>
          </div>
        </div>
      )}

      {estado.fase === "guardado" && (
        <div className="mt-4 border border-vw-green/40 bg-vw-green/10 p-3 text-sm text-vw-deep-space">
          <p className="font-medium">Plantilla guardada.</p>
          <ResumenImpacto impacto={estado.impacto} />
        </div>
      )}

      {(estado.fase === "editando" || estado.fase === "calculando" || estado.fase === "error") && (
        <button
          type="button"
          onClick={previsualizar}
          disabled={estado.fase === "calculando"}
          className="mt-4 bg-vw-deep-space px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-dsb-90 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
        >
          {estado.fase === "calculando" ? "Calculando impacto…" : "Guardar cambios"}
        </button>
      )}
    </section>
  );
}

function mover<T extends { key: string }>(lista: T[], key: string, direccion: -1 | 1): T[] {
  const i = lista.findIndex((x) => x.key === key);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  const a = copia[i]!;
  const b = copia[j]!;
  copia[i] = b;
  copia[j] = a;
  return copia;
}

function ResumenImpacto({ impacto }: { impacto?: ImpactoPlantilla }) {
  if (!impacto) return <p>Calculando…</p>;
  if (impacto.cambios === 0) {
    return <p>Ningún elemento cambia de estado con esta plantilla. Total: {impacto.totalElementos}.</p>;
  }
  return (
    <p>
      <span className="font-medium">{impacto.cambios}</span> de {impacto.totalElementos} elementos cambiarían de
      estado: {impacto.aSinIniciar} a sin iniciar, {impacto.aParcial} a parcial, {impacto.aCompleto} a completo.
    </p>
  );
}

function FilaFoto({
  fila,
  esPrimera,
  esUltima,
  onCambiar,
  onQuitar,
  onMover,
}: {
  fila: FotoFila;
  esPrimera: boolean;
  esUltima: boolean;
  onCambiar: (cambios: Partial<FotoFila>) => void;
  onQuitar: () => void;
  onMover: (direccion: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 border border-vw-dsb-10 p-2">
      <BotonesOrden esPrimera={esPrimera} esUltima={esUltima} onMover={onMover} />
      <Campo etiqueta="Identificador">
        <input
          value={fila.id}
          disabled={!fila.esNueva}
          onChange={(e) => onCambiar({ id: e.target.value })}
          className="w-32 border border-vw-dsb-20 px-2 py-1 text-sm disabled:bg-vw-dsb-10 disabled:text-vw-dsb-60"
        />
      </Campo>
      <Campo etiqueta="Etiqueta">
        <input
          value={fila.etiqueta}
          onChange={(e) => onCambiar({ etiqueta: e.target.value })}
          className="w-40 border border-vw-dsb-20 px-2 py-1 text-sm"
        />
      </Campo>
      <Campo etiqueta="Mínimo">
        <input
          type="number"
          min={0}
          value={fila.min}
          onChange={(e) => onCambiar({ min: Number(e.target.value) })}
          className="w-16 border border-vw-dsb-20 px-2 py-1 text-sm"
        />
      </Campo>
      <label className="flex items-center gap-1.5 pb-1.5 text-sm text-vw-deep-space">
        <input type="checkbox" checked={fila.requerido} onChange={(e) => onCambiar({ requerido: e.target.checked })} />
        Requerido
      </label>
      <button type="button" onClick={onQuitar} className="pb-1.5 text-sm text-vw-red hover:underline">
        Quitar
      </button>
    </div>
  );
}

function FilaPunto({
  fila,
  esPrimera,
  esUltima,
  onCambiar,
  onQuitar,
  onMover,
}: {
  fila: PuntoFila;
  esPrimera: boolean;
  esUltima: boolean;
  onCambiar: (cambios: Partial<PuntoFila>) => void;
  onQuitar: () => void;
  onMover: (direccion: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 border border-vw-dsb-10 p-2">
      <BotonesOrden esPrimera={esPrimera} esUltima={esUltima} onMover={onMover} />
      <Campo etiqueta="Identificador">
        <input
          value={fila.id}
          disabled={!fila.esNueva}
          onChange={(e) => onCambiar({ id: e.target.value })}
          className="w-32 border border-vw-dsb-20 px-2 py-1 text-sm disabled:bg-vw-dsb-10 disabled:text-vw-dsb-60"
        />
      </Campo>
      <Campo etiqueta="Etiqueta">
        <input
          value={fila.etiqueta}
          onChange={(e) => onCambiar({ etiqueta: e.target.value })}
          className="w-48 border border-vw-dsb-20 px-2 py-1 text-sm"
        />
      </Campo>
      <Campo etiqueta="Tipo">
        <select
          value={fila.tipo}
          onChange={(e) => onCambiar({ tipo: e.target.value as TipoPunto })}
          className="border border-vw-dsb-20 px-2 py-1 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      {fila.tipo === "seleccion" && (
        <Campo etiqueta="Opciones (separadas por coma)">
          <input
            value={(fila.opciones ?? []).join(", ")}
            onChange={(e) =>
              onCambiar({
                opciones: e.target.value
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            className="w-56 border border-vw-dsb-20 px-2 py-1 text-sm"
          />
        </Campo>
      )}
      <label className="flex items-center gap-1.5 pb-1.5 text-sm text-vw-deep-space">
        <input type="checkbox" checked={fila.requerido} onChange={(e) => onCambiar({ requerido: e.target.checked })} />
        Requerido
      </label>
      <button type="button" onClick={onQuitar} className="pb-1.5 text-sm text-vw-red hover:underline">
        Quitar
      </button>
    </div>
  );
}

function BotonesOrden({
  esPrimera,
  esUltima,
  onMover,
}: {
  esPrimera: boolean;
  esUltima: boolean;
  onMover: (direccion: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col pb-1.5 text-vw-dsb-60">
      <button
        type="button"
        onClick={() => onMover(-1)}
        disabled={esPrimera}
        aria-label="Mover arriba"
        className="leading-none disabled:opacity-30"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => onMover(1)}
        disabled={esUltima}
        aria-label="Mover abajo"
        className="leading-none disabled:opacity-30"
      >
        ▼
      </button>
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
