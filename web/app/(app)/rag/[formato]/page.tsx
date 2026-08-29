import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerFormatoPorClave, obtenerSistemas } from "@/lib/datos";
import { slugAClave } from "@/lib/rag/documento";

// /rag/[formato] se fusionó con /catalogo/[sistema] en /sistemas/[clave]
// — hay que resolver formato → sistema para saber a dónde mandar. Un
// formato sin sistema asociado no tiene pantalla propia: se administra
// desde Configuración. Ver docs/decisiones.md D-21.
export default async function RagFormatoRedirect({ params }: { params: Promise<{ formato: string }> }) {
  const { formato: slug } = await params;
  const supabase = await createClient();
  const formato = await obtenerFormatoPorClave(supabase, slugAClave(slug));

  if (formato?.sistema_id) {
    const sistemas = await obtenerSistemas(supabase);
    const sistema = sistemas.find((s) => s.id === formato.sistema_id);
    if (sistema) redirect(`/sistemas/${sistema.clave}`);
  }
  redirect("/configuracion");
}
