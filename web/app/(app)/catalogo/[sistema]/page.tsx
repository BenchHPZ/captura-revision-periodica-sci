import { redirect } from "next/navigation";

// /catalogo/[sistema] se fusionó con /rag/[formato] en /sistemas/[clave]
// — el parámetro ya es la clave del sistema. Ver docs/decisiones.md D-21.
export default async function CatalogoSistemaRedirect({ params }: { params: Promise<{ sistema: string }> }) {
  const { sistema } = await params;
  redirect(`/sistemas/${sistema}`);
}
