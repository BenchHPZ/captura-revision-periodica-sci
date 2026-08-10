"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EstadoBadge } from "@/components/EstadoBadge";
import type { ElementoConEstado } from "@/lib/datos";

// NFD separa cada letra acentuada en la letra base + una marca combinante
// (bloque Unicode U+0300-U+036F); quitar esa marca permite comparar "á"
// con "a" al buscar. Se arma con códigos \uXXXX, no con el caracter
// combinante en crudo, porque ese caracter se renderiza pegado al
// vecino en cualquier editor y es fácil copiarlo mal sin notarlo.
const MARCA_DIACRITICA = new RegExp("[̀-ͯ]", "g");

function normaliza(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(MARCA_DIACRITICA, "");
}

export function ListaElementos({
  elementos,
  sistemaClave,
}: {
  elementos: ElementoConEstado[];
  sistemaClave: string;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = normaliza(busqueda.trim());
    if (!q) return elementos;
    return elementos.filter((e) =>
      [e.codigo, e.nombre, e.ubicacion, e.zona].some((campo) => campo && normaliza(campo).includes(q)),
    );
  }, [elementos, busqueda]);

  const siguientePendiente = elementos.find((e) => (e.registro?.estado ?? "sin_iniciar") !== "completo");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por identificador, nombre o ubicación…"
          className="w-full border border-vw-dsb-20 px-3 py-2 text-sm outline-none focus:border-vw-vivid-green sm:max-w-sm"
        />
        {siguientePendiente && (
          <Link
            href={`/capturar/${sistemaClave}/${siguientePendiente.id}`}
            className="shrink-0 bg-vw-vivid-green px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-vw-vg-80"
          >
            Continuar con {siguientePendiente.nombre}
          </Link>
        )}
      </div>

      <ul className="mt-4 divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
        {filtrados.map((e) => (
          <li key={e.id}>
            <Link
              href={`/capturar/${sistemaClave}/${e.id}`}
              className="flex items-center justify-between gap-3 px-1 py-3 transition hover:bg-vw-vg-10"
            >
              <div className="min-w-0">
                <p className="font-medium text-vw-deep-space">{e.nombre}</p>
                <p className="truncate text-sm text-vw-dsb-60">
                  {[e.zona, e.ubicacion].filter(Boolean).join(" · ") || "Sin ubicación registrada"}
                </p>
              </div>
              <EstadoBadge estado={e.registro?.estado ?? "sin_iniciar"} />
            </Link>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="px-1 py-6 text-center text-sm text-vw-dsb-60">
            Ningún elemento coincide con &ldquo;{busqueda}&rdquo;.
          </li>
        )}
      </ul>
    </div>
  );
}
