import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerChecklistCompleto, obtenerCicloAbierto, obtenerFormatoPorClave, obtenerSistemas } from "@/lib/datos";
import { armarDocumentoChecklist, type BloqueChecklistCrudo } from "@/lib/checklist/documento";
import { renderizarCuerpoChecklist, renderizarDocumentoCompleto } from "@/lib/checklist/render";
import { ESTILOS_CHECKLIST } from "@/lib/checklist/estilos";
import { DIAS_POR_DEFECTO } from "@/lib/checklist/constantes";
import { slugAClave } from "@/lib/rag/documento";
import { VisorDocumento } from "@/components/VisorDocumento";

/**
 * Antes esta ruta sólo resolvía formato → sistema y redirigía a
 * /sistemas/[clave] (D-21: todo formato RAG colgaba de un sistema). Un
 * checklist con sistema_id null no tiene esa salida — se resuelve y se
 * imprime aquí mismo (ver docs/decisiones.md D-22).
 */
export default async function RagFormatoPage({ params }: { params: Promise<{ formato: string }> }) {
  const { formato: slug } = await params;
  const supabase = await createClient();
  const formato = await obtenerFormatoPorClave(supabase, slugAClave(slug));
  if (!formato) notFound();

  if (formato.tipo_documento === "rag") {
    if (formato.sistema_id) {
      const sistemas = await obtenerSistemas(supabase);
      const sistema = sistemas.find((s) => s.id === formato.sistema_id);
      if (sistema) redirect(`/sistemas/${sistema.clave}`);
    }
    redirect("/rag");
  }

  const [{ bloques, fotoUrlPorRuta }, ciclo] = await Promise.all([
    obtenerChecklistCompleto(supabase, formato.id),
    obtenerCicloAbierto(supabase),
  ]);

  const bloquesCrudo: BloqueChecklistCrudo[] = bloques.map((b) => ({
    id: b.id,
    tipo: b.tipo,
    nombre: b.nombre,
    orden: b.orden,
    columnas: b.columnas,
    filasBlanco: b.filas_blanco,
    items: b.items.map((i) => ({
      id: i.id,
      categoria: i.categoria,
      pos: i.pos,
      nombre: i.nombre,
      cantidad: i.cantidad,
      fotoReferenciaRuta: i.foto_referencia_ruta,
      verificaciones: i.verificaciones,
      orden: i.orden,
    })),
  }));

  const diasDelMes = ciclo ? new Date(ciclo.anio, ciclo.mes, 0).getDate() : DIAS_POR_DEFECTO;

  const documento = armarDocumentoChecklist({
    formato: {
      clave: formato.clave,
      nombre: formato.nombre,
      documento_referencia: formato.documento_referencia,
      revision: formato.revision,
      instrucciones: formato.instrucciones,
    },
    bloques: bloquesCrudo,
    fotoUrlPorRuta,
    diasDelMes,
    cicloClave: ciclo?.clave ?? null,
    cicloNombre: ciclo?.nombre ?? null,
  });

  const htmlCuerpo = renderizarCuerpoChecklist(documento);
  const htmlCompleto = renderizarDocumentoCompleto(documento);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl text-vw-deep-space">{formato.clave}</h1>
      </div>
      <p className="mb-6 text-sm text-vw-dsb-60">{formato.nombre}</p>

      <style dangerouslySetInnerHTML={{ __html: ESTILOS_CHECKLIST }} />
      <VisorDocumento html={htmlCuerpo} htmlCompleto={htmlCompleto} soloVacio volverHref="/rag" />
    </div>
  );
}
