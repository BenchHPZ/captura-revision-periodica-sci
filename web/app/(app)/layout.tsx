import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

// Todo lo que cuelga de este grupo de rutas exige sesión. Es la única
// puerta de entrada: si no hay usuario, no se llega a ninguna pantalla
// interna sin pasar por /login.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between bg-vw-deep-space px-4 py-3 text-white sm:px-6">
        <div>
          <p className="text-sm font-medium tracking-wide text-vw-vg-40">
            Protección Contra Incendios
          </p>
          <p className="text-lg">Captura SCI</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="border border-white/30 px-3 py-1.5 text-sm text-white transition hover:border-vw-vivid-green hover:text-vw-vivid-green"
          >
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
