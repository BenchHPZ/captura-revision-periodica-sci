"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { EstadoBadge } from "@/components/EstadoBadge";
import { createClient } from "@/lib/supabase/client";
import { reducirImagen } from "@/lib/imagen";
import { DEPOSITO, rutaEntrada } from "@/lib/rutas";
import { normaliza } from "@/lib/texto";
import type { Estado } from "@/lib/tipos";
import { asignarEntrada, descartarEntrada, registrarEntrada } from "./actions";

interface ElementoResumen {
  id: string;
  codigo: string;
  nombre: string;
  zona: string | null;
  ubicacion: string | null;
  estado: Estado;
}

interface MomentoResumen {
  id: string;
  etiqueta: string;
}

interface SistemaRecepcion {
  id: string;
  clave: string;
  nombre: string;
  elementos: ElementoResumen[];
  momentos: MomentoResumen[];
}

interface EntradaInicial {
  id: string;
  nombreOriginal: string | null;
  bytes: number | null;
  url: string | null;
}

interface Props {
  ciclo: { id: string; clave: string; imagen: { lado_max: number; calidad: number; formato: string } };
  sistemas: SistemaRecepcion[];
  entradasIniciales: EntradaInicial[];
}

interface EntradaLocal {
  key: string;
  entradaId?: string;
  nombreOriginal: string;
  previewUrl: string;
  fase: "subiendo" | "lista" | "error";
  archivoOriginal?: File;
}

export function Recepcion({ ciclo, sistemas, entradasIniciales }: Props) {
  const [entradas, setEntradas] = useState<EntradaLocal[]>(() =>
    entradasIniciales.map((e) => ({
      key: e.id,
      entradaId: e.id,
      nombreOriginal: e.nombreOriginal ?? "(sin nombre)",
      previewUrl: e.url ?? "",
      fase: "lista" as const,
    })),
  );
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [arrastrando, setArrastrando] = useState(false);
  const [sistemaElegido, setSistemaElegido] = useState<SistemaRecepcion | null>(null);
  const [elementoElegido, setElementoElegido] = useState<ElementoResumen | null>(null);
  const [momentoElegido, setMomentoElegido] = useState("");
  const [busquedaElemento, setBusquedaElemento] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function subirUnaEntrada(archivo: File) {
    const key = crypto.randomUUID();
    setEntradas((prev) => [
      ...prev,
      {
        key,
        nombreOriginal: archivo.name,
        previewUrl: URL.createObjectURL(archivo),
        fase: "subiendo",
        archivoOriginal: archivo,
      },
    ]);

    try {
      const { blob } = await reducirImagen(archivo, {
        ladoMax: ciclo.imagen.lado_max,
        calidad: ciclo.imagen.calidad,
      });
      const ruta = rutaEntrada(ciclo.clave);

      const supabase = createClient();
      const { error } = await supabase.storage
        .from(DEPOSITO)
        .upload(ruta, blob, { contentType: "image/jpeg" });
      if (error) throw error;

      const registrada = await registrarEntrada({
        cicloId: ciclo.id,
        ruta,
        nombreOriginal: archivo.name,
        bytes: blob.size,
      });

      setEntradas((prev) =>
        prev.map((e) =>
          e.key === key
            ? { ...e, fase: "lista", entradaId: registrada.id, previewUrl: URL.createObjectURL(blob) }
            : e,
        ),
      );
    } catch {
      setEntradas((prev) => prev.map((e) => (e.key === key ? { ...e, fase: "error" } : e)));
    }
  }

  function reintentar(key: string) {
    const item = entradas.find((e) => e.key === key);
    if (!item?.archivoOriginal) return;
    setEntradas((prev) => prev.filter((e) => e.key !== key));
    void subirUnaEntrada(item.archivoOriginal);
  }

  async function procesarArchivos(lista: FileList | File[] | null) {
    if (!lista) return;
    const archivos = Array.from(lista).filter((a) => a.type.startsWith("image/"));
    // En paralelo a propósito: a diferencia de las fotos de un elemento,
    // cada entrada es un renglón independiente sin un contador de orden
    // que puedan pisarse entre sí.
    await Promise.all(archivos.map((archivo) => subirUnaEntrada(archivo)));
  }

  function alternarSeleccion(key: string) {
    setSeleccionadas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(key)) siguiente.delete(key);
      else siguiente.add(key);
      return siguiente;
    });
  }

  function elegirSistema(sistema: SistemaRecepcion) {
    setSistemaElegido(sistema);
    setElementoElegido(null);
    setMomentoElegido("");
    setBusquedaElemento("");
  }

  const elementosFiltrados = useMemo(() => {
    if (!sistemaElegido) return [];
    const q = normaliza(busquedaElemento.trim());
    if (!q) return sistemaElegido.elementos;
    return sistemaElegido.elementos.filter((e) =>
      [e.codigo, e.nombre, e.ubicacion, e.zona].some((campo) => campo && normaliza(campo).includes(q)),
    );
  }, [sistemaElegido, busquedaElemento]);

  async function descartarSeleccionadas() {
    const idsListas = [...seleccionadas]
      .map((key) => entradas.find((e) => e.key === key)?.entradaId)
      .filter((id): id is string => Boolean(id));
    if (idsListas.length === 0) return;
    try {
      await descartarEntrada(idsListas);
      setEntradas((prev) => prev.filter((e) => !seleccionadas.has(e.key)));
      setSeleccionadas(new Set());
    } catch {
      setMensaje("No se pudo descartar. Intenta de nuevo.");
    }
  }

  const entradaIdsSeleccionadas = [...seleccionadas]
    .map((key) => entradas.find((e) => e.key === key)?.entradaId)
    .filter((id): id is string => Boolean(id));

  const accionAsignar = asignarEntrada.bind(null, ciclo.id, ciclo.clave);

  return (
    <div className="pb-28">
      <h1 className="text-2xl text-vw-deep-space">Recepción</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">
        Fotografías de hidrantes exteriores, válvulas aéreas y válvulas subterráneas enviadas por
        WhatsApp.
      </p>

      {mensaje && (
        <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">
          {mensaje}
        </p>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          void procesarArchivos(e.dataTransfer.files);
        }}
        className={`mt-4 flex h-28 cursor-pointer items-center justify-center border border-dashed text-center text-sm transition ${
          arrastrando
            ? "border-vw-vivid-green bg-vw-vg-10 text-vw-vivid-green"
            : "border-vw-dsb-20 text-vw-dsb-60 hover:border-vw-vivid-green hover:text-vw-vivid-green"
        }`}
      >
        Arrastra las fotografías aquí, o toca para elegirlas
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void procesarArchivos(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {entradas.map((e) => (
          <div
            key={e.key}
            className={`relative aspect-square border ${
              seleccionadas.has(e.key) ? "border-vw-vivid-green ring-2 ring-vw-vivid-green" : "border-vw-dsb-20"
            }`}
          >
            {e.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-vw-dsb-10 text-xs text-vw-dsb-60">
                sin vista previa
              </div>
            )}

            <p className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white">
              {e.nombreOriginal}
            </p>

            {e.fase === "subiendo" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-vw-deep-space">
                Subiendo…
              </div>
            )}
            {e.fase === "error" && (
              <button
                type="button"
                onClick={() => reintentar(e.key)}
                className="absolute inset-0 flex items-center justify-center bg-vw-red/80 text-xs font-medium text-white"
              >
                Reintentar
              </button>
            )}
            {e.fase === "lista" && (
              <button
                type="button"
                onClick={() => alternarSeleccion(e.key)}
                aria-label={seleccionadas.has(e.key) ? "Quitar de la selección" : "Seleccionar"}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center border border-white bg-vw-deep-space/80 text-xs text-white"
              >
                {seleccionadas.has(e.key) ? "✓" : ""}
              </button>
            )}
          </div>
        ))}
        {entradas.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-vw-dsb-60">
            No hay fotografías pendientes de clasificar.
          </p>
        )}
      </div>

      {seleccionadas.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto border-t border-vw-dsb-20 bg-white p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-vw-deep-space">
                {seleccionadas.size} fotografía{seleccionadas.size === 1 ? "" : "s"} seleccionada
                {seleccionadas.size === 1 ? "" : "s"}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSeleccionadas(new Set())}
                  className="text-sm text-vw-dsb-60 hover:text-vw-deep-space"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={descartarSeleccionadas}
                  className="text-sm text-vw-red hover:underline"
                >
                  Descartar
                </button>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium uppercase text-vw-dsb-60">Sistema</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {sistemas.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => elegirSistema(s)}
                    className={`px-3 py-1.5 text-sm font-medium transition ${
                      sistemaElegido?.id === s.id
                        ? "bg-vw-deep-space text-white"
                        : "border border-vw-dsb-20 text-vw-deep-space hover:border-vw-vivid-green"
                    }`}
                  >
                    {s.nombre}
                  </button>
                ))}
              </div>
            </div>

            {sistemaElegido && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase text-vw-dsb-60">Elemento</p>
                <input
                  type="search"
                  value={busquedaElemento}
                  onChange={(e) => setBusquedaElemento(e.target.value)}
                  placeholder="Buscar por identificador, nombre o ubicación…"
                  className="mt-1 w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green"
                />
                <div className="mt-1 max-h-40 overflow-y-auto border border-vw-dsb-10">
                  {elementosFiltrados.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setElementoElegido(e)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                        elementoElegido?.id === e.id ? "bg-vw-vg-10 text-vw-deep-space" : "hover:bg-vw-vg-10"
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-medium">{e.nombre}</span>
                        {e.ubicacion && <span className="text-vw-dsb-60"> · {e.ubicacion}</span>}
                      </span>
                      <EstadoBadge estado={e.estado} />
                    </button>
                  ))}
                  {elementosFiltrados.length === 0 && (
                    <p className="px-3 py-2 text-sm text-vw-dsb-60">Sin coincidencias.</p>
                  )}
                </div>
              </div>
            )}

            {sistemaElegido && elementoElegido && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase text-vw-dsb-60">Momento</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {sistemaElegido.momentos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMomentoElegido(m.id)}
                      className={`px-3 py-1.5 text-sm font-medium transition ${
                        momentoElegido === m.id
                          ? "bg-vw-deep-space text-white"
                          : "border border-vw-dsb-20 text-vw-deep-space hover:border-vw-vivid-green"
                      }`}
                    >
                      {m.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form action={accionAsignar} className="mt-4">
              <input type="hidden" name="sistemaId" value={sistemaElegido?.id ?? ""} />
              <input type="hidden" name="sistemaClave" value={sistemaElegido?.clave ?? ""} />
              <input type="hidden" name="elementoId" value={elementoElegido?.id ?? ""} />
              <input type="hidden" name="elementoCodigo" value={elementoElegido?.codigo ?? ""} />
              <input type="hidden" name="momento" value={momentoElegido} />
              {entradaIdsSeleccionadas.map((id) => (
                <input key={id} type="hidden" name="entradaId" value={id} />
              ))}
              <BotonAsignar
                faltaElegir={!sistemaElegido || !elementoElegido || !momentoElegido}
                nombreElemento={elementoElegido?.nombre}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * useFormStatus() sólo ve el estado del <form> más cercano cuando se
 * llama desde un componente hijo de ese form — de ahí que el botón viva
 * aparte en vez de leer un estado "asignando" llevado a mano en
 * Recepcion. Con un estado manual, un error que no redirige (la acción
 * lanza en vez de navegar) habría dejado el botón deshabilitado para
 * siempre; `pending` se resuelve solo en cualquier desenlace.
 */
function BotonAsignar({
  faltaElegir,
  nombreElemento,
}: {
  faltaElegir: boolean;
  nombreElemento: string | undefined;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={faltaElegir || pending}
      className="w-full bg-vw-vivid-green px-4 py-3 font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
    >
      {pending
        ? "Asignando…"
        : nombreElemento
          ? `Asignar a ${nombreElemento}`
          : "Elige sistema, elemento y momento"}
    </button>
  );
}
