import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  firmarRutas,
  obtenerCicloAbierto,
  obtenerElemento,
  obtenerPlantilla,
  obtenerRegistro,
  obtenerSistemas,
} from "@/lib/datos";
import { Formulario } from "./Formulario";

export default async function ElementoPage({
  params,
}: {
  params: Promise<{ sistema: string; id: string }>;
}) {
  const { sistema: sistemaClave, id } = await params;
  const supabase = await createClient();

  const ciclo = await obtenerCicloAbierto(supabase);
  if (!ciclo) notFound();

  const sistemas = await obtenerSistemas(supabase);
  const sistema = sistemas.find((s) => s.clave === sistemaClave);
  // Este formulario lo abren dos caminos distintos: la captura directa
  // (Fase 2) y la asignación desde recepción (Fase 3, RF-14) para los
  // sistemas que no se capturan en persona. Por eso valida contra todos
  // los sistemas activos del ciclo, no sólo contra captura_directa.
  if (!sistema || !ciclo.config.sistemas_activos?.includes(sistema.clave)) notFound();

  const elemento = await obtenerElemento(supabase, sistema.id, id);
  if (!elemento) notFound();

  const plantilla = await obtenerPlantilla(supabase, ciclo.id, sistema.id);
  if (!plantilla) notFound();

  const { registro, fotos } = await obtenerRegistro(supabase, elemento.id, ciclo.id);
  const urls = await firmarRutas(
    supabase,
    fotos.map((f) => f.ruta),
  );

  // La lista por sistema (/capturar/[sistema]) sólo existe para los
  // sistemas de captura directa; si este elemento se llegó a través de
  // recepción, "volver" no tiene a dónde regresar ahí, y "guardar y
  // siguiente" tampoco tiene un recorrido ordenado que ofrecer.
  const esCapturaDirecta = ciclo.config.captura_directa?.includes(sistema.clave) ?? false;
  const volverHref = esCapturaDirecta ? `/capturar/${sistema.clave}` : "/recepcion";
  const volverEtiqueta = esCapturaDirecta ? sistema.nombre : "Recepción";

  return (
    <Formulario
      ciclo={{ id: ciclo.id, clave: ciclo.clave, imagen: ciclo.config.imagen }}
      sistema={{ id: sistema.id, clave: sistema.clave, nombre: sistema.nombre }}
      elemento={elemento}
      plantilla={plantilla}
      registro={registro}
      fotos={fotos.map((f) => ({ ...f, url: urls[f.ruta] ?? null }))}
      volverHref={volverHref}
      volverEtiqueta={volverEtiqueta}
      esCapturaDirecta={esCapturaDirecta}
    />
  );
}
