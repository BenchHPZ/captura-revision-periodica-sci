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
  if (!sistema || !ciclo.config.captura_directa?.includes(sistema.clave)) notFound();

  const elemento = await obtenerElemento(supabase, ciclo.id, sistema.id, id);
  if (!elemento) notFound();

  const plantilla = await obtenerPlantilla(supabase, ciclo.id, sistema.id);
  if (!plantilla) notFound();

  const { registro, fotos } = await obtenerRegistro(supabase, elemento.id);
  const urls = await firmarRutas(
    supabase,
    fotos.map((f) => f.ruta),
  );

  return (
    <Formulario
      ciclo={{ id: ciclo.id, clave: ciclo.clave, imagen: ciclo.config.imagen }}
      sistema={{ id: sistema.id, clave: sistema.clave, nombre: sistema.nombre }}
      elemento={elemento}
      plantilla={plantilla}
      registro={registro}
      fotos={fotos.map((f) => ({ ...f, url: urls[f.ruta] ?? null }))}
    />
  );
}
