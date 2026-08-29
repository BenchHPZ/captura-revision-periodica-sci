// El aviso "no hay ningún ciclo abierto" — copiado antes en 5 pantallas
// con el mismo texto base. Ver docs/decisiones.md D-21.
export function SinCiclo({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border border-vw-dsb-20 bg-vw-vg-10 p-4 text-sm text-vw-deep-space">
      {children ?? "No hay ningún ciclo abierto."}
    </div>
  );
}
