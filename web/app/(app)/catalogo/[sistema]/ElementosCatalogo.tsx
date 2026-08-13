"use client";

import { useMemo, useState } from "react";
import { normaliza } from "@/lib/texto";
import type { Elemento } from "@/lib/tipos";
import { actualizarElemento, cambiarActivo, crearElemento, type DatosElemento } from "./actions";

interface Props {
  ciclo: { id: string; clave: string };
  sistema: { id: string; clave: string };
  elementosIniciales: Elemento[];
}

const CAMPOS_VACIOS: DatosElemento = {
  codigo: "",
  nombre: "",
  zona: "",
  ubicacion: "",
  referencia: "",
  seccion: "",
  orden_seccion: null,
  tipo: "",
  responsable: "",
};

const LIMITE_PALABRAS_REFERENCIA = 5;

function contarPalabras(texto: string): number {
  return texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;
}

export function ElementosCatalogo({ ciclo, sistema, elementosIniciales }: Props) {
  const [elementos, setElementos] = useState<Elemento[]>(elementosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = normaliza(busqueda.trim());
    return elementos.filter((e) => {
      if (!mostrarInactivos && !e.activo) return false;
      if (!q) return true;
      return [e.codigo, e.nombre, e.ubicacion, e.zona, e.referencia].some(
        (campo) => campo && normaliza(campo).includes(q),
      );
    });
  }, [elementos, busqueda, mostrarInactivos]);

  function codigoRepetido(codigo: string, ignorarId?: string) {
    return elementos.some((e) => e.id !== ignorarId && e.codigo === codigo);
  }

  async function alCrear(datos: DatosElemento) {
    if (codigoRepetido(datos.codigo)) {
      setMensaje(`Ya existe un elemento con el código "${datos.codigo}" en este sistema.`);
      return;
    }
    try {
      const nuevo = await crearElemento(ciclo.id, sistema.id, datos);
      setElementos((prev) => [...prev, nuevo]);
      setAgregando(false);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo crear el elemento.");
    }
  }

  async function alActualizar(elemento: Elemento, datos: DatosElemento) {
    if (codigoRepetido(datos.codigo, elemento.id)) {
      setMensaje(`Ya existe un elemento con el código "${datos.codigo}" en este sistema.`);
      return;
    }
    try {
      await actualizarElemento(elemento.id, ciclo.clave, sistema.clave, elemento.codigo, datos);
      setElementos((prev) => prev.map((e) => (e.id === elemento.id ? { ...e, ...datos } : e)));
      setEditandoId(null);
      setMensaje(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar el elemento.");
    }
  }

  async function alCambiarActivo(elemento: Elemento) {
    const activar = !elemento.activo;
    if (
      !activar &&
      !window.confirm(`¿Dar de baja "${elemento.nombre}"? No se borra nada; se puede reactivar después.`)
    ) {
      return;
    }
    try {
      await cambiarActivo(elemento.id, activar);
      setElementos((prev) => prev.map((e) => (e.id === elemento.id ? { ...e, activo: activar } : e)));
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo cambiar el estado del elemento.");
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-vw-deep-space">Elementos</h2>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          className="bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80"
        >
          {agregando ? "Cancelar" : "+ Agregar elemento"}
        </button>
      </div>

      {mensaje && (
        <p className="mt-3 border border-vw-red/40 bg-vw-red/10 px-3 py-2 text-sm text-vw-deep-space">{mensaje}</p>
      )}

      {agregando && (
        <div className="mt-3 border border-vw-dsb-20 p-3">
          <FormularioElemento inicial={CAMPOS_VACIOS} onGuardar={alCrear} onCancelar={() => setAgregando(false)} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por identificador, nombre o ubicación…"
          className="w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green sm:max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-vw-dsb-60">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar de baja
        </label>
      </div>

      <ul className="mt-4 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
        {filtrados.map((e) => (
          <li key={e.id}>
            {editandoId === e.id ? (
              <div className="p-3">
                <FormularioElemento
                  inicial={{
                    codigo: e.codigo,
                    nombre: e.nombre,
                    zona: e.zona ?? "",
                    ubicacion: e.ubicacion ?? "",
                    referencia: e.referencia ?? "",
                    seccion: e.seccion ?? "",
                    orden_seccion: e.orden_seccion,
                    tipo: e.tipo ?? "",
                    responsable: e.responsable ?? "",
                  }}
                  onGuardar={(datos) => alActualizar(e, datos)}
                  onCancelar={() => setEditandoId(null)}
                />
              </div>
            ) : (
              <div className={`flex items-center justify-between gap-3 px-1 py-3 ${e.activo ? "" : "opacity-50"}`}>
                <button type="button" onClick={() => setEditandoId(e.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-vw-deep-space">
                    {e.codigo} — {e.nombre}
                  </p>
                  <p className="truncate text-sm text-vw-dsb-60">
                    {[e.zona, e.ubicacion, e.referencia].filter(Boolean).join(" · ") || "Sin ubicación registrada"}
                    {e.responsable && ` · ${e.responsable}`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => alCambiarActivo(e)}
                  className="shrink-0 text-sm text-vw-dsb-60 hover:text-vw-red"
                >
                  {e.activo ? "Dar de baja" : "Reactivar"}
                </button>
              </div>
            )}
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="px-1 py-6 text-center text-sm text-vw-dsb-60">Ningún elemento coincide.</li>
        )}
      </ul>
    </section>
  );
}

/** Igual que DatosElemento, salvo 'orden_seccion': el formulario lo teclea
 * como texto (como cualquier input) y sólo se convierte a número al
 * enviar — evitar mezclar number|null con el valor en vivo del campo. */
type DatosFormulario = Omit<DatosElemento, "orden_seccion"> & { orden_seccion: string };

function aFormulario(datos: DatosElemento): DatosFormulario {
  return { ...datos, orden_seccion: datos.orden_seccion === null ? "" : String(datos.orden_seccion) };
}

function FormularioElemento({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosElemento;
  onGuardar: (datos: DatosElemento) => void | Promise<void>;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState<DatosFormulario>(() => aFormulario(inicial));
  const [enviando, setEnviando] = useState(false);
  const [errorReferencia, setErrorReferencia] = useState<string | null>(null);
  const [errorOrdenSeccion, setErrorOrdenSeccion] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const referencia = datos.referencia?.trim() || "";
    const palabras = contarPalabras(referencia);
    if (palabras > LIMITE_PALABRAS_REFERENCIA) {
      setErrorReferencia(`Máximo ${LIMITE_PALABRAS_REFERENCIA} palabras (tiene ${palabras}).`);
      return;
    }
    setErrorReferencia(null);

    const ordenSeccionTexto = datos.orden_seccion.trim();
    if (ordenSeccionTexto !== "" && Number.isNaN(Number(ordenSeccionTexto))) {
      setErrorOrdenSeccion("Debe ser un número.");
      return;
    }
    setErrorOrdenSeccion(null);

    setEnviando(true);
    try {
      await onGuardar({
        codigo: datos.codigo.trim(),
        nombre: datos.nombre.trim(),
        zona: datos.zona?.trim() || null,
        ubicacion: datos.ubicacion?.trim() || null,
        referencia: referencia || null,
        seccion: datos.seccion?.trim() || null,
        orden_seccion: ordenSeccionTexto === "" ? null : Number(ordenSeccionTexto),
        tipo: datos.tipo?.trim() || null,
        responsable: datos.responsable?.trim() || null,
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <CampoTexto
        etiqueta="Identificador"
        valor={datos.codigo}
        onChange={(v) => setDatos((d) => ({ ...d, codigo: v }))}
        requerido
      />
      <CampoTexto
        etiqueta="Rótulo"
        valor={datos.nombre}
        onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
        requerido
      />
      <CampoTexto etiqueta="Zona" valor={datos.zona ?? ""} onChange={(v) => setDatos((d) => ({ ...d, zona: v }))} />
      <CampoTexto
        etiqueta="Ubicación"
        valor={datos.ubicacion ?? ""}
        onChange={(v) => setDatos((d) => ({ ...d, ubicacion: v }))}
      />
      <div>
        <CampoTexto
          etiqueta={`Referencia (≤${LIMITE_PALABRAS_REFERENCIA} palabras)`}
          valor={datos.referencia ?? ""}
          onChange={(v) => {
            setErrorReferencia(null);
            setDatos((d) => ({ ...d, referencia: v }));
          }}
        />
        {errorReferencia && <p className="mt-1 text-xs text-vw-red">{errorReferencia}</p>}
      </div>
      <CampoTexto
        etiqueta="Sección del RAG"
        valor={datos.seccion ?? ""}
        onChange={(v) => setDatos((d) => ({ ...d, seccion: v }))}
      />
      <div>
        <CampoTexto
          etiqueta="Orden de la sección"
          valor={datos.orden_seccion}
          onChange={(v) => {
            setErrorOrdenSeccion(null);
            setDatos((d) => ({ ...d, orden_seccion: v }));
          }}
        />
        {errorOrdenSeccion && <p className="mt-1 text-xs text-vw-red">{errorOrdenSeccion}</p>}
      </div>
      <CampoTexto etiqueta="Tipo" valor={datos.tipo ?? ""} onChange={(v) => setDatos((d) => ({ ...d, tipo: v }))} />
      <CampoTexto
        etiqueta="Responsable"
        valor={datos.responsable ?? ""}
        onChange={(v) => setDatos((d) => ({ ...d, responsable: v }))}
      />
      <div className="col-span-full flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancelar} className="text-sm text-vw-dsb-60 hover:text-vw-deep-space">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CampoTexto({
  etiqueta,
  valor,
  onChange,
  requerido,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
}) {
  return (
    <label className="text-sm text-vw-deep-space">
      <span className="block text-xs text-vw-dsb-60">
        {etiqueta}
        {requerido && <span className="text-vw-red"> *</span>}
      </span>
      <input
        value={valor}
        required={requerido}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
      />
    </label>
  );
}
