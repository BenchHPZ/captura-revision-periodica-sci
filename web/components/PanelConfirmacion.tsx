"use client";

import { Aviso } from "./Aviso";
import { BotonPrimario, BotonSecundario } from "./Boton";

// La máquina "vista previa → confirmar → aplicado" — antes copiada casi
// idéntica en CatalogoIndex.tsx, RagIndex.tsx y PlantillaEditor.tsx (D-21).
// Quien la usa sólo aporta el contenido del resumen (children) y las tres
// acciones; el estado de fase lo sigue llevando cada pantalla, porque
// cada una calcula su resumen de forma distinta.
export function PanelVistaPrevia({
  aplicando,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Confirmar",
  textoAplicando = "Aplicando…",
  children,
}: {
  aplicando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  textoConfirmar?: string;
  textoAplicando?: string;
  children: React.ReactNode;
}) {
  return (
    <Aviso tipo="ambar">
      <p className="font-medium">Vista previa — todavía no se guarda nada.</p>
      {children}
      <div className="mt-3 flex gap-3">
        <BotonPrimario onClick={onConfirmar} disabled={aplicando}>
          {aplicando ? textoAplicando : textoConfirmar}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar} disabled={aplicando}>
          Cancelar
        </BotonSecundario>
      </div>
    </Aviso>
  );
}

export function PanelExito({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Aviso tipo="exito">
      <p className="font-medium">{titulo}</p>
      {children}
      <button type="button" onClick={onCerrar} className="mt-2 text-vw-vivid-green hover:underline">
        Cerrar
      </button>
    </Aviso>
  );
}
