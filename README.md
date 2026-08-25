# Captura SCI

Sistema de captura de evidencias para la revisión periódica mensual de sistemas contra incendio.

Área de Protección Contra Incendios · Volkswagen de México, Planta Guanajuato
Documento de referencia: **I1.15M2_4037-002 Rev. 5** — *Inspección, pruebas y mantenimiento de los
sistemas contra incendio*.

---

## Qué resuelve

La revisión mensual cubre 221 elementos repartidos en cinco sistemas. Hasta ahora, la evidencia de
campo llegaba por WhatsApp y alguien la clasificaba a mano, creando una carpeta por elemento y
arrastrando archivos con nombres como `WhatsApp Image 2026-03-21 at 19.46.14.jpeg`. Las descripciones
se capturaban aparte en un libro de Excel y los formatos RAG se llenaban en papel al cierre. Conocer
el avance exigía abrir las carpetas una por una.

Este sistema hace que la fotografía y la descripción entren **ya asociadas al elemento que se está
revisando**, que el avance sea consultable en cualquier momento, y que tanto el catálogo de elementos
como los puntos a supervisar se puedan modificar durante la ejecución sin intervención técnica.

## Qué hace

- **Captura en campo** desde teléfono: se elige el elemento, se toman las fotografías y se contestan
  los puntos de revisión. La clasificación es automática porque el elemento ya está seleccionado.
- **Recepción** de conjuntos de fotografías sin clasificar para asignarlas a su elemento, mientras la
  evidencia de los otros sistemas siga llegando por WhatsApp.
- **Seguimiento** del avance separado en los dos procesos que corren en paralelo: la captura propia y
  lo que se recibe de terceros.
- **Catálogo configurable**: los elementos y los puntos a supervisar se editan durante la ejecución
  y se importan y exportan en JSON.
- **Generación del informe** fotográfico mensual en PowerPoint, con un botón desde la propia
  aplicación, a partir de lo capturado.

## Cómo está armado

```mermaid
flowchart TD
    U["Teléfono / PC"]
    N["Next.js en Vercel<br/>páginas y acciones de servidor"]
    subgraph S["Supabase"]
        DB[("PostgreSQL<br/>configuración, catálogo, resultados")]
        ST[("Storage<br/>fotografías y plantilla, depósito privado")]
        AU["Auth · sesión"]
    end

    U -- páginas, formularios --> N
    N -- lee y escribe --> DB
    N -- valida sesión --> AU
    U -- "fotografías, subida directa (D-06)" --> ST
    N -.->|"URL firmada para mostrarlas"| ST
    N -- "informe: arma el .pptx en el servidor (D-17)" --> ST
```

La captura, el seguimiento y la generación del informe viven todos en la nube, para poder usarse
desde teléfono personal dentro de la planta sin depender de la red corporativa. Las fotografías van
del navegador directo a Storage — Next.js nunca las recibe, sólo registra la ruta resultante y firma
URL de lectura corta para mostrarlas (D-06). El informe se arma también en el servidor: descarga la
plantilla corporativa y las fotografías necesarias desde Storage, arma el `.pptx` con `pptx-automizer`
y `sharp`, lo deja guardado en el depósito y ofrece una URL firmada para bajarlo — la revisión final
sigue siendo abrirlo en PowerPoint, sólo que ya no hace falta estar frente al equipo que lo generó
(D-04, revisada en D-17). El porqué de cada pieza está en [`docs/decisiones.md`](docs/decisiones.md).

## Estructura del repositorio

```
captura-sci/
├── README.md
├── docs/                             documentación del proyecto
│   ├── requerimientos.md
│   ├── modelo-de-datos.md
│   ├── flujos-de-usuario.md
│   └── decisiones.md
├── web/                              aplicación Next.js
│   ├── app/
│   │   ├── login/                    fuera del grupo (app): sin sesión no se llega aquí
│   │   └── (app)/                    layout.tsx exige sesión; encabezado y cerrar sesión
│   │       ├── page.tsx              inicio: enlaces a Capturar y Recepción
│   │       ├── capturar/             Fase 2 — sistemas, lista por sistema, formulario
│   │       │   └── [sistema]/[id]/   Formulario.tsx (cliente) + actions.ts (servidor)
│   │       ├── recepcion/            Fase 3 — Recepcion.tsx (cliente) + actions.ts (servidor)
│   │       ├── tablero/              Fase 4 — Tablero.tsx: avance, ritmo, tabla y exportación
│   │       ├── catalogo/             Fase 5 — sistemas, importar/exportar catálogo
│   │       │   └── [sistema]/        PlantillaEditor.tsx + ElementosCatalogo.tsx (cliente)
│   │       ├── rag/                  Formatos RAG estandarizados (D-15/D-16) — lista y visor
│   │       │   └── [formato]/        VisorRAG.tsx: ver, alternar vacío/lleno, imprimir · FormatoEditor.tsx
│   │       └── informe/              Fase 6 (D-17) — botón, genera el .pptx en el servidor
│   ├── components/EstadoBadge.tsx
│   └── lib/
│       ├── supabase/                 clientes de navegador, servidor y proxy
│       ├── tipos.ts                  formas compartidas, reflejan el diccionario de datos
│       ├── estado.ts                 calcularEstado() — única fuente de verdad, ver §4
│       ├── datos.ts                  consultas de servidor ("server-only")
│       ├── registros.ts              aseguraRegistro/recalcularYGuardarEstado, compartido
│       ├── imagen.ts                 reducción a 2560px/calidad 88 con orientación EXIF
│       ├── descargas.ts              descargar() — genera y dispara un archivo en el navegador
│       ├── rutas.ts, texto.ts        rutas de Storage; búsqueda sin acentos
│       ├── rag/                      documento.ts + render.ts + estilos.ts — puros, sin Next/Supabase/React
│       │                             (ver docs/decisiones.md D-16: pensados para una segunda entrada local)
│       └── informe/                  collage.ts (sharp) + geometria.ts + generador.ts (pptx-automizer)
├── supabase/
│   ├── migrations/                   0001 esquema · 0002 sistemas fijos · 0003 RLS · 0004 Storage · 0005 formatos RAG
│   └── seed/                         catálogo, plantillas y formatos ya extraídos, por ciclo
└── scripts/                          utilerías en Python (requirements.txt)
    ├── extraer_rags.py               RAG en PDF → supabase/seed/{catalogo,plantillas}_<ciclo>.json
    └── cargar_catalogo.py            ese JSON → Supabase (valida en seco sin --confirmar)
```

El repositorio vive **fuera** de la carpeta sincronizada de Google Drive. En la carpeta de trabajo se
depositan sólo los productos operativos: catálogo exportado, resultados exportados e informe
generado.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/requerimientos.md`](docs/requerimientos.md) | Situación actual, alcance del piloto, requerimientos numerados y lo que queda fuera |
| [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md) | Diccionario de datos, estructuras JSON, derivación del estado, almacenamiento y control de acceso |
| [`docs/flujos-de-usuario.md`](docs/flujos-de-usuario.md) | Recorridos completos: apertura de ciclo, captura, recepción, seguimiento, cambios de catálogo y cierre |
| [`docs/decisiones.md`](docs/decisiones.md) | Decisiones de negocio y técnicas con su contexto y sus consecuencias |

Quien se incorpore al proyecto debería leer, en orden: requerimientos, flujos y modelo de datos.

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20 o superior |
| Python | 3.11 o superior |
| Cuenta de Supabase | Plan gratuito |
| Cuenta de Vercel | Plan gratuito |

Dependencias de Python para las utilerías, fijadas en [`scripts/requirements.txt`](scripts/requirements.txt):
`pypdf`, `supabase`, `python-dotenv`. El informe fotográfico ya no es una utilería de Python — se
genera en el servidor (ver D-17); sus dependencias (`pptx-automizer`, `sharp`) están en
`web/package.json`, como el resto de la aplicación.

## Arranque local

```bash
# 1. Dependencias de la aplicación
cd web
npm install

# 2. Variables de entorno (las usan tanto la app como las utilerías de Python)
cp .env.example .env.local
#    y capturar los valores del proyecto de Supabase: URL, llave pública
#    y llave de servicio (Project Settings → API)
cd ..

# 3. Dependencias de Python
python -m pip install -r scripts/requirements.txt

# 4. Base de datos: aplicar el esquema
npx --prefix web supabase link --project-ref <referencia-del-proyecto>
npx --prefix web supabase db push

# 5. Formatos RAG: una sola vez, no depende de ningún ciclo (ver D-15)
cd web && npx tsx scripts/cargar-formatos.ts                 # valida y resume; nada se escribe todavía
npx tsx scripts/cargar-formatos.ts --confirmar

# 6. Plantilla del informe: una sola vez, no depende de ningún ciclo (ver D-17)
npx tsx scripts/subir-plantilla-informe.ts --archivo "<ruta a Reporte sistemas - MASTER.pptx>"
npx tsx scripts/subir-plantilla-informe.ts --archivo "<ruta al .pptx>" --confirmar
cd ..

# 7. Catálogo del ciclo: extraer de los RAG y cargar a Supabase
python scripts/extraer_rags.py --formatos "<ruta a Formatos de soporte>" --ciclo 2026-08
python scripts/cargar_catalogo.py --ciclo 2026-08        # valida y resume; nada se escribe todavía
python scripts/cargar_catalogo.py --ciclo 2026-08 --confirmar

# 8. Servidor de desarrollo
cd web && npm run dev
```

La aplicación queda en `http://localhost:3000`. La extracción es una propuesta, no la versión
final —el script señala en pantalla y en el campo `notas` de cada elemento los renglones ambiguos
de los RAG de origen (duplicados, huecos en la numeración)— así que conviene revisar su salida
antes de correr `cargar_catalogo.py --confirmar`.

## Variables de entorno

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | Dirección del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador y servidor | Llave pública; opera bajo las políticas de seguridad por renglón |
| `SUPABASE_SERVICE_ROLE_KEY` | Sólo utilerías locales | Llave privilegiada para la carga inicial del catálogo y de la plantilla del informe. **No se publica ni se incluye en la aplicación** — el informe en sí corre con la sesión normal del usuario, ver D-17 |

Las dos primeras se configuran también en Vercel. La tercera se queda en el equipo local, en un
archivo `.env` que no se versiona.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (dentro de `web/`) |
| `npm run build` | Compilación de producción |
| `npm run lint` | Revisión de estilo (`eslint .`; `next lint` ya no existe desde Next 16) |
| `npx supabase db push` | Aplica las migraciones pendientes (dentro de `web/`, con el proyecto enlazado) |
| `npx tsx scripts/cargar-formatos.ts [--confirmar]` | (dentro de `web/`) `formatos_mensuales.json` → Supabase. Una sola vez, no por ciclo. Sin `--confirmar` sólo valida |
| `npx tsx scripts/subir-plantilla-informe.ts --archivo <ruta> [--confirmar]` | (dentro de `web/`) Sube la plantilla corporativa al depósito. Una sola vez, o cuando cambie el archivo. Sin `--confirmar` sólo valida |
| `python scripts/extraer_rags.py --formatos <carpeta> --ciclo <AAAA-MM>` | RAG en PDF → catálogo y plantillas en JSON |
| `python scripts/cargar_catalogo.py --ciclo <AAAA-MM> [--confirmar]` | Ese JSON → Supabase. Sin `--confirmar` sólo valida |

## Despliegue

El despliegue es automático: cada envío a la rama principal publica en Vercel. Las migraciones de
base de datos se aplican por separado con `npx supabase db push` antes de publicar cambios que
dependan de ellas.

## Estado del proyecto

| Fase | Entregable | Estado |
|---|---|---|
| 0 | Documentación y estructura del repositorio | Terminada |
| 1 | Base de datos, seguridad, sesión y carga inicial del catálogo | Proyecto enlazado y credenciales en `web/.env.local`; falta aplicar el esquema |
| 2 | Captura desde teléfono con formulario configurable | Código listo; falta probarlo en un teléfono real |
| 3 | Recepción y clasificación de evidencia externa | Código listo; falta probarlo con fotos reales |
| 4 | Tablero de seguimiento | Código listo; falta probarlo con datos reales |
| 5 | Editor de catálogo y de plantillas | Código listo; falta probarlo con datos reales |
| 6 | Generador del informe mensual | Código listo; falta medir el ciclo completo y probar la plantilla `MASTER` en PowerPoint |
| 7 | Archivado del ciclo y liberación del depósito | Pendiente |

Dentro de la fase 1: las migraciones, la aplicación Next.js con inicio/cierre de sesión, y los dos
scripts de catálogo están escritos y probados por separado —`npm run build`, `eslint .` y el
extractor corrieron limpio contra los PDF reales de agosto (221 elementos, cero duplicados)—. El
proyecto de Supabase (`captura-revision-periodica-sci`) ya está enlazado y `web/.env.local` tiene sus
tres credenciales; una verificación de sólo lectura contra la API confirmó que **el esquema todavía
no se aplicó** (ninguna de las siete tablas existe todavía). Faltan `npx supabase db push` y
`cargar_catalogo.py --confirmar` para terminar la fase.

Dentro de la fase 2: `/capturar` (sistemas), `/capturar/[sistema]` (lista con búsqueda y estado) y
`/capturar/[sistema]/[id]` (formulario generado desde la plantilla, con fotografías, borrador local
y "guardar y siguiente") compilan y pasan `tsc`/`eslint` limpio — cubre RF-01 a RF-09. Lo que el
build no puede probar por sí solo: que la subida directa a Storage y la sesión funcionen de verdad
desde un teléfono, en la red de la planta, con la señal intermitente que describe RNF-03. Eso exige
la fase 1 completa (proyecto real) más una prueba de campo.

Dentro de la fase 3: `/recepcion` cubre RF-10 a RF-15 — arrastrar o elegir un lote de fotografías,
reducirlas igual que en captura directa, la rejilla de pendientes con selección múltiple, asignar a
sistema, elemento y momento (mueve el objeto en Storage con la operación nativa, no descarga y
vuelve a subir), descartar sin borrar el objeto, y abrir el formulario del elemento para el texto
que acompaña. El formulario de `/capturar/[sistema]/[id]` ahora se abre desde los dos caminos: su
guarda pasó de exigir que el sistema esté en `captura_directa` a exigir sólo que esté en
`sistemas_activos`, y "guardar y siguiente" distingue el origen para no ofrecer un recorrido
ordenado que sólo tiene sentido en captura directa. La lógica de asegurar el registro y recalcular
su estado, antes duplicada, quedó en `lib/registros.ts` porque ambas fases la necesitaban idéntica.

Dentro de la fase 4: `/tablero` cubre RF-16 a RF-20 con los datos ya cargados en Supabase, sin
tocar ninguna tabla nueva. "Mi captura" muestra total, completados, pendientes y porcentaje de
avance por sistema de captura directa, con acceso directo al siguiente elemento pendiente, y un
ritmo necesario (pendientes entre días hasta `config.fechas.ejecucion_fin`) que se agregó al valor
por defecto del ciclo porque el modelo de datos ya lo documentaba pero `cargar_catalogo.py` nunca lo
escribía. "Recepción" muestra avance por responsable —completados, pendientes, días sin reportar
evidencia— y cuántas fotografías siguen sin clasificar en `/recepcion`. Debajo, una tabla con los
221 elementos filtrable por sistema, responsable y estado, con fotografías por momento, quién
capturó y cuándo; cualquier renglón abre el elemento en `/capturar`. Exporta la tabla ya filtrada a
CSV (con BOM, para que Excel no maltrate los acentos) y los 221 resultados completos a JSON, ambos
generados en el navegador a partir de lo que ya se cargó para pintar la pantalla.

Dentro de la fase 5: `/catalogo` cubre RF-21 a RF-26. Por sistema, `PlantillaEditor` edita bloques
de fotos, puntos de revisión (con su tipo, obligatoriedad y opciones si son de selección) y los
textos de descripción habilitados; reordenar es con flechas, no arrastrar. El identificador de un
punto o bloque ya existente no se puede editar —lo demás sí— porque es la llave que ata las
respuestas ya capturadas (`registros.valores`) y las fotografías (`fotos.momento`) a ese punto;
tocarlo las dejaría huérfanas. Guardar siempre pasa primero por una vista previa que recalcula el
estado de cada elemento activo del sistema contra la plantilla nueva y dice cuántos cambiarían —RF-26—
antes de escribir nada. `ElementosCatalogo` da de alta, edita y da de baja elementos sin salir de la
pantalla; si la edición cambia el código, mueve cada fotografía ya subida a la ruta con el código
nuevo antes de guardar el cambio, así que ninguna fotografía se pierde ni hay que volver a subirla.
Dar de baja nunca borra: el elemento sale de las listas de captura pero se puede reactivar. Desde
`/catalogo` se exporta el catálogo completo y las plantillas completas a JSON, y se importa un
catálogo editado fuera —con una vista previa de altas, actualizaciones y bajas por sistema antes de
confirmar, igual que el cambio de plantilla—; la conciliación sólo toca los sistemas presentes en el
archivo (ver D-14).

**Formatos RAG estandarizados** (fuera de la numeración de fases: es la revisión que D-12 dejó
prevista para "una vez estandarizados los formatos", ejecutada dentro de este mismo ciclo). `/rag`
cubre los cinco RAG mensuales con una sola estructura de documento — ver D-15 y D-16 para el porqué de
cada pieza. Lo que debe ser idéntico en los cinco (clasificación, razón social, domicilio, instrucción
general, bloque de cierre) vive en código, en `lib/rag/constantes.ts`, no en la base — así no hay
manera de que un formato lo traiga distinto. `lib/rag/{documento,render,estilos}.ts` es una función
pura de datos a HTML, verificada importándola desde un script de Node suelto sin Next ni Supabase;
`/rag/[formato]` la usa para ver, alternar entre formato vacío y con lo capturado, imprimir (en un
iframe oculto) y editar lo particular del formato (`FormatoEditor.tsx` — nombre, periodicidad,
sistema, documento de referencia, revisión, instrucciones propias; nunca `clave` ni los campos
globales). No hay descarga directa de archivo: "Guardar como PDF" lo da el diálogo de impresión del
propio navegador — generar el PDF en servidor (Chromium sin cabeza) se evaluó y se descartó por el
peso de la dependencia, ver D-16. La migración `0005_rag.sql` agrega la tabla `formatos` y tres
columnas a `elementos` (`referencia`, `seccion`, `orden_seccion`) que el área todavía tiene que llenar
— el script extractor las deja explícitamente en `None`/`null`, no las inventa. `formatos_mensuales.json`
se carga con `web/scripts/cargar-formatos.ts` (TypeScript, no Python: `formatos` no depende de ningún
ciclo, así que mezclarlo con `cargar_catalogo.py` habría confundido esa distinción) o desde el botón
"Cargar formatos" en `/rag`; cualquiera de los dos se corre una sola vez, no por ciclo. La segunda
entrada (un generador local para cuando D-10 lo exija) queda diseñada pero sin escribir.

Dentro de la fase 6 (D-17): `/informe` genera el informe fotográfico mensual con un botón, corriendo
en el servidor con la sesión normal del usuario — no un script local, como se planeó al principio de
la fase, sino lo que se pidió al retomarla. Una diapositiva por elemento activo, en el orden
sistema → sección → elemento (misma regla de agrupación que `/rag`, reutilizada tal cual), sobre la
plantilla corporativa `Reporte sistemas - MASTER.pptx` — subida al depósito con
`subir-plantilla-informe.ts`, no versionada en el repositorio. `pptx-automizer` clona la diapositiva
`Elemento` de la plantilla por cada elemento y le agrega, no le modifica, el título, una línea de
metadatos, los tres textos, el collage fotográfico y una tabla con el resultado de cada punto de
revisión — los placeholders de la plantilla están vacíos, así que no hay nada que "reemplazar" en
ellos; todo se agrega encima, en las mismas coordenadas, con `pptxgenjs`. El collage lo arma `sharp`,
con el mismo criterio de acomodo que ya probó `reporte.py` (Marzo, Drive). Verificado contra el ciclo
real de agosto (224 elementos activos, 141 registros y 445 fotografías ya capturadas en ese momento):
la primera versión tardaba más de diez minutos; corregido a menos de dos, la mayor parte descarga de
fotografías y composición de collages —trabajo real, proporcional a la evidencia ya levantada, no una
falla— después de que armar el `.pptx` por sistema y combinar al final en vez de ir acumulando las
221 diapositivas en una sola presentación bajó el resto de varios minutos a segundos. El detalle
completo, con los tres hallazgos por separado, está en D-17. Pendiente: medir el ciclo completo con
los 221 elementos capturados y abrir el resultado en PowerPoint para confirmar que la plantilla y las
fuentes institucionales se ven como se espera.

**Ciclo piloto:** agosto 2026. Se libera para los dos sistemas internos —54 botones avisadores y 71
hidrantes interiores— y da seguimiento a los tres restantes mediante recepción. Los criterios con los
que se evaluará están en [`docs/requerimientos.md`](docs/requerimientos.md#9-criterios-de-aceptación-del-piloto).
