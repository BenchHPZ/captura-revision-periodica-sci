import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerCicloAbierto,
  obtenerElementosCatalogo,
  obtenerElementosParaRag,
  obtenerFormatos,
  obtenerPlantilla,
  obtenerSistemasCatalogo,
  obtenerZonas,
} from "@/lib/datos";
import { Aviso } from "@/components/Aviso";
import { armarDocumentoRAG } from "@/lib/rag/documento";
import { paginaDeFormato } from "@/lib/documentos/pagina";
import { renderizarRag } from "@/lib/rag/render";
import type { PuntoDef } from "@/lib/tipos";
import { ElementosCatalogo } from "./ElementosCatalogo";
import { FormatoEditor } from "./FormatoEditor";
import { PlantillaEditor } from "./PlantillaEditor";
import { VisorRAG } from "./VisorRAG";

/**
 * Una pantalla por sistema: elementos, plantilla, formato y el documento
 * RAG — antes repartidos entre /catalogo/[sistema] y /rag/[formato], sin
 * enlace entre sí pese a que la relación ya existía en datos
 * (formatos.sistema_id). Ver docs/decisiones.md D-21.
 */
export default async function SistemaPage({
  params,
  searchParams,
}: {
  params: Promise<{ clave: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const { clave } = await params;
  const { modo: modoParam } = await searchParams;
  const supabase = await createClient();

  const ciclo = await obtenerCicloAbierto(supabase);
  if (!ciclo) notFound();

  const [sistemas, formatos] = await Promise.all([obtenerSistemasCatalogo(supabase), obtenerFormatos(supabase)]);
  const sistema = sistemas.find((s) => s.clave === clave);
  if (!sistema) notFound();
  // Puede haber más de un formato para el mismo sistema (uno activo, uno
  // dado de baja) — se prefiere el activo; sólo se cae al inactivo si no
  // hay ninguno activo, para poder reactivarlo desde aquí. Ver
  // docs/decisiones.md D-23.
  const formatosDelSistema = formatos.filter((f) => f.sistema_id === sistema.id);
  const formato = formatosDelSistema.find((f) => f.activo) ?? formatosDelSistema[0] ?? null;

  const [elementos, plantilla, zonas] = await Promise.all([
    obtenerElementosCatalogo(supabase, ciclo.id, sistema.id),
    obtenerPlantilla(supabase, ciclo.id, sistema.id),
    obtenerZonas(supabase),
  ]);
  const puntos: PuntoDef[] = plantilla?.puntos ?? [];

  let htmlCuerpo = "";
  let htmlCompleto = "";
  let estilosDocumento = "";
  let modo: "vacio" | "lleno" = "vacio";
  if (formato) {
    const filas = await obtenerElementosParaRag(supabase, ciclo.id, sistema.id);
    const hayCapturaAlguna = filas.some((f) => f.registro !== null);
    modo = modoParam === "vacio" || modoParam === "lleno" ? modoParam : hayCapturaAlguna ? "lleno" : "vacio";

    const documento = armarDocumentoRAG({
      formato,
      puntos,
      tipos: sistema.tipos,
      elementos: filas.map((f) => ({
        id: f.id,
        numeracion: f.nombre,
        ubicacion: f.ubicacion,
        referencia: f.referencia,
        tipo: f.tipo,
        zona: f.zona?.nombre ?? null,
        zonaOrden: f.zona?.orden ?? null,
        ordenAnclado: f.orden_anclado,
        orden: f.orden,
      })),
      respuestas:
        modo === "lleno"
          ? filas
              .filter((f) => f.registro !== null)
              .map((f) => ({
                elementoId: f.id,
                valores: f.registro?.valores ?? {},
                observaciones: f.registro?.pendientes ?? null,
              }))
          : undefined,
      cicloClave: ciclo.clave,
      cicloNombre: ciclo.nombre,
    });

    // Cuerpo, estilos y documento completo salen de la misma hoja — ver
    // docs/decisiones.md D-25.
    const renderizado = renderizarRag(documento, paginaDeFormato(formato));
    htmlCuerpo = renderizado.cuerpo;
    htmlCompleto = renderizado.completo;
    estilosDocumento = renderizado.estilos;
  }

  return (
    <div>
      <Link href="/configuracion" className="text-sm text-vw-dsb-60 hover:text-vw-vivid-green">
        ← Configuración
      </Link>

      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-2xl text-vw-deep-space">{sistema.nombre}</h1>
        {!sistema.activo && <span className="text-xs text-vw-red">Sistema inactivo</span>}
      </div>
      <p className="mt-1 text-sm text-vw-dsb-60">
        {ciclo.nombre}
        {sistema.rag && ` · ${sistema.rag}`}
      </p>

      <div className="mt-6">
        <PlantillaEditor
          ciclo={{ id: ciclo.id }}
          sistema={{ id: sistema.id, clave: sistema.clave }}
          plantillaInicial={plantilla ?? { fotos: [], puntos: [], texto_libre: [] }}
        />
      </div>

      <div className="mt-8">
        <ElementosCatalogo
          ciclo={{ id: ciclo.id, clave: ciclo.clave }}
          sistema={{ id: sistema.id, clave: sistema.clave }}
          elementosIniciales={elementos}
          zonas={zonas}
          tipos={sistema.tipos}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-vw-deep-space">Documento RAG</h2>
        {!formato ? (
          <div className="mt-2">
            <Aviso tipo="ambar">
              Este sistema no tiene ningún formato RAG asociado. Se puede crear uno desde
              Configuración → Importar y exportar, o desde RAG → Construir tipo nuevo.
            </Aviso>
          </div>
        ) : (
          <div className="mt-2">
            {!formato.activo && (
              <div className="mb-3">
                <Aviso tipo="ambar">Este formato está dado de baja — reactívalo desde RAG → Ver e imprimir.</Aviso>
              </div>
            )}
            <FormatoEditor formato={formato} />
            <style dangerouslySetInnerHTML={{ __html: estilosDocumento }} />
            <VisorRAG
              html={htmlCuerpo}
              htmlCompleto={htmlCompleto}
              modo={modo}
              hrefVacio={`/sistemas/${sistema.clave}?modo=vacio`}
              hrefLleno={`/sistemas/${sistema.clave}?modo=lleno`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
