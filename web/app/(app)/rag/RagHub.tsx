"use client";

import { useState } from "react";
import type { Formato, Sistema } from "@/lib/tipos";
import { ConstructorChecklist } from "./ConstructorChecklist";
import { ConstructorFormatoRag } from "./ConstructorFormatoRag";
import { FormatosLista } from "./FormatosLista";

type Pestana = "ver" | "construir";
type SubPestanaVer = "mensuales" | "checklists";
type TipoAConstruir = "checklist" | "rag_mensual";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "ver", etiqueta: "Ver e imprimir" },
  { id: "construir", etiqueta: "Construir tipo nuevo" },
];

const SUB_PESTANAS_VER: { id: SubPestanaVer; etiqueta: string }[] = [
  { id: "mensuales", etiqueta: "Sistemas mensuales" },
  { id: "checklists", etiqueta: "Checklists" },
];

const TIPOS_A_CONSTRUIR: { id: TipoAConstruir; etiqueta: string }[] = [
  { id: "rag_mensual", etiqueta: "RAG mensual" },
  { id: "checklist", etiqueta: "Checklist" },
];

interface Props {
  formatos: Formato[];
  sistemas: Sistema[];
}

/**
 * Pestaña independiente para RAG y checklist — antes /rag redirigía a
 * /configuracion porque D-21 asumió que todo formato cuelga de un
 * sistema. Un checklist con sistema_id null rompe esa premisa: necesita
 * pantalla propia (ver docs/decisiones.md D-22). "Ver e imprimir" separa
 * sistemas mensuales de checklists en sub-pestañas propias (no una sola
 * lista con encabezados) y "Construir tipo nuevo" ahora puede dar de alta
 * cualquiera de los dos tipos — antes sólo checklist (ver D-23).
 */
export function RagHub({ formatos, sistemas }: Props) {
  const [pestana, setPestana] = useState<Pestana>("ver");
  const [subPestanaVer, setSubPestanaVer] = useState<SubPestanaVer>("mensuales");
  const [tipoAConstruir, setTipoAConstruir] = useState<TipoAConstruir>("checklist");

  const formatosRag = formatos.filter((f) => f.tipo_documento === "rag");
  const formatosChecklist = formatos.filter((f) => f.tipo_documento === "checklist");

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
          <div>
            <div className="flex flex-wrap gap-1 border-b border-vw-dsb-10">
              {SUB_PESTANAS_VER.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubPestanaVer(p.id)}
                  className={`border-b-2 px-2.5 py-1.5 text-sm transition ${
                    subPestanaVer === p.id
                      ? "border-vw-vivid-green font-medium text-vw-deep-space"
                      : "border-transparent text-vw-dsb-60 hover:text-vw-deep-space"
                  }`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {subPestanaVer === "mensuales" && (
                <FormatosLista formatosIniciales={formatosRag} sistemas={sistemas} tipo="rag" />
              )}
              {subPestanaVer === "checklists" && (
                <FormatosLista formatosIniciales={formatosChecklist} sistemas={sistemas} tipo="checklist" />
              )}
            </div>
          </div>
        )}

        {pestana === "construir" && (
          <div>
            <div className="flex flex-wrap gap-2">
              {TIPOS_A_CONSTRUIR.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoAConstruir(t.id)}
                  className={`border px-3 py-1.5 text-sm transition ${
                    tipoAConstruir === t.id
                      ? "border-vw-vivid-green font-medium text-vw-deep-space"
                      : "border-vw-dsb-20 text-vw-dsb-60 hover:border-vw-vivid-green hover:text-vw-deep-space"
                  }`}
                >
                  {t.etiqueta}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {tipoAConstruir === "rag_mensual" && <ConstructorFormatoRag sistemas={sistemas} formatos={formatos} />}
              {tipoAConstruir === "checklist" && <ConstructorChecklist />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
