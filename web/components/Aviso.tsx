// Banner de mensaje, en sus tres variantes — antes copiado a mano en 8
// lugares distintos con las mismas clases (error: border-vw-red/40
// bg-vw-red/10; ámbar: border-vw-amber/40 bg-vw-amber/10; éxito:
// border-vw-green/40 bg-vw-green/10). Ver docs/decisiones.md D-21.
export type TipoAviso = "error" | "ambar" | "exito";

const CLASES: Record<TipoAviso, string> = {
  error: "border-vw-red/40 bg-vw-red/10",
  ambar: "border-vw-amber/40 bg-vw-amber/10",
  exito: "border-vw-green/40 bg-vw-green/10",
};

export function Aviso({ tipo, children }: { tipo: TipoAviso; children: React.ReactNode }) {
  return <div className={`border p-3 text-sm text-vw-deep-space ${CLASES[tipo]}`}>{children}</div>;
}
