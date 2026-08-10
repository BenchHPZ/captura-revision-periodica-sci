import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto, obtenerElementosCatalogo, obtenerPlantilla, obtenerSistemas } from "@/lib/datos";
import { ElementosCatalogo } from "./ElementosCatalogo";
import { PlantillaEditor } from "./PlantillaEditor";

export default async function CatalogoSistemaPage({
  params,
}: {
  params: Promise<{ sistema: string }>;
}) {
  const { sistema: sistemaClave } = await params;
  const supabase = await createClient();

  const ciclo = await obtenerCicloAbierto(supabase);
  if (!ciclo) notFound();

  const sistemas = await obtenerSistemas(supabase);
  const sistema = sistemas.find((s) => s.clave === sistemaClave);
  if (!sistema) notFound();

  const [elementos, plantilla] = await Promise.all([
    obtenerElementosCatalogo(supabase, ciclo.id, sistema.id),
    obtenerPlantilla(supabase, ciclo.id, sistema.id),
  ]);

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">{sistema.nombre}</h1>
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
        />
      </div>
    </div>
  );
}
