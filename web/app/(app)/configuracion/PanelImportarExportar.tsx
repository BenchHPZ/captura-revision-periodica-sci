"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelExito, PanelVistaPrevia } from "@/components/PanelConfirmacion";
import { Aviso } from "@/components/Aviso";
import { descargar } from "@/lib/descargas";
import {
  confirmarFormatos,
  confirmarImportacion,
  previsualizarFormatos,
  previsualizarImportacion,
  type CatalogoImportado,
  type FormatosImportados,
  type ResultadoImportacion,
  type ResumenFormatos,
} from "./actions";

interface Props {
  ciclo: { id: string; clave: string };
  catalogoCompleto: unknown;
  plantillasCompletas: unknown;
  zonas: unknown;
  sistemas: unknown;
}

type EstadoCatalogo =
  | { fase: "inactivo" }
  | { fase: "error"; mensaje: string }
  | { fase: "vista_previa"; catalogo: CatalogoImportado; resultado: ResultadoImportacion }
  | { fase: "aplicando" }
  | { fase: "aplicado"; resultado: ResultadoImportacion };

type EstadoFormatos =
  | { fase: "inactivo" }
  | { fase: "error"; mensaje: string }
  | { fase: "vista_previa"; datos: FormatosImportados; resultado: ResumenFormatos }
  | { fase: "aplicando" }
  | { fase: "aplicado"; resultado: ResumenFormatos };

/** Un solo lugar para todo: antes el catálogo se importaba desde
 * /catalogo y los formatos desde /rag, con dos flujos casi idénticos.
 * Ver docs/decisiones.md D-21. La conciliación en sí no cambió — sigue
 * siendo por (sistema, código) para el catálogo (D-14) y por clave para
 * los formatos. */
export function PanelImportarExportar({ ciclo, catalogoCompleto, plantillasCompletas, zonas, sistemas }: Props) {
  const router = useRouter();
  const inputCatalogo = useRef<HTMLInputElement>(null);
  const inputFormatos = useRef<HTMLInputElement>(null);
  const [estadoCatalogo, setEstadoCatalogo] = useState<EstadoCatalogo>({ fase: "inactivo" });
  const [estadoFormatos, setEstadoFormatos] = useState<EstadoFormatos>({ fase: "inactivo" });

  async function elegirCatalogo(lista: FileList | null) {
    const archivo = lista?.[0];
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const catalogo = JSON.parse(texto) as CatalogoImportado;
      const resultado = await previsualizarImportacion(catalogo);
      setEstadoCatalogo({ fase: "vista_previa", catalogo, resultado });
    } catch (error) {
      setEstadoCatalogo({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo leer el archivo." });
    }
  }

  async function confirmarCatalogo() {
    if (estadoCatalogo.fase !== "vista_previa") return;
    setEstadoCatalogo({ fase: "aplicando" });
    try {
      const resultado = await confirmarImportacion(estadoCatalogo.catalogo);
      setEstadoCatalogo({ fase: "aplicado", resultado });
      router.refresh();
    } catch (error) {
      setEstadoCatalogo({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo aplicar." });
    }
  }

  async function elegirFormatos(lista: FileList | null) {
    const archivo = lista?.[0];
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as FormatosImportados;
      const resultado = await previsualizarFormatos(datos);
      setEstadoFormatos({ fase: "vista_previa", datos, resultado });
    } catch (error) {
      setEstadoFormatos({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo leer el archivo." });
    }
  }

  async function confirmarFormatosCarga() {
    if (estadoFormatos.fase !== "vista_previa") return;
    setEstadoFormatos({ fase: "aplicando" });
    try {
      const resultado = await confirmarFormatos(estadoFormatos.datos);
      setEstadoFormatos({ fase: "aplicado", resultado });
      router.refresh();
    } catch (error) {
      setEstadoFormatos({ fase: "error", mensaje: error instanceof Error ? error.message : "No se pudo cargar." });
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium text-vw-deep-space">Catálogo (elementos y plantillas)</h3>
        <p className="mt-1 text-xs text-vw-dsb-60">
          Para cambios extensos: exporta, edita fuera y vuelve a importar. La conciliación es por
          sistema y código (Flujo 5); un archivo parcial no toca los sistemas que no menciona (D-14).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <BotonSecundarioLocal onClick={() => descargar(`catalogo_${ciclo.clave}.json`, JSON.stringify(catalogoCompleto, null, 2), "application/json;charset=utf-8")}>
            Exportar catálogo
          </BotonSecundarioLocal>
          <BotonSecundarioLocal onClick={() => descargar(`plantillas_${ciclo.clave}.json`, JSON.stringify(plantillasCompletas, null, 2), "application/json;charset=utf-8")}>
            Exportar plantillas
          </BotonSecundarioLocal>
          <label className="cursor-pointer border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
            Importar catálogo…
            <input ref={inputCatalogo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void elegirCatalogo(e.target.files)} />
          </label>
        </div>

        {estadoCatalogo.fase === "error" && <div className="mt-3"><Aviso tipo="error">{estadoCatalogo.mensaje}</Aviso></div>}
        {(estadoCatalogo.fase === "vista_previa" || estadoCatalogo.fase === "aplicando") && (
          <div className="mt-3">
            <PanelVistaPrevia
              aplicando={estadoCatalogo.fase === "aplicando"}
              onConfirmar={confirmarCatalogo}
              onCancelar={() => { setEstadoCatalogo({ fase: "inactivo" }); if (inputCatalogo.current) inputCatalogo.current.value = ""; }}
              textoConfirmar="Confirmar importación"
            >
              {estadoCatalogo.fase === "vista_previa" && (
                <>
                  <ResumenTabla resumen={estadoCatalogo.resultado.resumen} />
                  {estadoCatalogo.resultado.advertencias.map((a) => (
                    <p key={a} className="mt-2 text-vw-red">{a}</p>
                  ))}
                </>
              )}
            </PanelVistaPrevia>
          </div>
        )}
        {estadoCatalogo.fase === "aplicado" && (
          <div className="mt-3">
            <PanelExito titulo="Catálogo importado." onCerrar={() => setEstadoCatalogo({ fase: "inactivo" })}>
              <ResumenTabla resumen={estadoCatalogo.resultado.resumen} />
            </PanelExito>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-vw-deep-space">Formatos RAG</h3>
        <p className="mt-1 text-xs text-vw-dsb-60">
          Identidad, documento de referencia e instrucciones propias de cada RAG. No toca elementos ni
          plantillas.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="cursor-pointer border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
            Importar formatos…
            <input ref={inputFormatos} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void elegirFormatos(e.target.files)} />
          </label>
        </div>

        {estadoFormatos.fase === "error" && <div className="mt-3"><Aviso tipo="error">{estadoFormatos.mensaje}</Aviso></div>}
        {(estadoFormatos.fase === "vista_previa" || estadoFormatos.fase === "aplicando") && (
          <div className="mt-3">
            <PanelVistaPrevia
              aplicando={estadoFormatos.fase === "aplicando"}
              onConfirmar={confirmarFormatosCarga}
              onCancelar={() => { setEstadoFormatos({ fase: "inactivo" }); if (inputFormatos.current) inputFormatos.current.value = ""; }}
              textoConfirmar="Confirmar carga"
              textoAplicando="Cargando…"
            >
              {estadoFormatos.fase === "vista_previa" && (
                <>
                  <p className="mt-2">
                    <span className="font-medium">{estadoFormatos.resultado.altas}</span> alta
                    {estadoFormatos.resultado.altas === 1 ? "" : "s"},{" "}
                    <span className="font-medium">{estadoFormatos.resultado.actualizaciones}</span> actualizaci
                    {estadoFormatos.resultado.actualizaciones === 1 ? "ón" : "ones"}.
                  </p>
                  {estadoFormatos.resultado.advertencias.map((a) => (
                    <p key={a} className="mt-2 text-vw-red">{a}</p>
                  ))}
                </>
              )}
            </PanelVistaPrevia>
          </div>
        )}
        {estadoFormatos.fase === "aplicado" && (
          <div className="mt-3">
            <PanelExito titulo="Formatos cargados." onCerrar={() => setEstadoFormatos({ fase: "inactivo" })} />
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-vw-deep-space">Zonas y sistemas</h3>
        <p className="mt-1 text-xs text-vw-dsb-60">Se editan arriba; aquí sólo la copia de respaldo.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <BotonSecundarioLocal onClick={() => descargar("zonas.json", JSON.stringify(zonas, null, 2), "application/json;charset=utf-8")}>
            Exportar zonas
          </BotonSecundarioLocal>
          <BotonSecundarioLocal onClick={() => descargar("sistemas.json", JSON.stringify(sistemas, null, 2), "application/json;charset=utf-8")}>
            Exportar sistemas
          </BotonSecundarioLocal>
        </div>
      </section>
    </div>
  );
}

function BotonSecundarioLocal({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="border border-vw-dsb-20 px-3 py-1.5 text-sm text-vw-deep-space transition hover:border-vw-vivid-green">
      {children}
    </button>
  );
}

function ResumenTabla({ resumen }: { resumen: { sistema: string; altas: number; actualizaciones: number; bajas: number }[] }) {
  if (resumen.length === 0) return <p className="mt-2 text-vw-dsb-60">Nada que conciliar.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {resumen.map((r) => (
        <li key={r.sistema}>
          <span className="font-medium">{r.sistema}</span>: {r.altas} alta{r.altas === 1 ? "" : "s"},{" "}
          {r.actualizaciones} actualizaci{r.actualizaciones === 1 ? "ón" : "ones"}, {r.bajas} baja
          {r.bajas === 1 ? "" : "s"}
        </li>
      ))}
    </ul>
  );
}
