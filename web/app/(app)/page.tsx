import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-vw-deep-space">Sesión iniciada</h1>
        <p className="mt-1 text-vw-dsb-60">{user?.email}</p>
      </div>
      <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
        La captura, la recepción y el tablero se construyen en las siguientes fases. Esta
        pantalla, por ahora, confirma únicamente que el acceso y la sesión funcionan.
      </div>
    </div>
  );
}
