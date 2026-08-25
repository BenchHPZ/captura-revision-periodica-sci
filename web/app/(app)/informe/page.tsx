import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto } from "@/lib/datos";
import { Informe } from "./Informe";

// Con 221 elementos, descargar sus fotografías, armar los collages y
// escribir el .pptx puede tardar más que el límite por defecto de una
// función serverless — ver docs/decisiones.md D-17 (riesgo de tiempo de
// ejecución, todavía sin medir contra el ciclo completo).
export const maxDuration = 300;

export default async function InformePage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  if (!ciclo) {
    return (
      <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
        No hay ningún ciclo abierto todavía.
      </div>
    );
  }

  return <Informe ciclo={{ nombre: ciclo.nombre }} />;
}
