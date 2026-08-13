import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto, obtenerFormatos, obtenerSistemas } from "@/lib/datos";
import { RagIndex } from "./RagIndex";

export default async function RagIndexPage() {
  const supabase = await createClient();
  const [ciclo, formatos, sistemas] = await Promise.all([
    obtenerCicloAbierto(supabase),
    obtenerFormatos(supabase),
    obtenerSistemas(supabase),
  ]);

  const nombrePorSistemaId = Object.fromEntries(sistemas.map((s) => [s.id, s.nombre]));

  return (
    <RagIndex
      ciclo={ciclo ? { nombre: ciclo.nombre } : null}
      formatos={formatos}
      nombrePorSistemaId={nombrePorSistemaId}
    />
  );
}
