#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Carga a Supabase el catálogo y las plantillas que produjo
scripts/extraer_rags.py: abre (o reutiliza) el ciclo, escribe las
plantillas de cada sistema y da de alta o actualiza los elementos.

Usa la llave de servicio (SUPABASE_SERVICE_ROLE_KEY), así que se ejecuta
sólo desde el equipo local, nunca dentro de la aplicación desplegada.

Sin --confirmar sólo valida los archivos y muestra un resumen; no se
conecta a Supabase. Con --confirmar sí escribe. La conciliación de
elementos es por (sistema, código): lo que ya existe se actualiza, lo
nuevo se da de alta, y lo que existía para ese ciclo y sistema pero ya no
aparece en el archivo se marca activo = false (ver docs/flujos-de-usuario.md
Flujo 5). Ningún caso borra evidencia ya capturada.

ADVERTENCIA — el upsert de elementos sobrescribe TODOS sus campos con lo
que diga este archivo, sin distinguir qué cambió: si alguien corrigió
'zona'/'seccion'/'ubicacion'/etc. directamente en /catalogo o por SQL
después de la última vez que se generó este JSON, --confirmar revierte
esa corrección sin avisar (ya pasó una vez: ver docs/decisiones.md D-18).
Antes de correr --confirmar sobre un ciclo que ya se capturó, confirmar
que este archivo es más nuevo que cualquier edición hecha en la
aplicación, o volver a exportar el catálogo desde /configuracion primero.

Uso:
    python scripts/cargar_catalogo.py --ciclo 2026-08                    # valida y resume, no escribe
    python scripts/cargar_catalogo.py --ciclo 2026-08 --confirmar        # escribe de verdad
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = Path(__file__).resolve().parent.parent

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}

CONFIG_POR_DEFECTO = {
    # Los dos sistemas internos se capturan directo en la app; los otros
    # tres llegan por recepción mientras no se dé de alta a los demás
    # especialistas (ver docs/decisiones.md D-09).
    "sistemas_activos": [
        "botones_avisadores", "hidrantes_interiores", "hidrantes_exteriores",
        "valvulas_aereas", "valvulas_subterraneas",
    ],
    "captura_directa": ["botones_avisadores", "hidrantes_interiores"],
    "imagen": {"lado_max": 2560, "calidad": 88, "formato": "jpeg"},
    # Calendario del ciclo piloto (docs/requerimientos.md §3). El tablero
    # de la fase 4 usa ejecucion_fin para calcular el ritmo necesario.
    "fechas": {
        "ejecucion_inicio": "2026-08-01",
        "ejecucion_fin": "2026-08-19",
        "entrega": "2026-08-20",
        "supervision_fin": "2026-08-30",
    },
}


def cargar_env(ruta_env: Path) -> tuple[str, str]:
    if ruta_env.exists():
        load_dotenv(ruta_env)
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    llave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    faltan = [n for n, v in (("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL", url),
                             ("SUPABASE_SERVICE_ROLE_KEY", llave)) if not v]
    if faltan:
        print(f"Faltan variables de entorno ({', '.join(faltan)}).", file=sys.stderr)
        print(f"Se buscaron en: {ruta_env}", file=sys.stderr)
        print("Copiar web/.env.example a web/.env.local y llenarlo con los valores del proyecto.", file=sys.stderr)
        raise SystemExit(1)
    return url, llave


def parsear_ciclo(clave: str, nombre: str | None) -> dict:
    anio_s, mes_s = clave.split("-")
    anio, mes = int(anio_s), int(mes_s)
    if not (1 <= mes <= 12):
        raise SystemExit(f"Mes inválido en '{clave}': {mes}")
    return {
        "clave": clave,
        "nombre": nombre or f"{MESES_ES[mes]} {anio}",
        "mes": mes,
        "anio": anio,
        "config": CONFIG_POR_DEFECTO,
    }


def resumen_local(catalogo: dict, plantillas: dict) -> None:
    from collections import Counter

    els = catalogo["elementos"]
    print(f"Ciclo: {catalogo['ciclo']}")
    print(f"Elementos en el archivo: {len(els)}")
    for sistema, n in Counter(e["sistema"] for e in els).items():
        print(f"  {sistema:<24} {n}")

    con_notas = [e for e in els if e.get("notas")]
    if con_notas:
        print(f"\n{len(con_notas)} elemento(s) con nota (anomalía detectada en la extracción):")
        for e in con_notas:
            print(f"  - [{e['sistema']}] {e['codigo']}: {e['notas']}")

    print(f"\nPlantillas en el archivo: {list(plantillas['plantillas'].keys())}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ciclo", required=True, help="Clave del ciclo, formato AAAA-MM")
    ap.add_argument("--nombre", default=None, help="Nombre de presentación del ciclo. Por defecto 'Agosto 2026'")
    ap.add_argument("--catalogo", default=None, help="Ruta al catalogo_<ciclo>.json")
    ap.add_argument("--plantillas", default=None, help="Ruta al plantillas_<ciclo>.json")
    ap.add_argument("--env", default=None, help="Ruta al archivo .env con las credenciales de Supabase")
    ap.add_argument("--confirmar", action="store_true", help="Escribir de verdad. Sin esto sólo valida y resume.")
    args = ap.parse_args()

    ruta_catalogo = Path(args.catalogo or RAIZ / "supabase" / "seed" / f"catalogo_{args.ciclo}.json")
    ruta_plantillas = Path(args.plantillas or RAIZ / "supabase" / "seed" / f"plantillas_{args.ciclo}.json")
    ruta_env = Path(args.env or RAIZ / "web" / ".env.local")

    if not ruta_catalogo.exists():
        print(f"No existe: {ruta_catalogo}\nCorrer primero scripts/extraer_rags.py.", file=sys.stderr)
        return 1
    if not ruta_plantillas.exists():
        print(f"No existe: {ruta_plantillas}\nCorrer primero scripts/extraer_rags.py.", file=sys.stderr)
        return 1

    catalogo = json.loads(ruta_catalogo.read_text(encoding="utf-8"))
    plantillas = json.loads(ruta_plantillas.read_text(encoding="utf-8"))

    if catalogo["ciclo"] != args.ciclo or plantillas["ciclo"] != args.ciclo:
        print(
            f"El ciclo dentro de los archivos ({catalogo['ciclo']!r} / {plantillas['ciclo']!r}) "
            f"no coincide con --ciclo {args.ciclo!r}.",
            file=sys.stderr,
        )
        return 1

    resumen_local(catalogo, plantillas)

    if not args.confirmar:
        print("\nModo de validación: no se escribió nada. Agregar --confirmar para cargar a Supabase.")
        return 0

    url, llave = cargar_env(ruta_env)
    from supabase import create_client

    cliente = create_client(url, llave)

    print(f"\nConectado. Cargando ciclo {args.ciclo}...")

    datos_ciclo = parsear_ciclo(args.ciclo, args.nombre)
    existente = cliente.table("ciclos").select("id").eq("clave", args.ciclo).execute()
    if existente.data:
        ciclo_id = existente.data[0]["id"]
        print(f"  Ciclo ya existía (id={ciclo_id}); se conserva su config actual.")
    else:
        creado = cliente.table("ciclos").insert(datos_ciclo).execute()
        ciclo_id = creado.data[0]["id"]
        print(f"  Ciclo creado (id={ciclo_id}).")

    sistemas = cliente.table("sistemas").select("id, clave, tipos").execute().data
    sistema_id_por_clave = {s["clave"]: s["id"] for s in sistemas}
    faltan_sistemas = set(plantillas["plantillas"]) | {e["sistema"] for e in catalogo["elementos"]}
    faltan_sistemas -= set(sistema_id_por_clave)
    if faltan_sistemas:
        print(f"Estos sistemas no existen en la tabla 'sistemas' (¿faltó aplicar 0002_sistemas_seed.sql?): {faltan_sistemas}", file=sys.stderr)
        return 1

    # Diccionario de tipos por sistema (docs/decisiones.md D-18):
    # elementos.tipo guarda la CLAVE ("G"), no el nombre completo
    # ("Gabinete") — el extractor todavía no lo sabe y sigue escribiendo
    # el nombre completo, así que se traduce aquí antes de escribir.
    clave_tipo_por_sistema_y_nombre = {
        s["clave"]: {t["nombre"]: t["clave"] for t in (s.get("tipos") or [])} for s in sistemas
    }

    # Catálogo de zonas (docs/decisiones.md D-18): se resuelve por texto,
    # con la misma forma corta que sembró la migración 0007 (seccion si
    # está capturada, si no zona) — nunca se crea una zona nueva desde
    # aquí, es un catálogo que administra el área desde /configuracion.
    zona_id_por_nombre = {z["nombre"]: z["id"] for z in cliente.table("zonas").select("id, nombre").execute().data}

    filas_plantillas = [
        {
            "ciclo_id": ciclo_id,
            "sistema_id": sistema_id_por_clave[sistema],
            "fotos": datos["fotos"],
            "puntos": datos["puntos"],
            "texto_libre": datos["texto_libre"],
        }
        for sistema, datos in plantillas["plantillas"].items()
    ]
    cliente.table("plantillas").upsert(filas_plantillas, on_conflict="ciclo_id,sistema_id").execute()
    print(f"  Plantillas escritas: {len(filas_plantillas)}")

    zonas_desconocidas: set[str] = set()
    tipos_sin_mapear: set[tuple[str, str]] = set()

    def zona_id_de(e: dict) -> str | None:
        forma_corta = (e.get("seccion") or "").strip() or (e.get("zona") or "").strip() or None
        if not forma_corta:
            return None
        zona_id = zona_id_por_nombre.get(forma_corta)
        if zona_id is None:
            zonas_desconocidas.add(forma_corta)
        return zona_id

    def tipo_de(e: dict) -> str | None:
        tipo = e.get("tipo")
        if not tipo:
            return tipo
        diccionario = clave_tipo_por_sistema_y_nombre.get(e["sistema"], {})
        if tipo in diccionario:
            return diccionario[tipo]
        if tipo in diccionario.values():
            return tipo  # ya viene como clave (recarga después de la migración 0007)
        if diccionario:
            tipos_sin_mapear.add((e["sistema"], tipo))
        return tipo

    filas_elementos = [
        {
            "ciclo_id": ciclo_id,
            "sistema_id": sistema_id_por_clave[e["sistema"]],
            "codigo": e["codigo"],
            "nombre": e["nombre"],
            "zona": e.get("zona"),
            "ubicacion": e.get("ubicacion"),
            "referencia": e.get("referencia"),
            "seccion": e.get("seccion"),
            "orden_seccion": e.get("orden_seccion"),
            "zona_id": zona_id_de(e),
            "tipo": tipo_de(e),
            "responsable": e.get("responsable"),
            "item_rag": e.get("item_rag"),
            "orden": e.get("orden", 0),
            # 'orden_anclado' no se toca: es una fijación manual hecha
            # desde la aplicación (ver web/lib/orden.ts) y una recarga del
            # catálogo no debe perderla.
            "activo": e.get("activo", True),
            "notas": e.get("notas"),
        }
        for e in catalogo["elementos"]
    ]
    cliente.table("elementos").upsert(filas_elementos, on_conflict="ciclo_id,sistema_id,codigo").execute()
    print(f"  Elementos escritos: {len(filas_elementos)}")
    if zonas_desconocidas:
        print(f"  Zonas sin catálogo, quedaron sin zona_id (avisar al área): {sorted(zonas_desconocidas)}")
    if tipos_sin_mapear:
        print(f"  Tipos sin diccionario en su sistema, se guardaron tal cual: {sorted(tipos_sin_mapear)}")

    en_archivo = {(e["sistema"], e["codigo"]) for e in catalogo["elementos"]}
    en_bd = cliente.table("elementos").select("id, codigo, activo, sistema_id").eq("ciclo_id", ciclo_id).execute().data
    clave_por_id = {v: k for k, v in sistema_id_por_clave.items()}
    a_desactivar = [
        fila["id"]
        for fila in en_bd
        if fila["activo"] and (clave_por_id[fila["sistema_id"]], fila["codigo"]) not in en_archivo
    ]
    if a_desactivar:
        cliente.table("elementos").update({"activo": False}).in_("id", a_desactivar).execute()
        print(f"  Elementos desactivados (ya no están en el archivo): {len(a_desactivar)}")

    print("\nListo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
