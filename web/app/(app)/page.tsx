import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerCicloAbierto } from "@/lib/datos";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ciclo = await obtenerCicloAbierto(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-vw-deep-space">{ciclo ? ciclo.nombre : "Sesión iniciada"}</h1>
        <p className="mt-1 text-vw-dsb-60">{user?.email}</p>
      </div>

      <Link
        href="/capturar"
        className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
      >
        <span className="font-medium text-vw-deep-space">Capturar</span>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Fotografías y puntos de revisión de los sistemas de captura directa.
        </p>
      </Link>

      <Link
        href="/recepcion"
        className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
      >
        <span className="font-medium text-vw-deep-space">Recepción</span>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Clasificar las fotografías que llegan por WhatsApp de los demás sistemas.
        </p>
      </Link>

      <Link
        href="/tablero"
        className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
      >
        <span className="font-medium text-vw-deep-space">Tablero</span>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Avance de mi captura y de lo recibido por recepción, con exportación a CSV y JSON.
        </p>
      </Link>

      <Link
        href="/catalogo"
        className="block border border-vw-dsb-20 p-4 transition hover:border-vw-vivid-green"
      >
        <span className="font-medium text-vw-deep-space">Catálogo</span>
        <p className="mt-1 text-sm text-vw-dsb-60">
          Elementos y plantillas del ciclo, importar y exportar en JSON.
        </p>
      </Link>
    </div>
  );
}
