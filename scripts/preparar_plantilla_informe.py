#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prepara la plantilla que consume el informe fotográfico, a partir de la
plantilla corporativa 'Reporte sistemas.pptx'.

¿Por qué hace falta este paso? 'Reporte sistemas.pptx' trae ocho
diapositivas base —intro, portada, agenda y los cinco divisores de
capítulo, ya redactados con su '– RAG 2.x'— pero ninguna diapositiva de
'Elemento'. Y 'pptx-automizer', que es quien arma el informe, sólo sabe
clonar diapositivas EXISTENTES (`addSlide(plantilla, numeroDeDiapositiva)`):
no tiene forma de crear una diapositiva a partir de un layout. Así que la
plantilla necesita traer una diapositiva de 'Elemento' que sirva de molde
para clonar una vez por cada elemento del ciclo.

Este script agrega exactamente eso: una novena diapositiva con el layout
'Elemento', y le RETIRA todos los placeholders. Ese último paso importa:
al crear una diapositiva desde un layout se copian sus placeholders con
el texto de ejemplo dentro ("Título en Deep Space Blue", "Click para
editar el texto"…), que no es un texto guía sino contenido real y se ve
en el archivo generado, encimado con lo que dibuja el generador. Como el
generador dibuja todo por su cuenta (ver docs/decisiones.md D-17), los
placeholders no hacen falta para nada: el fondo, el logo y los adornos
vienen del layout, no de ellos.

No modifica la plantilla corporativa: lee una y escribe otra.

Uso:
    python scripts/preparar_plantilla_informe.py \
        --origen "H:\\My Drive\\...\\Reporte sistemas.pptx" \
        --destino "H:\\My Drive\\...\\Plantilla_Informe.pptx"

Después hay que subirla al depósito:
    cd web && npx tsx scripts/subir-plantilla-informe.ts --archivo "<destino>" --confirmar
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Índice del layout 'Elemento' dentro de la plantilla corporativa. Los seis
# layouts son, en orden: Intro / Title with gradient 1 / Title with
# gradient 2 / 5x Agenda / Chapter divider / Elemento.
LAYOUT_ELEMENTO = 5
NOMBRE_LAYOUT_ESPERADO = "Elemento"
DIAPOSITIVAS_BASE_ESPERADAS = 8


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--origen", required=True, help="Ruta a 'Reporte sistemas.pptx'")
    ap.add_argument("--destino", required=True, help="Ruta del .pptx a escribir")
    args = ap.parse_args()

    origen = Path(args.origen)
    destino = Path(args.destino)

    if not origen.exists():
        print(f"No existe: {origen}", file=sys.stderr)
        return 1

    from pptx import Presentation

    prs = Presentation(str(origen))

    # Comprobaciones antes de escribir: si la plantilla corporativa cambia
    # de forma, es mejor detenerse aquí que producir un informe torcido.
    if len(prs.slide_layouts) <= LAYOUT_ELEMENTO:
        print(f"La plantilla sólo tiene {len(prs.slide_layouts)} layouts; se esperaba al menos {LAYOUT_ELEMENTO + 1}.", file=sys.stderr)
        return 1

    layout = prs.slide_layouts[LAYOUT_ELEMENTO]
    if layout.name != NOMBRE_LAYOUT_ESPERADO:
        print(f"El layout {LAYOUT_ELEMENTO} se llama {layout.name!r}, no {NOMBRE_LAYOUT_ESPERADO!r}.", file=sys.stderr)
        print("La plantilla corporativa cambió: revisar antes de seguir.", file=sys.stderr)
        return 1

    base = len(prs.slides)
    if base != DIAPOSITIVAS_BASE_ESPERADAS:
        print(f"Aviso: la plantilla trae {base} diapositivas base, no {DIAPOSITIVAS_BASE_ESPERADAS}.")
        print("El generador asume 1 intro + 1 portada + 1 agenda + un divisor por sistema.")

    molde = prs.slides.add_slide(layout)

    # Retirar los placeholders copiados del layout: traen el texto de
    # ejemplo dentro y saldría impreso debajo de lo que dibuja el
    # generador.
    retirados = []
    for ph in list(molde.placeholders):
        retirados.append(f"idx={ph.placeholder_format.idx} {ph.name!r}")
        ph._element.getparent().remove(ph._element)

    if molde.shapes:
        print(f"Aviso: quedaron {len(molde.shapes)} formas en el molde que no eran placeholders.")

    destino.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(destino))

    print(f"Origen:  {origen}")
    print(f"Destino: {destino}")
    print(f"Diapositivas: {base} base + 1 molde de 'Elemento' = {base + 1}")
    print(f"Placeholders retirados del molde: {len(retirados)}")
    for r in retirados:
        print(f"   - {r}")
    print("\nListo. Ahora súbela al depósito con:")
    print(f'  cd web && npx tsx scripts/subir-plantilla-informe.ts --archivo "{destino}" --confirmar')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
