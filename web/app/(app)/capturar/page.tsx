import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { contarPorEstado, obtenerCicloAbierto, obtenerElementos, obtenerSistemas } from "@/lib/datos";
import { SinCiclo } from "@/components/SinCiclo";

export default async function CapturarPage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  if (!ciclo) {
    return (
      <SinCiclo>
        No hay ningún ciclo abierto todavía. Abrir uno nuevo —clonando el catálogo del anterior—
        todavía se hace corriendo{" "}
        <code className="bg-white px-1 py-0.5">scripts/cargar_catalogo.py --confirmar</code>; una vez
        abierto, se ajusta desde Configuración.
      </SinCiclo>
    );
  }

  const sistemas = await obtenerSistemas(supabase);
  const activos = sistemas.filter((s) => ciclo.config.captura_directa?.includes(s.clave));

  if (activos.length === 0) {
    return (
      <SinCiclo>
        El ciclo {ciclo.nombre} no tiene ningún sistema marcado para captura directa en su
        configuración (<code className="bg-white px-1 py-0.5">captura_directa</code>).
      </SinCiclo>
    );
  }

  const conteos = await Promise.all(
    activos.map(async (sistema) => {
      const elementos = await obtenerElementos(supabase, ciclo.id, sistema.id);
      return { sistema, conteo: contarPorEstado(elementos) };
    }),
  );

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">Capturar</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <div className="mt-6 space-y-3">
        {conteos.map(({ sistema, conteo }) => (
          <Link
            key={sistema.id}
            href={`/capturar/${sistema.clave}`}
            className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-vw-deep-space">{sistema.nombre}</span>
              {sistema.rag && <span className="text-xs text-vw-dsb-60">{sistema.rag}</span>}
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-vw-dsb-60">
              <span>
                <span className="font-medium text-vw-green">{conteo.completo}</span> completos
              </span>
              <span>
                <span className="font-medium text-vw-deep-space">{conteo.parcial}</span> parciales
              </span>
              <span>
                <span className="font-medium text-vw-deep-space">{conteo.total}</span> en total
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
