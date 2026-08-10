import { createClient } from "@/lib/supabase/server";
import {
  firmarRutas,
  obtenerCicloAbierto,
  obtenerElementos,
  obtenerEntradaPendiente,
  obtenerPlantilla,
  obtenerSistemas,
} from "@/lib/datos";
import { Recepcion } from "./Recepcion";

export default async function RecepcionPage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  if (!ciclo) {
    return (
      <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
        No hay ningún ciclo abierto todavía.
      </div>
    );
  }

  const todosLosSistemas = await obtenerSistemas(supabase);
  const clavesRecepcion = (ciclo.config.sistemas_activos ?? []).filter(
    (clave) => !ciclo.config.captura_directa?.includes(clave),
  );
  const sistemasRecepcion = todosLosSistemas.filter((s) => clavesRecepcion.includes(s.clave));

  if (sistemasRecepcion.length === 0) {
    return (
      <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
        El ciclo {ciclo.nombre} no tiene ningún sistema fuera de captura directa: no hay nada que
        recibir por esta vía.
      </div>
    );
  }

  const sistemas = await Promise.all(
    sistemasRecepcion.map(async (sistema) => {
      const [elementos, plantilla] = await Promise.all([
        obtenerElementos(supabase, ciclo.id, sistema.id),
        obtenerPlantilla(supabase, ciclo.id, sistema.id),
      ]);
      return {
        id: sistema.id,
        clave: sistema.clave,
        nombre: sistema.nombre,
        elementos: elementos.map((e) => ({
          id: e.id,
          codigo: e.codigo,
          nombre: e.nombre,
          zona: e.zona,
          ubicacion: e.ubicacion,
          estado: e.registro?.estado ?? ("sin_iniciar" as const),
        })),
        momentos: (plantilla?.fotos ?? []).map((f) => ({ id: f.id, etiqueta: f.etiqueta })),
      };
    }),
  );

  const entradas = await obtenerEntradaPendiente(supabase, ciclo.id);
  const urls = await firmarRutas(
    supabase,
    entradas.map((e) => e.ruta),
  );

  return (
    <Recepcion
      ciclo={{ id: ciclo.id, clave: ciclo.clave, imagen: ciclo.config.imagen }}
      sistemas={sistemas}
      entradasIniciales={entradas.map((e) => ({
        id: e.id,
        nombreOriginal: e.nombre_original,
        bytes: e.bytes,
        url: urls[e.ruta] ?? null,
      }))}
    />
  );
}
