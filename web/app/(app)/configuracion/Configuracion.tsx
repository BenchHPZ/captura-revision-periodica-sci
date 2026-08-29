"use client";

import { useState } from "react";
import type { Ciclo, Sistema, Zona } from "@/lib/tipos";
import { PanelCiclo } from "./PanelCiclo";
import { PanelImportarExportar } from "./PanelImportarExportar";
import { PanelSistemas } from "./PanelSistemas";
import { PanelZonas } from "./PanelZonas";

type Pestana = "ciclo" | "sistemas" | "zonas" | "importar";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "ciclo", etiqueta: "Ciclo" },
  { id: "sistemas", etiqueta: "Sistemas" },
  { id: "zonas", etiqueta: "Zonas" },
  { id: "importar", etiqueta: "Importar y exportar" },
];

interface Props {
  ciclo: Ciclo;
  sistemas: Sistema[];
  zonas: Zona[];
  catalogoCompleto: unknown;
  plantillasCompletas: unknown;
}

/** Sustituye a /catalogo e /rag como índices — todo lo configurable del
 * ciclo en un solo lugar. Ver docs/decisiones.md D-21. */
export function Configuracion({ ciclo, sistemas, zonas, catalogoCompleto, plantillasCompletas }: Props) {
  const [pestana, setPestana] = useState<Pestana>("ciclo");

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">Configuración</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">{ciclo.nombre}</p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-vw-dsb-20">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPestana(p.id)}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              pestana === p.id
                ? "border-vw-vivid-green font-medium text-vw-deep-space"
                : "border-transparent text-vw-dsb-60 hover:text-vw-deep-space"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {pestana === "ciclo" && <PanelCiclo ciclo={ciclo} sistemas={sistemas} />}
        {pestana === "sistemas" && <PanelSistemas sistemas={sistemas} />}
        {pestana === "zonas" && <PanelZonas zonas={zonas} />}
        {pestana === "importar" && (
          <PanelImportarExportar
            ciclo={{ id: ciclo.id, clave: ciclo.clave }}
            catalogoCompleto={catalogoCompleto}
            plantillasCompletas={plantillasCompletas}
            zonas={zonas}
            sistemas={sistemas}
          />
        )}
      </div>
    </div>
  );
}
