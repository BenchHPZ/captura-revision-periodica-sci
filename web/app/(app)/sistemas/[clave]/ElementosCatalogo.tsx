"use client";

import { useMemo, useState } from "react";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/Boton";
import { BuscadorLista } from "@/components/BuscadorLista";
import { CampoSelect, CampoTexto } from "@/components/Campo";
import { normaliza } from "@/lib/texto";
import type { Elemento, TipoDiccionario, Zona } from "@/lib/tipos";
import { actualizarElemento, cambiarActivo, crearElemento, type DatosElemento } from "./actions";

interface Props {
  ciclo: { id: string; clave: string };
  sistema: { id: string; clave: string };
  elementosIniciales: Elemento[];
  zonas: Zona[];
  tipos: TipoDiccionario[];
}

const CAMPOS_VACIOS: DatosElemento = {
  codigo: "",
  nombre: "",
  ubicacion: "",
  referencia: "",
  zona_id: null,
  orden_anclado: null,
  tipo: "",
  responsable: "",
};

const LIMITE_PALABRAS_REFERENCIA = 5;

function contarPalabras(texto: string): number {
  return texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;
}

/** Antes 'zona' y 'seccion' eran texto libre — el mismo dato tecleado dos
 * veces (docs/decisiones.md D-18). Ahora 'zona_id' se elige del catálogo
 * único de la planta, y 'tipo' del diccionario del sistema (D-18/D-19). */
export function ElementosCatalogo({ ciclo, sistema, elementosIniciales, zonas, tipos }: Props) {
  const [elementos, setElementos] = useState<Elemento[]>(elementosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const zonaPorId = useMemo(() => new Map(zonas.map((z) => [z.id, z])), [zonas]);
  const tipoPorClave = useMemo(() => new Map(tipos.map((t) => [t.clave, t])), [tipos]);

  const filtrados = useMemo(() => {
    const q = normaliza(busqueda.trim());
    return elementos.filter((e) => {
      if (!mostrarInactivos && !e.activo) return false;
      if (!q) return true;
      const zonaNombre = e.zona_id ? zonaPorId.get(e.zona_id)?.nombre : null;
      return [e.codigo, e.nombre, e.ubicacion, e.referencia, zonaNombre].some(
        (campo) => campo && normaliza(campo).includes(q),
      );
    });
  }, [elementos, busqueda, mostrarInactivos, zonaPorId]);

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
        <BotonPrimario onClick={() => setAgregando((v) => !v)}>{agregando ? "Cancelar" : "+ Agregar elemento"}</BotonPrimario>
      </div>

      {mensaje && <div className="mt-3"><Aviso tipo="error">{mensaje}</Aviso></div>}

      {agregando && (
        <div className="mt-3 border border-vw-dsb-20 p-3">
          <FormularioElemento inicial={CAMPOS_VACIOS} zonas={zonas} tipos={tipos} onGuardar={alCrear} onCancelar={() => setAgregando(false)} />
        </div>
      )}

      <div className="mt-4">
        <BuscadorLista
          valor={busqueda}
          onCambiar={setBusqueda}
          placeholder="Buscar por identificador, nombre, ubicación o zona…"
          extra={
            <label className="flex items-center gap-2 text-sm text-vw-dsb-60">
              <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />
              Mostrar de baja
            </label>
          }
        />
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
                    ubicacion: e.ubicacion ?? "",
                    referencia: e.referencia ?? "",
                    zona_id: e.zona_id,
                    orden_anclado: e.orden_anclado,
                    tipo: e.tipo ?? "",
                    responsable: e.responsable ?? "",
                  }}
                  zonas={zonas}
                  tipos={tipos}
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
                    {[e.zona_id ? zonaPorId.get(e.zona_id)?.nombre : null, e.ubicacion, e.referencia]
                      .filter(Boolean)
                      .join(" · ") || "Sin zona ni ubicación registrada"}
                    {e.tipo && ` · ${tipoPorClave.get(e.tipo)?.nombre ?? e.tipo}`}
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

/** Igual que DatosElemento, salvo que 'orden_anclado' se teclea como
 * texto y sólo se convierte a número al enviar. */
type DatosFormulario = Omit<DatosElemento, "orden_anclado"> & { orden_anclado: string };

function aFormulario(datos: DatosElemento): DatosFormulario {
  return { ...datos, orden_anclado: datos.orden_anclado === null ? "" : String(datos.orden_anclado) };
}

function FormularioElemento({
  inicial,
  zonas,
  tipos,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosElemento;
  zonas: Zona[];
  tipos: TipoDiccionario[];
  onGuardar: (datos: DatosElemento) => void | Promise<void>;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState<DatosFormulario>(() => aFormulario(inicial));
  const [enviando, setEnviando] = useState(false);
  const [errorReferencia, setErrorReferencia] = useState<string | null>(null);
  const [errorAnclado, setErrorAnclado] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const referencia = datos.referencia?.trim() || "";
    const palabras = contarPalabras(referencia);
    if (palabras > LIMITE_PALABRAS_REFERENCIA) {
      setErrorReferencia(`Máximo ${LIMITE_PALABRAS_REFERENCIA} palabras (tiene ${palabras}).`);
      return;
    }
    setErrorReferencia(null);

    const ancladoTexto = datos.orden_anclado.trim();
    if (ancladoTexto !== "" && Number.isNaN(Number(ancladoTexto))) {
      setErrorAnclado("Debe ser un número.");
      return;
    }
    setErrorAnclado(null);

    setEnviando(true);
    try {
      await onGuardar({
        codigo: datos.codigo.trim(),
        nombre: datos.nombre.trim(),
        ubicacion: datos.ubicacion?.trim() || null,
        referencia: referencia || null,
        zona_id: datos.zona_id || null,
        orden_anclado: ancladoTexto === "" ? null : Number(ancladoTexto),
        tipo: datos.tipo?.trim() || null,
        responsable: datos.responsable?.trim() || null,
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <CampoTexto etiqueta="Identificador" valor={datos.codigo} onChange={(v) => setDatos((d) => ({ ...d, codigo: v }))} requerido />
      <CampoTexto etiqueta="Rótulo" valor={datos.nombre} onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))} requerido />
      <CampoSelect
        etiqueta="Zona"
        valor={datos.zona_id ?? ""}
        onChange={(v) => setDatos((d) => ({ ...d, zona_id: v || null }))}
        opciones={zonas.filter((z) => z.activo).map((z) => ({ valor: z.id, etiqueta: z.nombre }))}
        vacioEtiqueta="— Sin zona —"
      />
      <CampoTexto etiqueta="Ubicación" valor={datos.ubicacion ?? ""} onChange={(v) => setDatos((d) => ({ ...d, ubicacion: v }))} />
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
      {tipos.length > 0 && (
        <CampoSelect
          etiqueta="Tipo"
          valor={datos.tipo ?? ""}
          onChange={(v) => setDatos((d) => ({ ...d, tipo: v }))}
          opciones={tipos.map((t) => ({ valor: t.clave, etiqueta: `${t.nombre} (${t.clave})` }))}
          vacioEtiqueta="— Sin tipo —"
        />
      )}
      <CampoTexto etiqueta="Responsable" valor={datos.responsable ?? ""} onChange={(v) => setDatos((d) => ({ ...d, responsable: v }))} />
      <div>
        <CampoTexto
          etiqueta="Posición fija (opcional)"
          valor={datos.orden_anclado}
          onChange={(v) => {
            setErrorAnclado(null);
            setDatos((d) => ({ ...d, orden_anclado: v }));
          }}
          placeholder="vacío = automática"
        />
        {errorAnclado && <p className="mt-1 text-xs text-vw-red">{errorAnclado}</p>}
      </div>
      <div className="col-span-full flex gap-3">
        <BotonPrimario type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
