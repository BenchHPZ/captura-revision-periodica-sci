// Envoltorio de etiqueta + control, y sus dos variantes más usadas (texto
// y selección). Antes existían cuatro copias casi idénticas de este
// patrón repartidas entre Formulario.tsx, ElementosCatalogo.tsx,
// PlantillaEditor.tsx y FormatoEditor.tsx. Ver docs/decisiones.md D-21.
export function Campo({ etiqueta, requerido, children }: { etiqueta: string; requerido?: boolean; children: React.ReactNode }) {
  return (
    <label className="text-sm text-vw-deep-space">
      <span className="block text-xs text-vw-dsb-60">
        {etiqueta}
        {requerido && <span className="text-vw-red"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function CampoTexto({
  etiqueta,
  valor,
  onChange,
  requerido,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
  placeholder?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} requerido={requerido}>
      <input
        value={valor}
        required={requerido}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
      />
    </Campo>
  );
}

export function CampoSelect({
  etiqueta,
  valor,
  onChange,
  opciones,
  vacioEtiqueta = "— Ninguno —",
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  vacioEtiqueta?: string;
}) {
  return (
    <Campo etiqueta={etiqueta}>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
      >
        <option value="">{vacioEtiqueta}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Campo>
  );
}
