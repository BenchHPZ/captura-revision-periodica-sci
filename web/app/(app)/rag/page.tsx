import { createClient } from "@/lib/supabase/server";
import { obtenerFormatos, obtenerSistemasCatalogo } from "@/lib/datos";
import { RagHub } from "./RagHub";

/**
 * Antes redirigía a /configuracion (D-21: todo formato colgaba de un
 * sistema, así que no hacía falta pantalla propia). Un checklist con
 * sistema_id null la necesita — ver docs/decisiones.md D-22.
 */
export default async function RagPage() {
  const supabase = await createClient();
  const [formatos, sistemas] = await Promise.all([obtenerFormatos(supabase), obtenerSistemasCatalogo(supabase)]);

  return <RagHub formatos={formatos} sistemas={sistemas} />;
}
