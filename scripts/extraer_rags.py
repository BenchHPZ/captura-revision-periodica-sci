#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrae el catálogo de elementos y las plantillas de revisión a partir de
los formatos RAG en PDF, y produce dos archivos JSON en el formato que la
aplicación importa (ver docs/modelo-de-datos.md §3.2 y §3.4).

Es una PROPUESTA, no la versión final. Los PDF de origen tienen renglones
ambiguos -duplicados, huecos en la numeración, zonas que el texto extraído
no separa con claridad- que este script señala en la consola y en el campo
"notas" de cada elemento, en lugar de resolverlos por su cuenta. Ver
docs/decisiones.md D-03. Revisar el reporte de anomalías antes de importar
el catálogo.

Uso:
    python scripts/extraer_rags.py \
        --formatos "H:\\My Drive\\VW\\03 - Reportes\\Revision periodica mensual\\Agosto\\Formatos de soporte" \
        --ciclo 2026-08 \
        --salida-catalogo catalogo_2026-08.json \
        --salida-plantillas plantillas_2026-08.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pypdf

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


# ---------------------------------------------------------------- utilidades


def paginas(pdf_path: Path) -> list[str]:
    reader = pypdf.PdfReader(str(pdf_path))
    return [p.extract_text() or "" for p in reader.pages]


class Anomalias:
    """Recolecta avisos para el reporte final; nunca interrumpe la extracción."""

    def __init__(self) -> None:
        self.items: list[str] = []

    def registrar(self, sistema: str, mensaje: str) -> None:
        self.items.append(f"[{sistema}] {mensaje}")

    def imprimir(self) -> None:
        print()
        if not self.items:
            print("Sin anomalías detectadas.")
            return
        print(f"{len(self.items)} anomalía(s) — revisar antes de importar el catálogo:")
        for a in self.items:
            print("  -", a)


def elemento(
    codigo: str,
    sistema: str,
    nombre: str,
    *,
    zona: str | None = None,
    ubicacion: str | None = None,
    tipo: str | None = None,
    responsable: str | None = None,
    item_rag: int | None = None,
    orden: int = 0,
    notas: str | None = None,
) -> dict:
    return {
        "codigo": codigo,
        "sistema": sistema,
        "nombre": nombre,
        "zona": zona,
        "ubicacion": ubicacion,
        "tipo": tipo,
        "responsable": responsable,
        "item_rag": item_rag,
        "orden": orden,
        "activo": True,
        "notas": notas,
    }


# ------------------------------------------------ asignación ya validada
#
# La repartición de red y exteriores entre Frank, Rosio, Eric y Toño no es
# un simple prefijo de código: se rebalanceó a mano para que cada quien
# llevara 24 elementos (ver Agosto\generar_presentacion_inicial.py), y por
# eso HC1 termina partido entre Frank y Rosio. Reproducir esa repartición
# por código, en lugar de por prefijo, evita proponer un responsable
# equivocado para los grupos que sí se dividieron.

_ASIGNACION_RED = {
    "Frank": {
        "aereas": ["VH-03", "VH-04", "VH-09", "VH-10"],
        "subterraneas": [f"VC1-{i}" for i in range(1, 10)] + ["HC1-1", "HC1-2", "HC1-3"],
        "exteriores": [f"HC1-{i}" for i in range(1, 9)],
    },
    "Rosio": {
        "aereas": ["VH-01", "VH-07", "VH-08", "VH-11"],
        "subterraneas": ["HC1-4", "HC1-5", "HC1-6", "HC1-7", "VCA-1", "VCA-2", "VCA-3"]
        + [f"HCA-{i}" for i in range(1, 6)],
        "exteriores": [f"HCA-{i}" for i in range(1, 7)] + ["HTC-1", "HTC-2"],
    },
    "Eric": {
        "aereas": ["VH-12", "VH-13", "VH-14", "VH-15"],
        "subterraneas": ["HCA-6"]
        + [f"VC2-{i}" for i in range(1, 6)]
        + ["HC2-1", "HC2-2", "HC2-3", "HC2-5", "HC2-6", "HC2-7"],
        "exteriores": ["HC2-1", "HC2-2", "HC2-3", "HC2-5", "HC2-6", "HC2-7", "HTC-3", "HTC-4"],
    },
    "Toño": {
        "aereas": ["VH-02", "VH-05", "VH-06"],
        "subterraneas": ["VCB-1", "VCB-2"]
        + [f"HCB-{i}" for i in range(1, 9)]
        + ["V- BY PASS 01", "V- BY PASS 02"],  # el RAG 2.8 trae el espacio tras el guion, así, literal
        "exteriores": [f"HCB-{i}" for i in range(1, 9)],
    },
}


def _responsable_por_codigo(grupo: str) -> dict[str, str]:
    tabla: dict[str, str] = {}
    for persona, grupos in _ASIGNACION_RED.items():
        for codigo in grupos[grupo]:
            tabla[codigo] = persona
    return tabla


RESPONSABLE_AEREAS = _responsable_por_codigo("aereas")
RESPONSABLE_SUBTERRANEAS = _responsable_por_codigo("subterraneas")
RESPONSABLE_EXTERIORES = _responsable_por_codigo("exteriores")


# --------------------------------------------------- RAG 2.2 · hidrantes exteriores

FILA_HIDRANTE_EXT = re.compile(r"^(\d+)\s+([A-Z0-9]+-\d+)\s+([PG])\s*$", re.M)


def extraer_hidrantes_exteriores(texto: str, anomalias: Anomalias) -> list[dict]:
    filas = FILA_HIDRANTE_EXT.findall(texto)
    repetidos = Counter(codigo for _, codigo, _ in filas)
    resultado = []
    for orden, (item, codigo, tipo) in enumerate(filas, start=1):
        notas = None
        if repetidos[codigo] > 1:
            notas = f"El código '{codigo}' aparece más de una vez en el RAG 2.2; confirmar en sitio."
            anomalias.registrar("RAG 2.2", f"'{codigo}' repetido (renglón {item})")
        resultado.append(
            elemento(
                codigo,
                "hidrantes_exteriores",
                codigo,
                tipo="Gabinete" if tipo == "G" else "Pie",
                responsable=RESPONSABLE_EXTERIORES.get(codigo),
                item_rag=int(item),
                orden=orden,
                notas=notas,
            )
        )

    numeros_presentes = {int(i) for i, _, _ in filas}
    numeros_esperados = set(range(1, max(numeros_presentes) + 1))
    faltantes = sorted(numeros_esperados - numeros_presentes)
    if faltantes:
        anomalias.registrar(
            "RAG 2.2", f"huecos en la numeración de renglón: {faltantes} (elemento retirado o dado de baja)"
        )

    orden += 1
    resultado.append(
        elemento(
            "HC-PATIO-AUX",
            "hidrantes_exteriores",
            "Hidrante — patio auxiliar de contenedores",
            responsable=RESPONSABLE_EXTERIORES.get("HC-PATIO-AUX", "Toño"),
            orden=orden,
            notas="No tiene nomenclatura oficial ni renglón en el RAG 2.2 vigente; "
            "está pendiente darlo de alta con su clave definitiva (ver flujo de corrección de catálogo).",
        )
    )
    anomalias.registrar("RAG 2.2", "el hidrante del patio auxiliar de contenedores no está en el formato; se agregó con código provisional 'HC-PATIO-AUX'")
    return resultado


# --------------------------------------------------- RAG 2.3 · hidrantes interiores

FILA_HIDRANTE_INT = re.compile(
    r"^(\d+)\s+H\s+(\d+)\s+N\s*([A-Z])\s+(\d+)\s+(\d+)\s*(\(.*\))?\s*$", re.M
)
# Los hidrantes de azotea (H-62 a H-71) no llevan columna de nave/subzona
# numérica: la ubicación viene ya como texto libre ("(PA) pasillo").
FILA_HIDRANTE_INT_TEXTO = re.compile(r"^(\d+)\s+H\s+(\d+)\s+O\s+(.+)$", re.M)


def extraer_hidrantes_interiores(texto: str, anomalias: Anomalias) -> list[dict]:
    filas = []
    for item, numero, nave, sub, pos, extra in FILA_HIDRANTE_INT.findall(texto):
        ubicacion = f"Nave {nave} · {sub}-{pos}"
        if extra:
            ubicacion += f" {extra}"
        filas.append((int(item), numero, ubicacion))
    for item, numero, resto in FILA_HIDRANTE_INT_TEXTO.findall(texto):
        filas.append((int(item), numero, resto.strip()))
    filas.sort(key=lambda f: f[0])

    repetidos = Counter(numero for _, numero, _ in filas)
    resultado = []
    for orden, (item, numero, ubicacion) in enumerate(filas, start=1):
        codigo = f"H-{numero}"
        notas = None
        if repetidos[numero] > 1:
            notas = (
                f"El número 'H-{numero}' aparece más de una vez en el RAG 2.3 "
                "(probable error de captura en el formato de origen); confirmar el número real en sitio."
            )
            anomalias.registrar("RAG 2.3", f"'H-{numero}' repetido (renglón {item})")
        resultado.append(
            elemento(
                f"{codigo}#{item}" if repetidos[numero] > 1 else codigo,
                "hidrantes_interiores",
                codigo,
                ubicacion=ubicacion,
                responsable="Benjamín",
                item_rag=item,
                orden=orden,
                notas=notas,
            )
        )

    numeros = {int(n) for _, n, _ in filas}
    faltantes = sorted(set(range(1, max(numeros) + 1)) - numeros)
    if faltantes:
        anomalias.registrar("RAG 2.3", f"no aparece ningún H-{faltantes} en el formato")
    return resultado


# --------------------------------------------------------- RAG 2.4 · avisadores

FILA_AVISADOR = re.compile(
    r"^ELEM\.\s*(\S+)\s+LOC\.\s*(.+?)\s*(HMS-D)\s*$", re.M
)


def extraer_avisadores(paginas_texto: list[str], anomalias: Anomalias) -> list[dict]:
    """
    La zona de cada avisador no queda separada con claridad en el texto que
    se extrae del PDF (las etiquetas "ZONA n" terminan como pie de página,
    fuera de orden). Lo único verificable con el propio archivo es dónde
    reinicia la numeración: en la página 1 el folio "101" se repite, lo que
    marca el corte real entre zona 1 (26 elementos) y zona 2 (7 elementos);
    la página 2 se trata como un solo bloque. Esta repartición coincide con
    la que ya se presentó y se aceptó en la reunión de arranque de agosto.
    Si el próximo ciclo trae un RAG 2.4 con otro acomodo, este supuesto deja
    de aplicar y hay que revisarlo a mano.
    """
    resultado: list[dict] = []
    orden = 0

    filas_p1 = FILA_AVISADOR.findall(paginas_texto[0])
    corte = None
    vistos = set()
    for i, (num, _, _) in enumerate(filas_p1):
        if num in vistos:
            corte = i
            break
        vistos.add(num)

    # (slug para el código, zona para mostrar, filas). El slug es explícito
    # y no se deriva del texto de la zona: partir "Zona 3-4 · Edificio CC..."
    # por espacios daba un código ilegible ('AV-34-105').
    if corte is None:
        anomalias.registrar(
            "RAG 2.4",
            "no se encontró el punto donde reinicia la numeración en la página 1; "
            "todos los avisadores quedaron sin zona asignada, hay que revisarlos a mano",
        )
        bloques = [("SZ", "Zona sin determinar", filas_p1)]
    else:
        bloques = [
            ("Z1", "Zona 1 · Nave producción", filas_p1[:corte]),
            ("Z2", "Zona 2 · Nave producción y logística", filas_p1[corte:]),
        ]

    if len(paginas_texto) > 1:
        filas_p2 = FILA_AVISADOR.findall(paginas_texto[1])
        bloques.append(("Z3-4", "Zona 3-4 · Edificio CC / Nave 90 / otros", filas_p2))
        anomalias.registrar(
            "RAG 2.4",
            "la página 2 mezcla varias zonas (Edificio CC, Nave 90 y áreas exteriores) "
            "que el texto del PDF no separa con claridad; quedaron agrupadas en un solo bloque",
        )

    repetidos = Counter(num for _, _, filas in bloques for num, _, _ in filas)
    for slug, zona, filas in bloques:
        for num, ubicacion, tipo in filas:
            orden += 1
            codigo = f"AV-{slug}-{num}" if repetidos[num] > 1 else f"AV-{num}"
            notas = None
            if repetidos[num] > 1:
                notas = f"El folio '{num}' se repite en más de una zona del RAG 2.4; son avisadores distintos con el mismo número (ver docs/decisiones.md D-03)."
            resultado.append(
                elemento(
                    codigo,
                    "botones_avisadores",
                    f"ELEM. {num}",
                    zona=zona,
                    ubicacion=ubicacion.strip(),
                    tipo=tipo,
                    responsable="Benjamín",
                    orden=orden,
                    notas=notas,
                )
            )
    return resultado


# ----------------------------------------------------------- RAG 2.7 · aéreas

FILA_VALVULA_AEREA = re.compile(r"^(VH-\d+)\s+([A-Z])\s+(\d+)\s+(\d+)\s*$", re.M)


def extraer_valvulas_aereas(texto: str, anomalias: Anomalias) -> list[dict]:
    filas = FILA_VALVULA_AEREA.findall(texto)
    resultado = []
    for orden, (codigo, nave, sub, pos) in enumerate(filas, start=1):
        resultado.append(
            elemento(
                codigo,
                "valvulas_aereas",
                codigo,
                ubicacion=f"Nave {nave} · {sub}-{pos}",
                responsable=RESPONSABLE_AEREAS.get(codigo),
                orden=orden,
            )
        )
    return resultado


# ------------------------------------------------------ RAG 2.8 · subterráneas

FILA_VALVULA_SUB = re.compile(r"^(\d+)\s+([A-Z0-9\- ]+?)\s+(MARIPOSA|VASTAGO)\s*$", re.M)

_GRUPO_SUBTERRANEA = [
    # (prefijo, zona, tipo de válvula)
    ("V- BY PASS", "Bombas contra incendio", "Mariposa"),
    ("VC1", "Calle 1 · Seccionamiento", "Mariposa"),
    ("VCA", "Calle A · Seccionamiento", "Mariposa"),
    ("VC2", "Calle 2 · Seccionamiento", "Mariposa"),
    ("VCB", "Calle B · Seccionamiento", "Mariposa"),
    ("HC1", "Calle 1 · Cierre de hidrante", "Vástago"),
    ("HCB", "Calle B · Cierre de hidrante", "Vástago"),
    ("HC2", "Calle 2 · Cierre de hidrante", "Vástago"),
    ("HCA", "Calle A · Cierre de hidrante", "Vástago"),
]


def _grupo_de(codigo: str) -> tuple[str, str] | tuple[None, None]:
    for prefijo, zona, tipo in _GRUPO_SUBTERRANEA:
        if codigo.startswith(prefijo):
            return zona, tipo
    return None, None


def extraer_valvulas_subterraneas(paginas_texto: list[str], anomalias: Anomalias) -> list[dict]:
    filas = []
    for texto in paginas_texto:
        filas += FILA_VALVULA_SUB.findall(texto)

    repetidos = Counter(codigo.strip() for _, codigo, _ in filas)
    resultado = []
    for orden, (item, codigo_crudo, _tipo_pdf) in enumerate(filas, start=1):
        codigo = re.sub(r"\s+", " ", codigo_crudo.strip())
        zona, tipo = _grupo_de(codigo)
        if zona is None:
            anomalias.registrar("RAG 2.8", f"'{codigo}' no coincide con ningún grupo conocido; revisar a mano")
        notas = None
        if repetidos[codigo_crudo.strip()] > 1:
            notas = f"El código '{codigo}' aparece más de una vez en el RAG 2.8; confirmar en sitio (probable error de captura)."
            anomalias.registrar("RAG 2.8", f"'{codigo}' repetido (renglón {item})")
        resultado.append(
            elemento(
                f"{codigo}#{item}" if repetidos[codigo_crudo.strip()] > 1 else codigo,
                "valvulas_subterraneas",
                codigo,
                zona=zona,
                tipo=tipo,
                responsable=RESPONSABLE_SUBTERRANEAS.get(codigo),
                item_rag=int(item),
                orden=orden,
                notas=notas,
            )
        )
    return resultado


# ---------------------------------------------------------------- plantillas

SI_NO = "si_no"
TEXTO = "texto"

PLANTILLAS = {
    "botones_avisadores": {
        "fotos": [
            {"id": "antes", "etiqueta": "Antes", "requerido": True, "min": 1},
            {"id": "despues", "etiqueta": "Después", "requerido": True, "min": 1},
        ],
        "puntos": [
            {"id": "buen_estado", "etiqueta": "Buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "observaciones", "etiqueta": "Observaciones", "tipo": TEXTO, "requerido": False},
        ],
        "texto_libre": ["como_se_encontro", "que_se_realizo", "pendientes"],
    },
    "hidrantes_interiores": {
        "fotos": [
            {"id": "antes", "etiqueta": "Antes", "requerido": True, "min": 1},
            {"id": "despues", "etiqueta": "Después", "requerido": True, "min": 1},
        ],
        "puntos": [
            {"id": "valvula_aerea_abierta", "etiqueta": "Válvula aérea abierta", "tipo": SI_NO, "requerido": True},
            {"id": "gabinete_buen_estado", "etiqueta": "Gabinete en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "manguera_piton", "etiqueta": "Manguera y pitón en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "pintura", "etiqueta": "Pintura", "tipo": SI_NO, "requerido": True},
            {"id": "observaciones", "etiqueta": "Observaciones", "tipo": TEXTO, "requerido": False},
        ],
        "texto_libre": ["como_se_encontro", "que_se_realizo", "pendientes"],
    },
    "hidrantes_exteriores": {
        "fotos": [
            {"id": "antes", "etiqueta": "Antes", "requerido": True, "min": 1},
            {"id": "despues", "etiqueta": "Después", "requerido": True, "min": 1},
        ],
        "puntos": [
            {"id": "valvula_abierta", "etiqueta": "Válvula abierta", "tipo": SI_NO, "requerido": True},
            {"id": "caseta_buen_estado", "etiqueta": "Caseta en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "pintura_buen_estado", "etiqueta": "Pintura en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "mangueras_buen_estado", "etiqueta": "Mangueras en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "piton_buen_estado", "etiqueta": "Pitón en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "observaciones", "etiqueta": "Observaciones", "tipo": TEXTO, "requerido": False},
        ],
        "texto_libre": ["como_se_encontro", "que_se_realizo", "pendientes"],
    },
    "valvulas_aereas": {
        # Sólo inspección visual (ver docs/flujos-de-usuario.md): un único
        # bloque fotográfico y sin "qué se le realizó", porque no hay
        # intervención.
        "fotos": [
            {"id": "estado", "etiqueta": "Estado actual", "requerido": True, "min": 1},
        ],
        "puntos": [
            {"id": "valvula_abierta", "etiqueta": "Válvula abierta", "tipo": SI_NO, "requerido": True},
            {"id": "candado_cadena", "etiqueta": "Candado y cadena", "tipo": SI_NO, "requerido": True},
            {"id": "buen_estado", "etiqueta": "En buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "observaciones", "etiqueta": "Observaciones", "tipo": TEXTO, "requerido": False},
        ],
        "texto_libre": ["como_se_encontro", "pendientes"],
    },
    "valvulas_subterraneas": {
        "fotos": [
            {"id": "antes", "etiqueta": "Antes", "requerido": True, "min": 1},
            {"id": "despues", "etiqueta": "Después", "requerido": True, "min": 1},
        ],
        "puntos": [
            {"id": "valvula_abierta", "etiqueta": "Válvula abierta", "tipo": SI_NO, "requerido": True},
            {"id": "valvula_buen_estado", "etiqueta": "Válvula en buen estado", "tipo": SI_NO, "requerido": True},
            {"id": "observaciones", "etiqueta": "Observaciones", "tipo": TEXTO, "requerido": False},
        ],
        "texto_libre": ["como_se_encontro", "que_se_realizo", "pendientes"],
    },
}


# --------------------------------------------------------------------- main

ARCHIVOS = {
    "hidrantes_exteriores": "RAG 2.2 Hidrantes exteriores.pdf",
    "hidrantes_interiores": "RAG 2.3 Hidrantes interiores.pdf",
    "botones_avisadores": "RAG 2.4 Botones avisadores.pdf",
    "valvulas_aereas": "RAG 2.7 Red de agua contra incendio aerea.pdf",
    "valvulas_subterraneas": "RAG 2.8 Red de agua contra incendio subterranea.pdf",
}

TOTAL_ESPERADO = {
    "botones_avisadores": 54,
    "hidrantes_interiores": 71,
    "hidrantes_exteriores": 33,
    "valvulas_aereas": 15,
    "valvulas_subterraneas": 48,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--formatos", required=True, help="Carpeta con los PDF de los RAG (p. ej. 'Agosto\\Formatos de soporte')")
    ap.add_argument("--ciclo", required=True, help="Clave del ciclo, formato AAAA-MM")
    ap.add_argument("--salida-catalogo", default=None)
    ap.add_argument("--salida-plantillas", default=None)
    args = ap.parse_args()

    formatos = Path(args.formatos)
    if not formatos.is_dir():
        print(f"No existe la carpeta: {formatos}", file=sys.stderr)
        return 1

    anomalias = Anomalias()
    elementos: list[dict] = []

    faltantes = [n for n in ARCHIVOS.values() if not (formatos / n).exists()]
    if faltantes:
        print("Faltan estos formatos en la carpeta indicada:", file=sys.stderr)
        for f in faltantes:
            print("  -", f, file=sys.stderr)
        return 1

    p_ext = paginas(formatos / ARCHIVOS["hidrantes_exteriores"])
    elementos += extraer_hidrantes_exteriores(p_ext[0], anomalias)

    p_int = paginas(formatos / ARCHIVOS["hidrantes_interiores"])
    elementos += extraer_hidrantes_interiores("\n".join(p_int), anomalias)

    p_avi = paginas(formatos / ARCHIVOS["botones_avisadores"])
    elementos += extraer_avisadores(p_avi, anomalias)

    p_aer = paginas(formatos / ARCHIVOS["valvulas_aereas"])
    elementos += extraer_valvulas_aereas(p_aer[0], anomalias)

    p_sub = paginas(formatos / ARCHIVOS["valvulas_subterraneas"])
    elementos += extraer_valvulas_subterraneas(p_sub, anomalias)

    print(f"Extracción del ciclo {args.ciclo}\n")
    conteo = Counter(e["sistema"] for e in elementos)
    for sistema, esperado in TOTAL_ESPERADO.items():
        obtenido = conteo.get(sistema, 0)
        marca = "OK" if obtenido == esperado else "!!"
        print(f"  [{marca}] {sistema:<24} {obtenido:>3} (esperado {esperado})")
    print(f"\n  Total: {len(elementos)} (esperado {sum(TOTAL_ESPERADO.values())})")

    sin_responsable = [e["codigo"] for e in elementos if not e["responsable"]]
    if sin_responsable:
        anomalias.registrar(
            "general", f"{len(sin_responsable)} elemento(s) sin responsable propuesto: {sin_responsable}"
        )

    anomalias.imprimir()

    salida_catalogo = Path(args.salida_catalogo or f"catalogo_{args.ciclo}.json")
    salida_plantillas = Path(args.salida_plantillas or f"plantillas_{args.ciclo}.json")

    salida_catalogo.write_text(
        json.dumps({"ciclo": args.ciclo, "elementos": elementos}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    salida_plantillas.write_text(
        json.dumps({"ciclo": args.ciclo, "plantillas": PLANTILLAS}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nEscrito: {salida_catalogo}")
    print(f"Escrito: {salida_plantillas}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
