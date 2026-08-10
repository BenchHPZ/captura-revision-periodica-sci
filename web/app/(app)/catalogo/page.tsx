import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto, obtenerElementosCatalogo, obtenerPlantilla, obtenerSistemas } from "@/lib/datos";
import { CatalogoIndex } from "./CatalogoIndex";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  if (!ciclo) {
    return (
      <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
        No hay ningún ciclo abierto todavía.
      </div>
    );
  }

  const sistemas = await obtenerSistemas(supabase);

  const porSistema = await Promise.all(
    sistemas.map(async (sistema) => {
      const [elementos, plantilla] = await Promise.all([
        obtenerElementosCatalogo(supabase, ciclo.id, sistema.id),
        obtenerPlantilla(supabase, ciclo.id, sistema.id),
      ]);
      return { sistema, elementos, plantilla };
    }),
  );

  const resumenSistemas = porSistema.map(({ sistema, elementos }) => ({
    clave: sistema.clave,
    nombre: sistema.nombre,
    rag: sistema.rag,
    activos: elementos.filter((e) => e.activo).length,
    inactivos: elementos.filter((e) => !e.activo).length,
  }));

  const catalogoCompleto = {
    ciclo: ciclo.clave,
    elementos: porSistema.flatMap(({ sistema, elementos }) =>
      elementos.map((e) => ({
        codigo: e.codigo,
        sistema: sistema.clave,
        nombre: e.nombre,
        zona: e.zona,
        ubicacion: e.ubicacion,
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
    <CatalogoIndex
      ciclo={{ id: ciclo.id, clave: ciclo.clave, nombre: ciclo.nombre }}
      sistemas={resumenSistemas}
      catalogoCompleto={catalogoCompleto}
      plantillasCompletas={plantillasCompletas}
    />
  );
}
