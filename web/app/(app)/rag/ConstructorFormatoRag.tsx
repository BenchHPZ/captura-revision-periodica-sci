"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { BotonPrimario } from "@/components/Boton";
import { CampoSelect, CampoTexto } from "@/components/Campo";
import { OPCIONES_ORIENTACION, OPCIONES_TAMANO_HOJA } from "@/lib/documentos/opciones";
import type { ClaveTamanoHoja, OrientacionHoja } from "@/lib/documentos/pagina";
import type { Formato, Sistema } from "@/lib/tipos";
import { crearFormatoRag, type DatosFormatoRagNuevo } from "./actions";

interface Props {
  sistemas: Sistema[];
  formatos: Formato[];
}

type Estado = { fase: "editando" } | { fase: "guardando" } | { fase: "error"; mensaje: string };

/**
 * Alta de un RAG mensual nuevo desde /rag — antes sólo se cargaba por
 * importación masiva de JSON en Configuración. Mismos campos que
 * FormatoEditor.tsx (identidad propia del documento) más 'clave' y el
 * sistema al que se asocia, elegido entre los que todavía no tienen un
 * RAG activo. Sin PanelVistaPrevia: una alta de una sola fila no tiene
 * nada que resumir — mismo criterio que crearSistema()/crearZona()/
 * crearElemento(), ninguno usa vista previa. Ver docs/decisiones.md D-23.
 */
export function ConstructorFormatoRag({ sistemas, formatos }: Props) {
  const router = useRouter();

  const sistemasConFormatoActivo = useMemo(
    () => new Set(formatos.filter((f) => f.activo && f.tipo_documento === "rag" && f.sistema_id).map((f) => f.sistema_id as string)),
    [formatos],
  );
  const disponibles = useMemo(
    () => sistemas.filter((s) => s.activo && !sistemasConFormatoActivo.has(s.id)),
    [sistemas, sistemasConFormatoActivo],
  );

  const [sistemaId, setSistemaId] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [periodicidad, setPeriodicidad] = useState("mensual");
  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [revision, setRevision] = useState("");
  const [instruccionesTexto, setInstruccionesTexto] = useState("");
  const [ubicacion, setUbicacion] = useState(true);
  const [referencia, setReferencia] = useState(true);
  const [tamanoHoja, setTamanoHoja] = useState<ClaveTamanoHoja>("a4");
  const [orientacion, setOrientacion] = useState<OrientacionHoja>("vertical");
  const [estado, setEstado] = useState<Estado>({ fase: "editando" });

  if (disponibles.length === 0) {
    return (
      <Aviso tipo="ambar">
        Todos los sistemas activos ya tienen un formato RAG activo asociado. Para reemplazar uno, primero
        da de baja el existente en la pestaña &quot;Ver e imprimir&quot;.
      </Aviso>
    );
  }

  async function guardar() {
    if (!sistemaId || !clave.trim() || !nombre.trim() || !documentoReferencia.trim()) {
      setEstado({ fase: "error", mensaje: 'Faltan "Sistema", "Clave", "Nombre" o "Documento de referencia".' });
      return;
    }
    setEstado({ fase: "guardando" });
    try {
      const datos: DatosFormatoRagNuevo = {
        clave: clave.trim(),
        nombre: nombre.trim(),
        periodicidad: periodicidad.trim() || "mensual",
        sistema_id: sistemaId,
        documento_referencia: documentoReferencia.trim(),
        revision: revision.trim() || null,
        instrucciones: instruccionesTexto
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        columnas: { ubicacion, referencia },
        tamano_hoja: tamanoHoja,
        orientacion,
      };
      const { sistemaClave } = await crearFormatoRag(datos);
      router.push(`/sistemas/${sistemaClave}`);
    } catch (error) {
      setEstado({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo crear el formato." });
    }
  }

  return (
    <div>
      <p className="text-xs text-vw-dsb-60">
        La clasificación, razón social, domicilio, la instrucción general y el bloque de cierre son
        iguales en los cinco RAG y no se editan aquí — sólo lo propio de este documento. Los puntos de
        revisión y los elementos del catálogo se definen después, en /sistemas/[sistema].
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Sistema"
          valor={sistemaId}
          onChange={setSistemaId}
          opciones={disponibles.map((s) => ({ valor: s.id, etiqueta: s.nombre }))}
          vacioEtiqueta="— Elige un sistema —"
        />
        <CampoTexto etiqueta="Clave" valor={clave} onChange={setClave} placeholder="RAG 2.10" requerido />
        <CampoTexto etiqueta="Nombre" valor={nombre} onChange={setNombre} placeholder="Formato de revisión de..." requerido />
        <CampoTexto etiqueta="Periodicidad" valor={periodicidad} onChange={setPeriodicidad} placeholder="mensual" />
        <CampoTexto etiqueta="Documento de referencia" valor={documentoReferencia} onChange={setDocumentoReferencia} requerido />
        <CampoTexto etiqueta="Revisión" valor={revision} onChange={setRevision} />
        <CampoSelect
          etiqueta="Tamaño de hoja"
          valor={tamanoHoja}
          onChange={(v) => setTamanoHoja(v as ClaveTamanoHoja)}
          opciones={OPCIONES_TAMANO_HOJA}
          sinVacio
        />
        <CampoSelect
          etiqueta="Orientación"
          valor={orientacion}
          onChange={(v) => setOrientacion(v as OrientacionHoja)}
          opciones={OPCIONES_ORIENTACION}
          sinVacio
        />
      </div>

      <div className="mt-3">
        <p className="text-xs text-vw-dsb-60">Columnas opcionales del documento</p>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-vw-deep-space">
            <input type="checkbox" checked={ubicacion} onChange={(e) => setUbicacion(e.target.checked)} />
            Ubicación
          </label>
          <label className="flex items-center gap-2 text-sm text-vw-deep-space">
            <input type="checkbox" checked={referencia} onChange={(e) => setReferencia(e.target.checked)} />
            Referencia
          </label>
        </div>
      </div>

      <div className="mt-3">
        <span className="block text-xs text-vw-dsb-60">Instrucciones propias de este formato (una por línea)</span>
        <textarea
          value={instruccionesTexto}
          onChange={(e) => setInstruccionesTexto(e.target.value)}
          rows={2}
          placeholder="p. ej. Tipo de hidrante: P = Pie, G = Gabinete."
          className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
        />
      </div>

      {estado.fase === "error" && (
        <div className="mt-3">
          <Aviso tipo="error">{estado.mensaje}</Aviso>
        </div>
      )}

      <div className="mt-4">
        <BotonPrimario onClick={guardar} disabled={estado.fase === "guardando"}>
          {estado.fase === "guardando" ? "Creando…" : "Crear formato"}
        </BotonPrimario>
      </div>
    </div>
  );
}
