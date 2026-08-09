import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para componentes y acciones de servidor. Lee y escribe la sesión
// en las cookies de la petición.
//
// cookies() es asíncrono desde Next 15, así que esta función también lo es;
// cada punto de llamada debe usar await createClient().
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Se invocó desde un componente de servidor, que no puede
            // escribir cookies. El middleware refresca la sesión en cada
            // petición, así que esto es seguro de ignorar aquí.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ver nota en set().
          }
        },
      },
    },
  );
}
