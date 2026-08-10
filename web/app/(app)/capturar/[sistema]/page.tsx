import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto, obtenerElementos, obtenerSistemas } from "@/lib/datos";
import { ListaElementos } from "./ListaElementos";

export default async function SistemaPage({
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
  if (!sistema || !ciclo.config.captura_directa?.includes(sistema.clave)) notFound();

  const elementos = await obtenerElementos(supabase, ciclo.id, sistema.id);

  return (
    <div>
      <Link href="/capturar" className="text-sm text-vw-dsb-60 hover:text-vw-vivid-green">
        ← Capturar
      </Link>
      <h1 className="mt-2 text-2xl text-vw-deep-space">{sistema.nombre}</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">
        {elementos.length} elemento{elementos.length === 1 ? "" : "s"} · {ciclo.nombre}
      </p>

      <div className="mt-6">
        <ListaElementos elementos={elementos} sistemaClave={sistema.clave} />
      </div>
    </div>
  );
}
