"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { reducirImagen } from "@/lib/imagen";
import { DEPOSITO, rutaFoto } from "@/lib/rutas";
import { calcularEstado, faltantes } from "@/lib/estado";
import type { Elemento, Foto, Plantilla, PuntoDef, Registro, ValorPunto } from "@/lib/tipos";
import { agregarFoto, eliminarFoto, guardarYSiguiente } from "./actions";

interface FotoConUrl extends Foto {
  url: string | null;
}

interface Props {
  ciclo: { id: string; clave: string; imagen: { lado_max: number; calidad: number; formato: string } };
  sistema: { id: string; clave: string; nombre: string };
  elemento: Elemento;
  plantilla: Plantilla;
  registro: Registro | null;
  fotos: FotoConUrl[];
  volverHref: string;
  volverEtiqueta: string;
  esCapturaDirecta: boolean;
}

interface FotoLocal {
  key: string;
  momento: string;
  previewUrl: string;
  estado: "subida" | "subiendo" | "error";
  fotoId?: string;
  archivoOriginal?: File;
  orden: number;
}

function conteoPorMomento(fotos: FotoLocal[]): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const f of fotos) {
    if (f.estado !== "subida") continue;
    conteo[f.momento] = (conteo[f.momento] ?? 0) + 1;
  }
  return conteo;
}

export function Formulario({
  ciclo,
  sistema,
  elemento,
  plantilla,
  registro,
  fotos,
  volverHref,
  volverEtiqueta,
  esCapturaDirecta,
}: Props) {
  const claveDraft = `captura:borrador:${elemento.id}`;

  const [textos, setTextos] = useState({
    como_se_encontro: registro?.como_se_encontro ?? "",
    que_se_realizo: registro?.que_se_realizo ?? "",
    pendientes: registro?.pendientes ?? "",
  });
  const [valores, setValores] = useState<Record<string, ValorPunto>>(registro?.valores ?? {});
  const [fotosLocales, setFotosLocales] = useState<FotoLocal[]>(() =>
    fotos.map((f) => ({
      key: f.id,
      momento: f.momento,
      previewUrl: f.url ?? "",
      estado: "subida" as const,
      fotoId: f.id,
      orden: f.orden,
    })),
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const contadorOrden = useRef<Record<string, number>>(conteoPorMomento(fotosLocales));

  const subirArchivo = useCallback(
    async (momento: string, archivo: File, key: string, ordenExistente?: number) => {
      setFotosLocales((prev) =>
        prev.map((f) => (f.key === key ? { ...f, estado: "subiendo", archivoOriginal: archivo } : f)),
      );

      try {
        const { blob, ancho, alto } = await reducirImagen(archivo, {
          ladoMax: ciclo.imagen.lado_max,
          calidad: ciclo.imagen.calidad,
        });

        const orden = ordenExistente ?? (contadorOrden.current[momento] ?? 0) + 1;
        contadorOrden.current[momento] = Math.max(contadorOrden.current[momento] ?? 0, orden);

        const ruta = rutaFoto(ciclo.clave, sistema.clave, elemento.codigo, momento, orden);

        const supabase = createClient();
        const { error: errorSubida } = await supabase.storage
          .from(DEPOSITO)
          .upload(ruta, blob, { contentType: "image/jpeg", upsert: true });
        if (errorSubida) throw errorSubida;

        const { foto } = await agregarFoto({
          elementoId: elemento.id,
          sistemaId: sistema.id,
          cicloId: ciclo.id,
          momento,
          ruta,
          ancho,
          alto,
          bytes: blob.size,
        });

        setFotosLocales((prev) =>
          prev.map((f) =>
            f.key === key
              ? { ...f, estado: "subida", fotoId: foto.id, orden, previewUrl: URL.createObjectURL(blob) }
              : f,
          ),
        );
      } catch {
        setFotosLocales((prev) => prev.map((f) => (f.key === key ? { ...f, estado: "error" } : f)));
      }
    },
    [ciclo, sistema, elemento],
  );

  const reintentar = useCallback(
    (key: string) => {
      const item = fotosLocales.find((f) => f.key === key);
      if (!item?.archivoOriginal) return;
      void subirArchivo(item.momento, item.archivoOriginal, key, item.orden);
    },
    [fotosLocales, subirArchivo],
  );

  // El borrador local sólo se lee después de montar, nunca durante el
  // primer render: si se leyera antes, el HTML del cliente no coincidiría
  // con el que ya mandó el servidor y React marcaría un error de
  // hidratación. Ver docs/flujos-de-usuario.md RF-07. Es exactamente el
  // patrón de "leer una vez un almacén externo al montar", por lo que la
  // regla de no llamar setState dentro de un efecto no aplica aquí.
  useEffect(() => {
    const guardado = window.localStorage.getItem(claveDraft);
    if (!guardado) return;
    try {
      const draft = JSON.parse(guardado) as { textos?: typeof textos; valores?: typeof valores };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única del borrador al montar, ver comentario arriba
      if (draft.textos) setTextos(draft.textos);
      if (draft.valores) setValores(draft.valores);
    } catch {
      // borrador corrupto: se ignora, no se pierde nada crítico
    }
  }, [claveDraft]);

  useEffect(() => {
    window.localStorage.setItem(claveDraft, JSON.stringify({ textos, valores }));
  }, [claveDraft, textos, valores]);

  // Reintenta las fotos que quedaron en error en cuanto vuelve la señal.
  useEffect(() => {
    function alRecuperarConexion() {
      fotosLocales.filter((f) => f.estado === "error").forEach((f) => reintentar(f.key));
    }
    window.addEventListener("online", alRecuperarConexion);
    return () => window.removeEventListener("online", alRecuperarConexion);
  }, [fotosLocales, reintentar]);

  async function manejarSeleccion(momento: string, lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    for (const archivo of Array.from(lista)) {
      const key = crypto.randomUUID();
      setFotosLocales((prev) => [
        ...prev,
        { key, momento, previewUrl: URL.createObjectURL(archivo), estado: "subiendo", orden: 0 },
      ]);
      // Secuencial a propósito: si dos fotos del mismo bloque subieran en
      // paralelo, el contador de orden podría leerse antes de que la
      // anterior lo actualice.
      await subirArchivo(momento, archivo, key);
    }
  }

  async function manejarEliminar(key: string) {
    const item = fotosLocales.find((f) => f.key === key);
    if (!item) return;
    if (item.estado !== "subida" || !item.fotoId) {
      setFotosLocales((prev) => prev.filter((f) => f.key !== key));
      return;
    }
    try {
      await eliminarFoto(item.fotoId, ciclo.id, sistema.id);
      setFotosLocales((prev) => prev.filter((f) => f.key !== key));
    } catch {
      setMensaje("No se pudo quitar la fotografía. Intenta de nuevo.");
    }
  }

  const accionGuardar = guardarYSiguiente.bind(null, {
    elementoId: elemento.id,
    sistemaClave: sistema.clave,
    cicloId: ciclo.id,
    sistemaId: sistema.id,
    esCapturaDirecta,
  });

  const estadoActual = calcularEstado(plantilla, { ...textos, valores }, conteoPorMomento(fotosLocales));

  return (
    <div className="pb-24">
      <Link href={volverHref} className="text-sm text-vw-dsb-60 hover:text-vw-vivid-green">
        ← {volverEtiqueta}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-vw-deep-space">{elemento.nombre}</h1>
          <p className="mt-1 text-sm text-vw-dsb-60">
            {[elemento.zona, elemento.ubicacion].filter(Boolean).join(" · ") || "Sin ubicación registrada"}
          </p>
        </div>
        <EstadoActual estado={estadoActual} />
      </div>

      {elemento.notas && (
        <p className="mt-3 border border-vw-amber/40 bg-vw-amber/10 px-3 py-2 text-sm text-vw-deep-space">
          {elemento.notas}
        </p>
      )}

      {mensaje && (
        <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
          {mensaje}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {plantilla.fotos.map((bloque) => (
          <BloqueFoto
            key={bloque.id}
            etiqueta={bloque.etiqueta}
            momento={bloque.id}
            fotos={fotosLocales.filter((f) => f.momento === bloque.id)}
            onSeleccion={(lista) => manejarSeleccion(bloque.id, lista)}
            onEliminar={manejarEliminar}
            onReintentar={reintentar}
          />
        ))}
      </div>

      <form action={accionGuardar} className="mt-8 space-y-6">
        {plantilla.texto_libre.includes("como_se_encontro") && (
          <CampoTexto
            etiqueta="Cómo se encontró"
            name="como_se_encontro"
            valor={textos.como_se_encontro}
            onChange={(v) => setTextos((t) => ({ ...t, como_se_encontro: v }))}
          />
        )}
        {plantilla.texto_libre.includes("que_se_realizo") && (
          <CampoTexto
            etiqueta="Qué se le realizó"
            name="que_se_realizo"
            valor={textos.que_se_realizo}
            onChange={(v) => setTextos((t) => ({ ...t, que_se_realizo: v }))}
          />
        )}
        {plantilla.texto_libre.includes("pendientes") && (
          <CampoTexto
            etiqueta="Pendientes"
            name="pendientes"
            valor={textos.pendientes}
            onChange={(v) => setTextos((t) => ({ ...t, pendientes: v }))}
          />
        )}

        {plantilla.puntos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-vw-deep-space">Puntos de revisión</h2>
            {plantilla.puntos.map((punto) => (
              <ControlPunto
                key={punto.id}
                punto={punto}
                valor={valores[punto.id]}
                onChange={(v) => setValores((prev) => ({ ...prev, [punto.id]: v }))}
              />
            ))}
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-vw-dsb-20 bg-white p-4">
          <div className="mx-auto max-w-3xl">
            <BotonGuardar
              alEnviar={(evento) => {
                const pendientesLista = faltantes(plantilla, { ...textos, valores }, conteoPorMomento(fotosLocales));
                if (pendientesLista.length > 0) {
                  const continuar = window.confirm(
                    `Falta: ${pendientesLista.join(", ")}.\n\n¿Guardar de todos modos como parcial?`,
                  );
                  if (!continuar) {
                    evento.preventDefault();
                    return;
                  }
                }
                window.localStorage.removeItem(claveDraft);
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

/** useFormStatus() sólo ve el estado del <form> más cercano cuando se
 * llama desde un hijo de ese form — ver la misma nota en
 * app/(app)/recepcion/Recepcion.tsx (BotonAsignar). */
function BotonGuardar({ alEnviar }: { alEnviar: (evento: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-vw-vivid-green px-4 py-3 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
      onClick={alEnviar}
    >
      {pending ? "Guardando…" : "Guardar y siguiente"}
    </button>
  );
}

function EstadoActual({ estado }: { estado: "sin_iniciar" | "parcial" | "completo" }) {
  const texto = estado === "completo" ? "Completo" : estado === "parcial" ? "Parcial" : "Sin iniciar";
  const clases =
    estado === "completo"
      ? "bg-vw-green/15 text-vw-green"
      : estado === "parcial"
        ? "bg-vw-amber/25 text-vw-deep-space"
        : "bg-vw-dsb-10 text-vw-dsb-60";
  return <span className={`shrink-0 px-2 py-1 text-xs font-medium ${clases}`}>{texto}</span>;
}

function BloqueFoto({
  etiqueta,
  momento,
  fotos,
  onSeleccion,
  onEliminar,
  onReintentar,
}: {
  etiqueta: string;
  momento: string;
  fotos: FotoLocal[];
  onSeleccion: (lista: FileList | null) => void;
  onEliminar: (key: string) => void;
  onReintentar: (key: string) => void;
}) {
  const inputId = `foto-${momento}`;
  return (
    <div>
      <p className="text-sm font-medium text-vw-deep-space">{etiqueta}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {fotos.map((f) => (
          <div key={f.key} className="relative h-24 w-24 shrink-0 border border-vw-dsb-20">
            {f.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-vw-dsb-10 text-xs text-vw-dsb-60">
                sin vista previa
              </div>
            )}
            {f.estado === "subiendo" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-vw-deep-space">
                Subiendo…
              </div>
            )}
            {f.estado === "error" && (
              <button
                type="button"
                onClick={() => onReintentar(f.key)}
                className="absolute inset-0 flex items-center justify-center bg-vw-red/80 text-xs font-medium text-white"
              >
                Reintentar
              </button>
            )}
            {f.estado === "subida" && (
              <button
                type="button"
                onClick={() => onEliminar(f.key)}
                aria-label="Quitar fotografía"
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-vw-deep-space text-xs text-white"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <label
          htmlFor={inputId}
          className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center border border-dashed border-vw-dsb-20 text-center text-xs text-vw-dsb-60 transition hover:border-vw-vivid-green hover:text-vw-vivid-green"
        >
          + Agregar
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onSeleccion(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function CampoTexto({
  etiqueta,
  name,
  valor,
  onChange,
}: {
  etiqueta: string;
  name: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-vw-deep-space">
        {etiqueta}
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green"
      />
    </div>
  );
}

/** Codifica un valor si_no/si_no_na para el <input type="hidden"> que
 * viaja en FormData — HTML sólo transporta cadenas. actions.ts lo decodifica
 * de vuelta consultando el tipo del punto en la plantilla. Cuando el punto
 * no se ha contestado (valor === undefined) el hidden ni se renderiza: la
 * llave debe estar ausente de FormData, no presente con un valor vacío,
 * para que la regla de "presencia de la llave" de lib/estado.ts funcione
 * (ver docs/modelo-de-datos.md §3.3). */
function codificarSiNo(valor: boolean | null): string {
  return valor === null ? "na" : String(valor);
}

function ControlPunto({
  punto,
  valor,
  onChange,
}: {
  punto: PuntoDef;
  valor: ValorPunto | undefined;
  onChange: (v: ValorPunto) => void;
}) {
  const nombreCampo = `valores.${punto.id}`;

  if (punto.tipo === "si_no" || punto.tipo === "si_no_na") {
    const opciones: { valor: boolean | null; etiqueta: string }[] =
      punto.tipo === "si_no"
        ? [
            { valor: true, etiqueta: "Sí" },
            { valor: false, etiqueta: "No" },
          ]
        : [
            { valor: true, etiqueta: "Sí" },
            { valor: false, etiqueta: "No" },
            { valor: null, etiqueta: "N/A" },
          ];
    return (
      <div>
        <p className="text-sm text-vw-deep-space">
          {punto.etiqueta}
          {punto.requerido && <span className="text-vw-red"> *</span>}
        </p>
        {valor !== undefined && (
          <input type="hidden" name={nombreCampo} value={codificarSiNo(valor as boolean | null)} />
        )}
        <div className="mt-1 flex gap-2">
          {opciones.map((op) => (
            <button
              key={op.etiqueta}
              type="button"
              onClick={() => onChange(op.valor)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                valor === op.valor
                  ? "bg-vw-deep-space text-white"
                  : "border border-vw-dsb-20 text-vw-deep-space hover:border-vw-vivid-green"
              }`}
            >
              {op.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const valorTexto = typeof valor === "string" ? valor : "";

  if (punto.tipo === "seleccion") {
    return (
      <div>
        <label htmlFor={punto.id} className="block text-sm text-vw-deep-space">
          {punto.etiqueta}
          {punto.requerido && <span className="text-vw-red"> *</span>}
        </label>
        <select
          id={punto.id}
          name={nombreCampo}
          value={valorTexto}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green"
        >
          <option value="">— Seleccionar —</option>
          {(punto.opciones ?? []).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const tipoInput = punto.tipo === "numero" ? "number" : punto.tipo === "fecha" ? "date" : "text";
  return (
    <div>
      <label htmlFor={punto.id} className="block text-sm text-vw-deep-space">
        {punto.etiqueta}
        {punto.requerido && <span className="text-vw-red"> *</span>}
      </label>
      <input
        id={punto.id}
        name={nombreCampo}
        type={tipoInput}
        value={valorTexto}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green"
      />
    </div>
  );
}
