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
- **Generación del informe** mensual en PowerPoint a partir de lo capturado.

## Cómo está armado

```
  Teléfono / PC
        │
        ▼
  Next.js en Vercel  ── interfaz y API ──┐
        │                                │
        │ subida directa                 ▼
        └───────────────────────►   Supabase
                                    ├─ PostgreSQL   configuración, catálogo, resultados
                                    ├─ Storage      fotografías (depósito privado)
                                    └─ Auth         sesión

  ── al cierre del ciclo ─────────────────────────────────

  Equipo local:  generar_reporte.py  ──lee los datos──►  Informe_<Mes>.pptx
```

La captura y el seguimiento viven en la nube para poder usarse desde teléfono personal dentro de la
planta, sin depender de la red corporativa. La generación del informe se ejecuta en el equipo local
porque necesita la plantilla corporativa, las fuentes institucionales y PowerPoint para verificar el
resultado. El porqué de cada pieza está en [`docs/decisiones.md`](docs/decisiones.md).

## Estructura del repositorio

```
captura-sci/
├── README.md
├── docs/                    documentación del proyecto
│   ├── requerimientos.md
│   ├── modelo-de-datos.md
│   ├── flujos-de-usuario.md
│   └── decisiones.md
├── web/                     aplicación Next.js
├── supabase/                migraciones y carga inicial
│   └── migrations/
└── scripts/                 utilerías en Python
    ├── extraer_rags.py      genera el catálogo inicial desde los formatos RAG
    └── generar_reporte.py   arma el informe mensual
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

Dependencias de Python para las utilerías: `pypdf`, `Pillow`, `python-pptx`, `supabase`.

## Arranque local

```bash
# 1. Dependencias de la aplicación
cd web
npm install

# 2. Variables de entorno
cp .env.example .env.local
#    y capturar los valores del proyecto de Supabase

# 3. Base de datos
npx supabase link --project-ref <referencia-del-proyecto>
npx supabase db push
npx supabase db seed

# 4. Servidor de desarrollo
npm run dev
```

La aplicación queda en `http://localhost:3000`.

## Variables de entorno

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | Dirección del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador y servidor | Llave pública; opera bajo las políticas de seguridad por renglón |
| `SUPABASE_SERVICE_ROLE_KEY` | Sólo utilerías locales | Llave privilegiada para la carga inicial y el generador de informe. **No se publica ni se incluye en la aplicación** |

Las dos primeras se configuran también en Vercel. La tercera se queda en el equipo local, en un
archivo `.env` que no se versiona.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` | Revisión de estilo |
| `npx supabase db push` | Aplica las migraciones pendientes |
| `python scripts/extraer_rags.py` | Genera el catálogo inicial desde los formatos RAG en PDF |
| `python scripts/generar_reporte.py --ciclo 2026-08` | Arma el informe mensual en PowerPoint |

## Despliegue

El despliegue es automático: cada envío a la rama principal publica en Vercel. Las migraciones de
base de datos se aplican por separado con `npx supabase db push` antes de publicar cambios que
dependan de ellas.

## Estado del proyecto

| Fase | Entregable | Estado |
|---|---|---|
| 0 | Documentación y estructura del repositorio | Terminada |
| 1 | Base de datos, seguridad, sesión y carga inicial del catálogo | Pendiente |
| 2 | Captura desde teléfono con formulario configurable | Pendiente |
| 3 | Recepción y clasificación de evidencia externa | Pendiente |
| 4 | Tablero de seguimiento | Pendiente |
| 5 | Editor de catálogo y de plantillas | Pendiente |
| 6 | Generador del informe mensual | Pendiente |
| 7 | Archivado del ciclo y liberación del depósito | Pendiente |

**Ciclo piloto:** agosto 2026. Se libera para los dos sistemas internos —54 botones avisadores y 71
hidrantes interiores— y da seguimiento a los tres restantes mediante recepción. Los criterios con los
que se evaluará están en [`docs/requerimientos.md`](docs/requerimientos.md#9-criterios-de-aceptación-del-piloto).
