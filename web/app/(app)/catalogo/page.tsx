import { redirect } from "next/navigation";

// El índice de catálogo pasó a ser Configuración → Importar y exportar
// — ver docs/decisiones.md D-21.
export default function CatalogoRedirect() {
  redirect("/configuracion");
}
