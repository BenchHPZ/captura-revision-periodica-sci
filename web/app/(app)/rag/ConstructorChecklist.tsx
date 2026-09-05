"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/Boton";
import { Campo, CampoSelect, CampoTexto } from "@/components/Campo";
import { PanelExito, PanelVistaPrevia } from "@/components/PanelConfirmacion";
import { createClient } from "@/lib/supabase/client";
import { DIAS_POR_DEFECTO } from "@/lib/checklist/constantes";
import { DEPOSITO, rutaChecklistRef } from "@/lib/rutas";
import type { CampoAgrupacionChecklist } from "@/lib/tipos";
import {
  confirmarChecklist,
  previsualizarChecklist,
  type BloqueChecklistImportado,
  type ChecklistImportado,
  type ItemChecklistImportado,
  type ResumenChecklist,
} from "./actions";

type TipoBloqueChecklist = "portada_fotos" | "tabla_verificacion" | "tabla_simple" | "bitacora_libre";

const TIPOS_BLOQUE: { valor: TipoBloqueChecklist; etiqueta: string }[] = [
  { valor: "portada_fotos", etiqueta: "Portada de fotos" },
  { valor: "tabla_verificacion", etiqueta: "Tabla de verificación (con foto y verificaciones)" },
  { valor: "tabla_simple", etiqueta: "Tabla simple (descripción, sin foto)" },
  { valor: "bitacora_libre", etiqueta: "Bitácora libre (columnas fijas, sin fecha)" },
];

const ETIQUETA_CAMPO: Record<CampoAgrupacionChecklist, string> = {
  categoria: "Categoría",
  ubicacion_fisica: "Ubicación física",
};
const OTRO_CAMPO: Record<CampoAgrupacionChecklist, CampoAgrupacionChecklist> = {
  categoria: "ubicacion_fisica",
  ubicacion_fisica: "categoria",
};

interface ItemFila {
  key: string;
  categoria: string;
  ubicacionFisica: string;
  nombre: string;
  cantidad: string;
  verificacionesTexto: string;
  fotoRuta: string | null;
  subiendoFoto: boolean;
}

interface ColumnaFila {
  key: string;
  id: string;
  etiqueta: string;
}

interface BloqueFila {
  key: string;
  tipo: TipoBloqueChecklist;
  nombre: string;
  agrupacionExterna: CampoAgrupacionChecklist | "";
  agrupacionInterna: CampoAgrupacionChecklist | "";
  items: ItemFila[];
  columnas: ColumnaFila[];
  filasBlanco: number;
}

type Estado =
  | { fase: "editando" }
  | { fase: "calculando" }
  | { fase: "revision"; datos: ChecklistImportado; resumen: ResumenChecklist }
  | { fase: "guardando" }
  | { fase: "guardado"; resumen: ResumenChecklist }
  | { fase: "error"; mensaje: string };

function nuevaClave(): string {
  return crypto.randomUUID();
}

function crearItem(): ItemFila {
  return {
    key: nuevaClave(),
    categoria: "",
    ubicacionFisica: "",
    nombre: "",
    cantidad: "",
    verificacionesTexto: "",
    fotoRuta: null,
    subiendoFoto: false,
  };
}

function crearBloque(tipo: TipoBloqueChecklist): BloqueFila {
  return {
    key: nuevaClave(),
    tipo,
    nombre: "",
    agrupacionExterna: "",
    agrupacionInterna: "",
    items: [],
    columnas: [],
    filasBlanco: 10,
  };
}

function mover<T>(lista: T[], indice: number, direccion: -1 | 1): T[] {
  const j = indice + direccion;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  const a = copia[indice]!;
  const b = copia[j]!;
  copia[indice] = b;
  copia[j] = a;
  return copia;
}

function slug(texto: string): string {
  return (
    texto
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "verificacion"
  );
}

/** Inversos de construirJson() \u2014 hidratan el formulario cuando se abre en
 * modo edici\u00f3n (ver Props.inicial). Los `key` de React se regeneran aqu\u00ed
 * (no se conservan del backend): s\u00f3lo identifican filas en el DOM
 * mientras se edita, nunca viajan de vuelta al servidor. Un `pos` que
 * venga en el JSON (checklist viejo, ya importado) se ignora a prop\u00f3sito
 * \u2014 ya nada lo imprime, ver docs/decisiones.md D-24. */
function itemFilaDesdeImportado(it: ItemChecklistImportado): ItemFila {
  return {
    key: nuevaClave(),
    categoria: it.categoria ?? "",
    ubicacionFisica: it.ubicacion_fisica ?? "",
    nombre: it.nombre,
    cantidad: it.cantidad ?? "",
    verificacionesTexto: (it.verificaciones ?? []).map((v) => v.etiqueta).join(", "),
    fotoRuta: it.foto_referencia_ruta ?? null,
    subiendoFoto: false,
  };
}

function bloqueFilaDesdeImportado(b: BloqueChecklistImportado): BloqueFila {
  const agrupacion = b.agrupacion ?? [];
  const items = [...(b.items ?? [])].sort((a, c) => (a.orden ?? 0) - (c.orden ?? 0));
  return {
    key: nuevaClave(),
    tipo: b.tipo,
    nombre: b.nombre,
    agrupacionExterna: agrupacion[0] ?? "",
    agrupacionInterna: agrupacion[1] ?? "",
    items: items.map(itemFilaDesdeImportado),
    columnas: (b.columnas ?? []).map((c) => ({ key: nuevaClave(), id: c.id, etiqueta: c.etiqueta })),
    filasBlanco: b.filas_blanco ?? 10,
  };
}

interface Props {
  /** Presente sólo al editar un checklist ya guardado (ver
   * web/app/(app)/rag/[formato]/page.tsx) — arranca el formulario lleno en
   * vez de vacío. Ausente = modo creación (pestaña "Construir tipo nuevo"
   * de RagHub.tsx). */
  inicial?: { formatoId: string; datos: ChecklistImportado };
}

/**
 * Pestaña "Construir tipo nuevo" de RagHub.tsx (modo creación, sin
 * `inicial`) y edición en el sitio de un checklist ya guardado (modo
 * edición, con `inicial` — ver rag/[formato]/page.tsx). Dos caminos para
 * llenar el formulario (importar un JSON ya armado o construir a mano
 * bloque por bloque) y dos modos de arranque (vacío o prellenado), pero un
 * único destino: previsualizarChecklist()/confirmarChecklist()
 * (./actions.ts) con la misma forma ChecklistImportado — no hay dos
 * lógicas de guardado. Ver docs/decisiones.md D-22 y D-23.
 */
export function ConstructorChecklist({ inicial }: Props) {
  const router = useRouter();
  const inputJson = useRef<HTMLInputElement>(null);
  const editando = inicial !== undefined;

  const [clave, setClave] = useState(inicial?.datos.formato.clave ?? "");
  const [nombre, setNombre] = useState(inicial?.datos.formato.nombre ?? "");
  const [periodicidad, setPeriodicidad] = useState(inicial?.datos.formato.periodicidad ?? "diario");
  const [documentoReferencia, setDocumentoReferencia] = useState(inicial?.datos.formato.documento_referencia ?? "");
  const [revision, setRevision] = useState(inicial?.datos.formato.revision ?? "");
  const [instruccionesTexto, setInstruccionesTexto] = useState((inicial?.datos.formato.instrucciones ?? []).join("\n"));
  const [columnasFecha, setColumnasFecha] = useState(String(inicial?.datos.formato.columnas_fecha ?? DIAS_POR_DEFECTO));
  const [bloques, setBloques] = useState<BloqueFila[]>(() =>
    inicial ? [...inicial.datos.bloques].sort((a, b) => a.orden - b.orden).map(bloqueFilaDesdeImportado) : [],
  );
  const [estado, setEstado] = useState<Estado>({ fase: "editando" });

  function reiniciarFormulario() {
    setClave("");
    setNombre("");
    setPeriodicidad("diario");
    setDocumentoReferencia("");
    setRevision("");
    setInstruccionesTexto("");
    setColumnasFecha(String(DIAS_POR_DEFECTO));
    setBloques([]);
  }

  function actualizarBloque(key: string, cambios: Partial<BloqueFila>) {
    setEstado({ fase: "editando" });
    setBloques((prev) => prev.map((b) => (b.key === key ? { ...b, ...cambios } : b)));
  }

  function actualizarItem(bloqueKey: string, itemKey: string, cambios: Partial<ItemFila>) {
    setEstado({ fase: "editando" });
    setBloques((prev) =>
      prev.map((b) =>
        b.key === bloqueKey ? { ...b, items: b.items.map((it) => (it.key === itemKey ? { ...it, ...cambios } : it)) } : b,
      ),
    );
  }

  async function subirFoto(bloqueKey: string, itemKey: string, archivo: File) {
    if (!clave.trim()) {
      setEstado({ fase: "error", mensaje: "Escribe la clave del formato antes de subir fotos de referencia." });
      return;
    }
    actualizarItem(bloqueKey, itemKey, { subiendoFoto: true });
    try {
      const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const ruta = rutaChecklistRef(clave.trim(), itemKey, extension);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(DEPOSITO)
        .upload(ruta, archivo, { contentType: archivo.type || "image/jpeg", upsert: true });
      if (error) throw error;
      actualizarItem(bloqueKey, itemKey, { fotoRuta: ruta, subiendoFoto: false });
    } catch (error) {
      actualizarItem(bloqueKey, itemKey, { subiendoFoto: false });
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo subir la foto." });
    }
  }

  function validar(): string | null {
    if (!clave.trim() || !nombre.trim() || !documentoReferencia.trim()) {
      return 'Faltan "Clave", "Nombre" o "Documento de referencia".';
    }
    const nColumnasFecha = Number(columnasFecha);
    if (!Number.isInteger(nColumnasFecha) || nColumnasFecha < 1) {
      return '"Columnas de fecha" debe ser un entero mayor a 0.';
    }
    if (bloques.length === 0) return "Agrega al menos un bloque.";
    if (bloques.some((b) => !b.nombre.trim())) return "Todos los bloques necesitan un nombre.";
    const portadas = bloques.filter((b) => b.tipo === "portada_fotos").length;
    const bitacoras = bloques.filter((b) => b.tipo === "bitacora_libre").length;
    if (portadas > 1) return "Sólo puede haber un bloque de portada de fotos (el resto no se imprime).";
    if (bitacoras > 1) return "Sólo puede haber un bloque de bitácora libre (el resto no se imprime).";
    for (const b of bloques) {
      if (b.tipo === "bitacora_libre") {
        if (b.columnas.length === 0) return `'${b.nombre}': agrega al menos una columna.`;
        if (b.columnas.some((c) => !c.id.trim() || !c.etiqueta.trim())) {
          return `'${b.nombre}': cada columna necesita identificador y etiqueta.`;
        }
      } else if (b.items.some((it) => !it.nombre.trim())) {
        return `'${b.nombre}': todos los ítems necesitan un nombre.`;
      }
    }
    return null;
  }

  function construirJson(): ChecklistImportado {
    return {
      formato: {
        clave: clave.trim(),
        nombre: nombre.trim(),
        periodicidad: periodicidad.trim() || "diario",
        documento_referencia: documentoReferencia.trim(),
        revision: revision.trim() || null,
        instrucciones: instruccionesTexto
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        columnas_fecha: Number(columnasFecha),
      },
      bloques: bloques.map((b, i) => ({
        tipo: b.tipo,
        nombre: b.nombre.trim(),
        orden: i + 1,
        agrupacion:
          b.agrupacionExterna === ""
            ? []
            : b.agrupacionInterna === ""
              ? [b.agrupacionExterna]
              : [b.agrupacionExterna, b.agrupacionInterna],
        items:
          b.tipo === "bitacora_libre"
            ? undefined
            : b.items.map((it, j) => ({
                categoria: it.categoria.trim() || null,
                ubicacion_fisica: it.ubicacionFisica.trim() || null,
                nombre: it.nombre.trim(),
                cantidad: it.cantidad.trim() || null,
                verificaciones: it.verificacionesTexto
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((etiqueta) => ({ id: slug(etiqueta), etiqueta })),
                foto_referencia_ruta: it.fotoRuta,
                orden: j + 1,
              })),
        columnas: b.tipo === "bitacora_libre" ? b.columnas.map((c) => ({ id: c.id.trim(), etiqueta: c.etiqueta.trim() })) : undefined,
        filas_blanco: b.tipo === "bitacora_libre" ? b.filasBlanco : undefined,
      })),
    };
  }

  async function previsualizar(datos: ChecklistImportado) {
    setEstado({ fase: "calculando" });
    try {
      const resumen = await previsualizarChecklist(datos);
      setEstado({ fase: "revision", datos, resumen });
    } catch (error) {
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo calcular la vista previa." });
    }
  }

  function previsualizarDesdeFormulario() {
    const mensaje = validar();
    if (mensaje) {
      setEstado({ fase: "error", mensaje });
      return;
    }
    void previsualizar(construirJson());
  }

  async function elegirArchivoJson(lista: FileList | null) {
    const archivo = lista?.[0];
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as ChecklistImportado;
      // Al editar, la clave nunca cambia por esta vía — igual que el
      // campo bloqueado del formulario manual: confirmarChecklist() hace
      // upsert-por-clave + reemplazo completo, así que una clave distinta
      // crearía una fila nueva y dejaría huérfana la que se está editando.
      if (editando) datos.formato.clave = inicial!.datos.formato.clave;
      await previsualizar(datos);
    } catch (error) {
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo leer el archivo." });
    }
  }

  async function confirmar() {
    if (estado.fase !== "revision") return;
    setEstado({ fase: "guardando" });
    try {
      const resumen = await confirmarChecklist(estado.datos);
      setEstado({ fase: "guardado", resumen });
      if (!editando) {
        reiniciarFormulario();
        if (inputJson.current) inputJson.current.value = "";
      }
      router.refresh();
    } catch (error) {
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo guardar." });
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium text-vw-deep-space">Importar desde JSON</h3>
        <p className="mt-1 text-xs text-vw-dsb-60">
          Para un checklist ya convertido del Excel de extracción (ver docs/modelo-de-datos.md §3.5.5). Reemplaza
          por completo los bloques e ítems de la misma clave si ya existe.
        </p>
        <label className="mt-2 inline-block cursor-pointer border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
          Elegir archivo…
          <input
            ref={inputJson}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void elegirArchivoJson(e.target.files)}
          />
        </label>
      </section>

      <section>
        <h3 className="text-sm font-medium text-vw-deep-space">Construir manualmente</h3>
        <p className="mt-1 text-xs text-vw-dsb-60">
          Identidad del documento, luego sus bloques (portada de fotos, tablas de verificación, bitácora) e ítems.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Clave" valor={clave} onChange={setClave} placeholder="RAG 4.2" requerido deshabilitado={editando} />
          <CampoTexto etiqueta="Nombre" valor={nombre} onChange={setNombre} placeholder="Lista de inspección de..." requerido />
          <CampoTexto etiqueta="Periodicidad" valor={periodicidad} onChange={setPeriodicidad} placeholder="diario" />
          <CampoTexto etiqueta="Documento de referencia" valor={documentoReferencia} onChange={setDocumentoReferencia} requerido />
          <CampoTexto etiqueta="Revisión" valor={revision} onChange={setRevision} />
          <CampoTexto etiqueta="Columnas de fecha (días a llenar)" valor={columnasFecha} onChange={setColumnasFecha} />
        </div>
        <div className="mt-3">
          <span className="block text-xs text-vw-dsb-60">Instrucciones propias de este checklist (una por línea)</span>
          <textarea
            value={instruccionesTexto}
            onChange={(e) => setInstruccionesTexto(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
          />
        </div>

        <div className="mt-6 space-y-4">
          {bloques.map((b, i) => (
            <FilaBloque
              key={b.key}
              bloque={b}
              esPrimero={i === 0}
              esUltimo={i === bloques.length - 1}
              onCambiar={(cambios) => actualizarBloque(b.key, cambios)}
              onQuitar={() => {
                setEstado({ fase: "editando" });
                setBloques((prev) => prev.filter((x) => x.key !== b.key));
              }}
              onMover={(d) => {
                setEstado({ fase: "editando" });
                setBloques((prev) => mover(prev, i, d));
              }}
              onAgregarItem={() => actualizarBloque(b.key, { items: [...b.items, crearItem()] })}
              onQuitarItem={(itemKey) => actualizarBloque(b.key, { items: b.items.filter((it) => it.key !== itemKey) })}
              onMoverItem={(itemIndice, d) => actualizarBloque(b.key, { items: mover(b.items, itemIndice, d) })}
              onCambiarItem={(itemKey, cambios) => actualizarItem(b.key, itemKey, cambios)}
              onSubirFoto={(itemKey, archivo) => void subirFoto(b.key, itemKey, archivo)}
              onAgregarColumna={() =>
                actualizarBloque(b.key, { columnas: [...b.columnas, { key: nuevaClave(), id: "", etiqueta: "" }] })
              }
              onQuitarColumna={(columnaKey) => actualizarBloque(b.key, { columnas: b.columnas.filter((c) => c.key !== columnaKey) })}
              onCambiarColumna={(columnaKey, cambios) =>
                actualizarBloque(b.key, { columnas: b.columnas.map((c) => (c.key === columnaKey ? { ...c, ...cambios } : c)) })
              }
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TIPOS_BLOQUE.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => {
                setEstado({ fase: "editando" });
                setBloques((prev) => [...prev, crearBloque(t.valor)]);
              }}
              className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green"
            >
              + {t.etiqueta}
            </button>
          ))}
        </div>

        {(estado.fase === "editando" || estado.fase === "calculando" || estado.fase === "error") && (
          <div className="mt-4">
            <BotonPrimario onClick={previsualizarDesdeFormulario} disabled={estado.fase === "calculando"}>
              {estado.fase === "calculando" ? "Calculando…" : "Previsualizar"}
            </BotonPrimario>
          </div>
        )}
      </section>

      {estado.fase === "error" && (
        <div>
          <Aviso tipo="error">{estado.mensaje}</Aviso>
        </div>
      )}

      {(estado.fase === "revision" || estado.fase === "guardando") && (
        <PanelVistaPrevia
          aplicando={estado.fase === "guardando"}
          onConfirmar={confirmar}
          onCancelar={() => setEstado({ fase: "editando" })}
          textoConfirmar={editando ? "Confirmar cambios" : "Confirmar y guardar"}
          textoAplicando="Guardando…"
        >
          {estado.fase === "revision" && <ResumenVistaPrevia resumen={estado.resumen} />}
        </PanelVistaPrevia>
      )}

      {estado.fase === "guardado" && (
        <PanelExito titulo={editando ? "Cambios guardados." : "Checklist guardado."} onCerrar={() => setEstado({ fase: "editando" })}>
          <ResumenVistaPrevia resumen={estado.resumen} />
        </PanelExito>
      )}
    </div>
  );
}

function ResumenVistaPrevia({ resumen }: { resumen: ResumenChecklist }) {
  return (
    <>
      <p className="mt-2">
        {resumen.formatoNuevo ? "Se creará un formato nuevo: " : "Se reemplazará el formato existente: "}
        <span className="font-medium">{resumen.totalBloques}</span> bloque{resumen.totalBloques === 1 ? "" : "s"},{" "}
        <span className="font-medium">{resumen.totalItems}</span> ítem{resumen.totalItems === 1 ? "" : "s"}.
      </p>
      {resumen.advertencias.map((a) => (
        <p key={a} className="mt-2 text-vw-red">
          {a}
        </p>
      ))}
    </>
  );
}

function FilaBloque({
  bloque,
  esPrimero,
  esUltimo,
  onCambiar,
  onQuitar,
  onMover,
  onAgregarItem,
  onQuitarItem,
  onMoverItem,
  onCambiarItem,
  onSubirFoto,
  onAgregarColumna,
  onQuitarColumna,
  onCambiarColumna,
}: {
  bloque: BloqueFila;
  esPrimero: boolean;
  esUltimo: boolean;
  onCambiar: (cambios: Partial<BloqueFila>) => void;
  onQuitar: () => void;
  onMover: (direccion: -1 | 1) => void;
  onAgregarItem: () => void;
  onQuitarItem: (itemKey: string) => void;
  onMoverItem: (itemIndice: number, direccion: -1 | 1) => void;
  onCambiarItem: (itemKey: string, cambios: Partial<ItemFila>) => void;
  onSubirFoto: (itemKey: string, archivo: File) => void;
  onAgregarColumna: () => void;
  onQuitarColumna: (columnaKey: string) => void;
  onCambiarColumna: (columnaKey: string, cambios: Partial<ColumnaFila>) => void;
}) {
  const esTabla = bloque.tipo === "tabla_verificacion" || bloque.tipo === "tabla_simple";
  const conFoto = bloque.tipo === "tabla_verificacion" || bloque.tipo === "portada_fotos";
  const conCamposEquipo = bloque.tipo === "tabla_verificacion";

  const opcionesInterna = bloque.agrupacionExterna
    ? [{ valor: OTRO_CAMPO[bloque.agrupacionExterna], etiqueta: ETIQUETA_CAMPO[OTRO_CAMPO[bloque.agrupacionExterna]] }]
    : [];

  return (
    <div className="border border-vw-dsb-20 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <BotonesOrden esPrimera={esPrimero} esUltima={esUltimo} onMover={onMover} />
        <span className="rounded bg-vw-vg-10 px-2 py-1 text-xs text-vw-dsb-60">
          {TIPOS_BLOQUE.find((t) => t.valor === bloque.tipo)?.etiqueta}
        </span>
        <CampoTexto etiqueta="Nombre del bloque" valor={bloque.nombre} onChange={(v) => onCambiar({ nombre: v })} />
        <BotonSecundario onClick={onQuitar}>Quitar bloque</BotonSecundario>
      </div>

      {esTabla && (
        <div className="mt-2 flex flex-wrap gap-3">
          <CampoSelect
            etiqueta="Agrupar primero por"
            valor={bloque.agrupacionExterna}
            onChange={(v) => onCambiar({ agrupacionExterna: v as CampoAgrupacionChecklist | "", agrupacionInterna: "" })}
            opciones={(Object.keys(ETIQUETA_CAMPO) as CampoAgrupacionChecklist[]).map((c) => ({ valor: c, etiqueta: ETIQUETA_CAMPO[c] }))}
          />
          <CampoSelect
            etiqueta="…luego por"
            valor={bloque.agrupacionInterna}
            onChange={(v) => onCambiar({ agrupacionInterna: v as CampoAgrupacionChecklist | "" })}
            opciones={opcionesInterna}
          />
        </div>
      )}

      {bloque.tipo === "bitacora_libre" ? (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-vw-deep-space">Columnas fijas</p>
            <CampoTexto
              etiqueta="Filas en blanco"
              valor={String(bloque.filasBlanco)}
              onChange={(v) => onCambiar({ filasBlanco: Number(v) || 0 })}
            />
          </div>
          <div className="mt-2 space-y-1.5">
            {bloque.columnas.map((c) => (
              <div key={c.key} className="flex flex-wrap items-end gap-2">
                <CampoTexto etiqueta="Identificador" valor={c.id} onChange={(v) => onCambiarColumna(c.key, { id: v })} />
                <CampoTexto etiqueta="Etiqueta" valor={c.etiqueta} onChange={(v) => onCambiarColumna(c.key, { etiqueta: v })} />
                <BotonSecundario onClick={() => onQuitarColumna(c.key)}>Quitar</BotonSecundario>
              </div>
            ))}
          </div>
          <button type="button" onClick={onAgregarColumna} className="mt-2 text-sm text-vw-vivid-green hover:underline">
            + Agregar columna
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs font-medium text-vw-deep-space">Ítems</p>
          <div className="mt-2 space-y-2">
            {bloque.items.map((it, i) => (
              <FilaItem
                key={it.key}
                item={it}
                esPrimera={i === 0}
                esUltima={i === bloque.items.length - 1}
                conCategorias={esTabla}
                conFoto={conFoto}
                conCamposEquipo={conCamposEquipo}
                onCambiar={(cambios) => onCambiarItem(it.key, cambios)}
                onQuitar={() => onQuitarItem(it.key)}
                onMover={(d) => onMoverItem(i, d)}
                onSubirFoto={(archivo) => onSubirFoto(it.key, archivo)}
              />
            ))}
          </div>
          <button type="button" onClick={onAgregarItem} className="mt-2 text-sm text-vw-vivid-green hover:underline">
            + Agregar ítem
          </button>
        </div>
      )}
    </div>
  );
}

function FilaItem({
  item,
  esPrimera,
  esUltima,
  conCategorias,
  conFoto,
  conCamposEquipo,
  onCambiar,
  onQuitar,
  onMover,
  onSubirFoto,
}: {
  item: ItemFila;
  esPrimera: boolean;
  esUltima: boolean;
  conCategorias: boolean;
  conFoto: boolean;
  conCamposEquipo: boolean;
  onCambiar: (cambios: Partial<ItemFila>) => void;
  onQuitar: () => void;
  onMover: (direccion: -1 | 1) => void;
  onSubirFoto: (archivo: File) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 border border-vw-dsb-10 p-2">
      <BotonesOrden esPrimera={esPrimera} esUltima={esUltima} onMover={onMover} />
      {conCategorias && (
        <>
          <CampoTexto etiqueta="Categoría" valor={item.categoria} onChange={(v) => onCambiar({ categoria: v })} />
          <CampoTexto etiqueta="Ubicación física" valor={item.ubicacionFisica} onChange={(v) => onCambiar({ ubicacionFisica: v })} />
        </>
      )}
      <CampoTexto etiqueta={conCategorias ? "Nombre" : "Etiqueta"} valor={item.nombre} onChange={(v) => onCambiar({ nombre: v })} />
      {conCamposEquipo && (
        <>
          <CampoTexto etiqueta="Cantidad" valor={item.cantidad} onChange={(v) => onCambiar({ cantidad: v })} />
          <CampoTexto
            etiqueta="Verificaciones (separadas por coma)"
            valor={item.verificacionesTexto}
            onChange={(v) => onCambiar({ verificacionesTexto: v })}
            placeholder="Buen estado, Cantidad"
          />
        </>
      )}
      {conFoto && (
        <Campo etiqueta="Foto de referencia">
          <label className="mt-1 block cursor-pointer border border-vw-dsb-20 px-2 py-1 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
            {item.subiendoFoto ? "Subiendo…" : item.fotoRuta ? "Reemplazar" : "Elegir…"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={item.subiendoFoto}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) onSubirFoto(archivo);
              }}
            />
          </label>
        </Campo>
      )}
      <BotonSecundario onClick={onQuitar}>Quitar</BotonSecundario>
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
      <button type="button" onClick={() => onMover(-1)} disabled={esPrimera} aria-label="Mover arriba" className="leading-none disabled:opacity-30">
        ▲
      </button>
      <button type="button" onClick={() => onMover(1)} disabled={esUltima} aria-label="Mover abajo" className="leading-none disabled:opacity-30">
        ▼
      </button>
    </div>
  );
}
