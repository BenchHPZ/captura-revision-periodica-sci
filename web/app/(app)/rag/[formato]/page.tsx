import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerCicloAbierto,
  obtenerElementosParaRag,
  obtenerFormatoPorClave,
  obtenerPlantilla,
  obtenerSistemas,
} from "@/lib/datos";
import type { PuntoDef } from "@/lib/tipos";
import { ESTILOS_RAG } from "@/lib/rag/estilos";
import { armarDocumentoRAG, slugAClave } from "@/lib/rag/documento";
import { renderizarCuerpoRAG, renderizarDocumentoCompleto } from "@/lib/rag/render";
import { FormatoEditor } from "./FormatoEditor";
import { VisorRAG } from "./VisorRAG";

export default async function RagFormatoPage({
  params,
  searchParams,
}: {
  params: Promise<{ formato: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const { formato: slug } = await params;
  const { modo: modoParam } = await searchParams;
  const clave = slugAClave(slug);

  const supabase = await createClient();
  const [formato, ciclo, sistemas] = await Promise.all([
    obtenerFormatoPorClave(supabase, clave),
    obtenerCicloAbierto(supabase),
    obtenerSistemas(supabase),
  ]);
  if (!formato) notFound();

  const sistema = formato.sistema_id ? (sistemas.find((s) => s.id === formato.sistema_id) ?? null) : null;

  let elementos: Awaited<ReturnType<typeof obtenerElementosParaRag>> = [];
  let puntos: PuntoDef[] = [];

  if (ciclo && sistema) {
    const [filas, plantilla] = await Promise.all([
      obtenerElementosParaRag(supabase, ciclo.id, sistema.id),
      obtenerPlantilla(supabase, ciclo.id, sistema.id),
    ]);
    elementos = filas;
    puntos = plantilla?.puntos ?? [];
  }

  const hayCapturaAlguna = elementos.some((e) => e.registro !== null);
  // El toggle explícito de la pantalla manda sobre lo que ya se capturó:
  // "Vacío" siempre entrega una plantilla en blanco, aunque haya datos —
  // sirve para tener copias de respaldo para llenar a mano.
  const modo = modoParam === "vacio" || modoParam === "lleno" ? modoParam : hayCapturaAlguna ? "lleno" : "vacio";

  const documento = armarDocumentoRAG({
    formato,
    puntos,
    elementos: elementos.map((e) => ({
      id: e.id,
      numeracion: e.nombre,
      ubicacion: e.ubicacion,
      referencia: e.referencia,
      seccion: e.seccion,
      ordenSeccion: e.orden_seccion,
      orden: e.orden,
    })),
    respuestas:
      modo === "lleno"
        ? elementos
            .filter((e) => e.registro !== null)
            .map((e) => ({
              elementoId: e.id,
              valores: e.registro?.valores ?? {},
              // La columna Observaciones del documento se llena con
              // 'pendientes' — ver docs/decisiones.md D-15 §7.2.
              observaciones: e.registro?.pendientes ?? null,
            }))
        : undefined,
    cicloClave: ciclo?.clave ?? null,
    cicloNombre: ciclo?.nombre ?? null,
  });

  const htmlCuerpo = renderizarCuerpoRAG(documento);
  const htmlCompleto = renderizarDocumentoCompleto(documento);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_RAG }} />

      {!ciclo && (
        <p className="mb-4 border border-vw-amber/40 bg-vw-amber/10 px-3 py-2 text-sm text-vw-deep-space">
          No hay ningún ciclo abierto: se muestra el formato en blanco, sin elementos.
        </p>
      )}
      {ciclo && !sistema && (
        <p className="mb-4 border border-vw-amber/40 bg-vw-amber/10 px-3 py-2 text-sm text-vw-deep-space">
          Este formato no está asociado a ningún sistema del catálogo; se muestra sin elementos.
        </p>
      )}

      <FormatoEditor formato={formato} sistemas={sistemas} />

      <VisorRAG
        html={htmlCuerpo}
        htmlCompleto={htmlCompleto}
        modo={modo}
        hrefVacio={`/rag/${slug}?modo=vacio`}
        hrefLleno={`/rag/${slug}?modo=lleno`}
        volverHref="/rag"
      />
    </div>
  );
}
