import { redirect } from "next/navigation";

// El índice de formatos RAG pasó a ser Configuración → Importar y
// exportar — ver docs/decisiones.md D-21.
export default function RagRedirect() {
  redirect("/configuracion");
}
