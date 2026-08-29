// Los dos botones que se repiten en cada pantalla con un estado manual
// de "pendiente" (a diferencia de Formulario.tsx/Recepcion.tsx, que usan
// useFormStatus() porque de verdad envían un <form>). Ver
// docs/decisiones.md D-21.
export function BotonPrimario({
  onClick,
  disabled,
  children,
  type = "button",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="bg-vw-vivid-green px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vw-vg-80 disabled:cursor-not-allowed disabled:bg-vw-dsb-20 disabled:text-vw-dsb-60"
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-sm text-vw-dsb-60 transition hover:text-vw-deep-space disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
