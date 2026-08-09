import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-vw-deep-space px-4">
      <div className="w-full max-w-sm border border-white/10 bg-vw-dsb-90 p-8">
        <p className="text-sm font-medium tracking-wide text-vw-vg-40">
          Protección Contra Incendios
        </p>
        <h1 className="mt-1 text-2xl text-white">Captura SCI</h1>

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-vw-dsb-20">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full border border-white/20 bg-transparent px-3 py-2 text-white outline-none focus:border-vw-vivid-green"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-vw-dsb-20">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full border border-white/20 bg-transparent px-3 py-2 text-white outline-none focus:border-vw-vivid-green"
            />
          </div>

          {error && (
            <p className="border border-vw-red/50 bg-vw-red/10 px-3 py-2 text-sm text-white">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-vw-vivid-green px-3 py-2 font-medium text-white transition hover:bg-vw-vg-80"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
