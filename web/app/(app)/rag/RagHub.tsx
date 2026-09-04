"use client";

import { useState } from "react";
import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { claveASlug } from "@/lib/rag/documento";
import type { Formato, Sistema } from "@/lib/tipos";

type Pestana = "ver" | "construir";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "ver", etiqueta: "Ver e imprimir" },
  { id: "construir", etiqueta: "Construir tipo nuevo" },
];

interface Props {
  formatos: Formato[];
  sistemas: Sistema[];
}

/**
 * Pestaña independiente para RAG y checklist — antes /rag redirigía a
 * /configuracion porque D-21 asumió que todo formato cuelga de un
 * sistema. Un checklist con sistema_id null rompe esa premisa: necesita
 * pantalla propia, y el usuario pidió explícitamente que ver/imprimir y
 * construir tipos nuevos vivan en el mismo lugar (ver docs/decisiones.md
 * D-22). Un RAG mensual sigue enlazando a /sistemas/[clave] — D-21 sigue
 * vigente para ese caso, no se deshace.
 */
export function RagHub({ formatos, sistemas }: Props) {
  const [pestana, setPestana] = useState<Pestana>("ver");
  const sistemaPorId = new Map(sistemas.map((s) => [s.id, s]));

  return (
    <div>
      <h1 className="text-2xl text-vw-deep-space">RAG</h1>
      <p className="mt-1 text-sm text-vw-dsb-60">Formatos de verificación estandarizados, mensuales o por checklist.</p>

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
        {pestana === "ver" && (
          <ul className="divide-y divide-vw-dsb-10 border-y border-vw-dsb-10">
            {formatos.map((f) => {
              const sistema = f.sistema_id ? sistemaPorId.get(f.sistema_id) : null;
              const href = sistema ? `/sistemas/${sistema.clave}` : `/rag/${claveASlug(f.clave)}`;
              return (
                <li key={f.id}>
                  <Link href={href} className="flex items-center justify-between gap-3 px-1 py-3 hover:bg-vw-vg-10">
                    <div>
                      <p className="font-medium text-vw-deep-space">
                        {f.clave} <span className="text-sm font-normal text-vw-dsb-60">· {f.nombre}</span>
                      </p>
                      <p className="text-sm text-vw-dsb-60">
                        {f.tipo_documento === "checklist" ? "Checklist" : "RAG"} · {f.periodicidad}
                        {sistema && ` · ${sistema.nombre}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-vw-vivid-green">Ver →</span>
                  </Link>
                </li>
              );
            })}
            {formatos.length === 0 && <li className="py-3 text-sm text-vw-dsb-60">No hay formatos todavía.</li>}
          </ul>
        )}

        {pestana === "construir" && (
          <Aviso tipo="ambar">
            El constructor de checklist (definir bloques e ítems sin tocar código, o importar el JSON de un
            checklist ya extraído) llega en la Etapa 3 del plan de ampliación de RAGs.
          </Aviso>
        )}
      </div>
    </div>
  );
}
