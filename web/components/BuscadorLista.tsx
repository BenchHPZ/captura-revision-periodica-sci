"use client";

// El campo de búsqueda + el interruptor opcional a su lado ("Mostrar de
// baja", etc.) — antes copiado igual en ListaElementos.tsx, Recepcion.tsx
// y ElementosCatalogo.tsx (D-21). El filtrado en sí (normaliza + campos a
// comparar) sigue en cada pantalla porque cada lista compara campos
// distintos.
export function BuscadorLista({
  valor,
  onCambiar,
  placeholder,
  extra,
}: {
  valor: string;
  onCambiar: (v: string) => void;
  placeholder: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green sm:max-w-sm"
      />
      {extra}
    </div>
  );
}
