import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto, obtenerElementosCatalogo, obtenerPlantilla, obtenerSistemasCatalogo, obtenerZonas } from "@/lib/datos";
import { SinCiclo } from "@/components/SinCiclo";
import { Configuracion } from "./Configuracion";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  const [sistemas, zonas] = await Promise.all([obtenerSistemasCatalogo(supabase), obtenerZonas(supabase)]);

  if (!ciclo) {
    return <SinCiclo>No hay ningún ciclo abierto — el catálogo de sistemas y zonas se puede seguir editando.</SinCiclo>;
  }

  const porSistema = await Promise.all(
    sistemas.map(async (sistema) => {
      const [elementos, plantilla] = await Promise.all([
        obtenerElementosCatalogo(supabase, ciclo.id, sistema.id),
        obtenerPlantilla(supabase, ciclo.id, sistema.id),
      ]);
      return { sistema, elementos, plantilla };
    }),
  );

  const catalogoCompleto = {
    ciclo: ciclo.clave,
    elementos: porSistema.flatMap(({ sistema, elementos }) =>
      elementos.map((e) => ({
        codigo: e.codigo,
        sistema: sistema.clave,
        nombre: e.nombre,
        zona: e.zona,
        ubicacion: e.ubicacion,
        referencia: e.referencia,
        seccion: e.seccion,
        orden_seccion: e.orden_seccion,
        tipo: e.tipo,
        responsable: e.responsable,
        item_rag: e.item_rag,
        orden: e.orden,
        activo: e.activo,
      })),
    ),
  };

  const plantillasCompletas = {
    ciclo: ciclo.clave,
    plantillas: porSistema
      .filter((fila) => fila.plantilla !== null)
      .map(({ sistema, plantilla }) => ({ sistema: sistema.clave, ...plantilla })),
  };

  return (
    <Configuracion
      ciclo={ciclo}
      sistemas={sistemas}
      zonas={zonas}
      catalogoCompleto={catalogoCompleto}
      plantillasCompletas={plantillasCompletas}
    />
  );
}
