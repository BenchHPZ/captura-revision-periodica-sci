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
  deshabilitado,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  return (
    <Campo etiqueta={etiqueta} requerido={requerido}>
      <input
        value={valor}
        required={requerido}
        placeholder={placeholder}
        disabled={deshabilitado}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green disabled:bg-vw-dsb-10 disabled:text-vw-dsb-60"
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
  sinVacio,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  vacioEtiqueta?: string;
  /** Oculta la opción vacía inicial: para un campo que siempre tiene un
   * valor (tamaño de hoja, orientación), donde "— Ninguno —" no significa
   * nada y sólo permite dejarlo en un estado inválido. */
  sinVacio?: boolean;
}) {
  return (
    <Campo etiqueta={etiqueta}>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-vw-dsb-20 px-2 py-1.5 text-sm outline-none focus:border-vw-vivid-green"
      >
        {!sinVacio && <option value="">{vacioEtiqueta}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/** Casilla con su etiqueta a la derecha — el patrón que hasta ahora se
 * escribía a mano en FormatoEditor.tsx. La etiqueta va al lado, no arriba
 * como en los demás campos, porque una casilla se lee de corrido con su
 * texto. */
export function CampoCheckbox({
  etiqueta,
  valor,
  onChange,
  deshabilitado,
  ayuda,
}: {
  etiqueta: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  deshabilitado?: boolean;
  ayuda?: string;
}) {
  return (
    <div className="text-sm text-vw-deep-space">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={valor}
          disabled={deshabilitado}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-vw-vivid-green disabled:opacity-50"
        />
        <span className={deshabilitado ? "text-vw-dsb-60" : undefined}>{etiqueta}</span>
      </label>
      {ayuda && <p className="mt-1 text-xs text-vw-dsb-60">{ayuda}</p>}
    </div>
  );
}
