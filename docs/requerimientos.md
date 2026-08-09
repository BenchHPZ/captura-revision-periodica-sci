# Requerimientos

Sistema de captura de evidencias para la revisión periódica mensual de sistemas contra incendio.
Área de Protección Contra Incendios, Volkswagen de México, Planta Guanajuato.

Documento de referencia: **I1.15M2_4037-002 Rev. 5** (04.08.2020) — *Inspección, pruebas y
mantenimiento de los sistemas contra incendio*.

---

## 1. Situación actual

La revisión mensual se ejecuta hoy con herramientas dispersas y pasos manuales que no dejan
trazabilidad:

- El personal en campo documenta cada elemento con fotos que envía por WhatsApp al grupo del área.
- El encargado de sistemas descarga esas fotos y las clasifica a mano, creando una carpeta por
  elemento en `Evidencias\<sistema>\<elemento>\` y arrastrando los archivos que le corresponden.
  Los archivos conservan nombres del tipo `WhatsApp Image 2026-03-21 at 19.46.14.jpeg`, sin relación
  con el elemento.
- Las descripciones de hallazgos se capturan aparte, en un libro de Excel.
- Los formatos RAG se llenan en papel al cierre y se firman después.

Las consecuencias medidas en el ciclo de marzo de 2026:

| Problema | Evidencia |
|---|---|
| No hay forma de conocer el avance sin inspección manual | Hay que abrir 221 carpetas para saber qué falta |
| La clasificación depende de una persona y de su memoria | 22 de 212 elementos quedaron sin carpeta de evidencia |
| Los nombres de carpeta divergen del catálogo | `105 Yesenia` en el libro contra `105 - Yesenia` en disco |
| El identificador del elemento es ambiguo | Coexisten `101 - Andres`, `101 - Jesus` y `101 - Julio`: tres avisadores distintos con el mismo número en zonas distintas |
| El dato de campo y la fotografía viven separados | La condición está en Excel, la foto en una carpeta, sin liga entre ambos |

## 2. Objetivo

Que la fotografía y la descripción entren al sistema **ya asociadas al elemento que se está
revisando**, que el avance sea consultable en cualquier momento sin preguntar a nadie, y que el
catálogo de elementos y los puntos a supervisar se puedan modificar durante la ejecución sin
intervención técnica.

## 3. Alcance del ciclo piloto

Ciclo **agosto 2026**. El sistema se libera para los dos sistemas internos, que ejecuta una sola
persona, y da seguimiento a los tres restantes mediante recepción de evidencia enviada por terceros.

| Sistema | Formato | Elementos | Captura |
|---|---|---|---|
| Botones avisadores | RAG 2.4 | 54 | Directa en la aplicación |
| Hidrantes interiores | RAG 2.3 | 71 | Directa en la aplicación |
| Hidrantes exteriores | RAG 2.2 | 33 | Recepción por WhatsApp |
| Válvulas aéreas | RAG 2.7 | 15 | Recepción por WhatsApp |
| Válvulas subterráneas | RAG 2.8 | 48 | Recepción por WhatsApp |
| **Total** | | **221** | |

Los 33 hidrantes exteriores incluyen el hidrante de la entrada del patio auxiliar de contenedores,
que aún no aparece en el RAG 2.2 y está pendiente de nomenclatura.

Calendario del ciclo: ejecución del 1 al 19 de agosto, entrega del reporte general el 20, y
supervisión por coordinación de turno del 21 al 30.

---

## 4. Requerimientos funcionales

### Captura

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-01 | Seleccionar un sistema y, dentro de él, el elemento que se está revisando, con búsqueda por identificador, nombre o ubicación | Alta |
| RF-02 | Capturar fotografías desde la cámara del teléfono o desde archivo, asociadas al momento que define la plantilla del sistema (antes, después, estado) | Alta |
| RF-03 | Admitir más de una fotografía por momento | Alta |
| RF-04 | Capturar los tres textos de la evidencia: cómo se encontró, qué se le realizó y pendientes | Alta |
| RF-05 | Capturar los puntos de revisión que la plantilla del sistema defina para el ciclo, con el tipo de dato que corresponda | Alta |
| RF-06 | Guardar y avanzar automáticamente al siguiente elemento pendiente del mismo sistema | Media |
| RF-07 | Conservar un borrador local mientras se llena el formulario, para no perder trabajo si se interrumpe la señal dentro de nave | Alta |
| RF-08 | Permitir volver a un elemento ya capturado y corregirlo | Alta |
| RF-09 | Indicar en la lista de elementos el estado de cada uno antes de entrar | Media |

### Recepción de evidencia externa

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-10 | Cargar en bloque un conjunto de fotografías exportadas de WhatsApp, sin clasificar | Alta |
| RF-11 | Mostrar las fotografías pendientes de clasificar en una rejilla con vista previa | Alta |
| RF-12 | Seleccionar una o varias fotografías y asignarlas a un elemento y a un momento | Alta |
| RF-13 | Retirar de la rejilla de pendientes lo que ya fue asignado, de modo que lo visible sea siempre lo que falta | Alta |
| RF-14 | Abrir el formulario del elemento desde la pantalla de recepción para capturar los textos que acompañan a las fotografías | Alta |
| RF-15 | Descartar fotografías que no correspondan a ningún elemento | Media |

### Seguimiento

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-16 | Presentar el avance separado en los dos procesos que corren en paralelo: captura propia y recepción de terceros | Alta |
| RF-17 | Mostrar por sistema el total de elementos, los capturados, los pendientes y el porcentaje de avance | Alta |
| RF-18 | Mostrar en recepción el avance por responsable: qué entregó cada persona, qué le falta y cuánto tiempo lleva sin reportar | Alta |
| RF-19 | Ofrecer una tabla detallada, filtrable por sistema, responsable y estado | Alta |
| RF-20 | Exportar el detalle a CSV y los resultados completos a JSON | Media |

### Catálogo y configuración

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-21 | Dar de alta, modificar y desactivar elementos durante la ejecución, sin desplegar de nuevo la aplicación | Alta |
| RF-22 | Definir por sistema y por ciclo los puntos de revisión: identificador, etiqueta, tipo de dato y obligatoriedad | Alta |
| RF-23 | Definir por sistema y por ciclo los momentos fotográficos requeridos y su cantidad mínima | Alta |
| RF-24 | Importar y exportar el catálogo y las plantillas en JSON | Alta |
| RF-25 | Abrir un ciclo nuevo clonando el catálogo y las plantillas del anterior | Media |
| RF-26 | Advertir cuando un cambio de plantilla modifique el estado de elementos ya capturados | Media |

### Acceso

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-27 | Exigir autenticación para cualquier operación; la aplicación es accesible desde internet | Alta |
| RF-28 | Registrar en cada captura quién la realizó y cuándo | Alta |
| RF-29 | Admitir el alta posterior de más usuarios sin migrar datos | Media |

---

## 5. Requerimientos de datos

| ID | Requerimiento |
|---|---|
| RD-01 | Cada elemento tiene un identificador único y estable, independiente del número que lleva rotulado en campo |
| RD-02 | El identificador se acompaña de zona, ubicación y tipo, de modo que el elemento quede determinado sin ambigüedad |
| RD-03 | Los puntos de revisión son datos configurables, no estructura fija: un ciclo puede tener puntos completamente distintos al anterior |
| RD-04 | La configuración del ciclo, el catálogo y los resultados se manejan como tres conjuntos separados |
| RD-05 | El estado de un elemento se deriva de la plantilla vigente y del contenido capturado; no se teclea |
| RD-06 | Modificar el catálogo no altera lo ya capturado |
| RD-07 | Las fotografías se conservan en resolución suficiente para servir como evidencia posterior, no sólo para el informe |
| RD-08 | Los resultados se pueden exportar íntegros en un formato legible y versionable |

## 6. Requerimientos operativos

| ID | Requerimiento |
|---|---|
| RO-01 | Uso desde teléfono personal con datos móviles, dentro de la planta, sin depender de la red corporativa ni de una VPN |
| RO-02 | Uso desde computadora en la red de VW para las tareas de recepción y seguimiento |
| RO-03 | Operación por una sola persona en el ciclo piloto, sin apoyo técnico durante la ejecución |
| RO-04 | La generación del informe mensual en PowerPoint se ejecuta desde el equipo local, con la plantilla corporativa y las fuentes institucionales instaladas |
| RO-05 | Los productos operativos —catálogo exportado, resultados exportados e informe— se depositan en la carpeta de trabajo en Google Drive |

## 7. Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-01 | La captura de un elemento completo no debe exceder dos minutos, incluida la subida de fotografías |
| RNF-02 | La interfaz de captura se diseña para teléfono en primer lugar; la de recepción y seguimiento, para escritorio |
| RNF-03 | La aplicación debe tolerar señal intermitente sin pérdida de lo ya escrito |
| RNF-04 | Los textos y etiquetas de la interfaz se presentan en español |
| RNF-05 | La identidad visual sigue los lineamientos de marca de Volkswagen de México |

---

## 8. Fuera de alcance

Se deja constancia de lo que este sistema **no** resuelve, para evitar expectativas:

- **No sustituye a los formatos RAG oficiales.** Captura los datos que los alimentan; el llenado y
  la firma de los formatos siguen su curso actual. La generación automática del libro de RAG se
  evaluará una vez estandarizados los formatos.
- **No gestiona el RAG 2.9 ni el RAG 2.13** (cierre de válvulas). Son formatos por evento, no por
  recorrido, y siguen su procedimiento actual.
- **No incorpora firma electrónica** ni sustituye la validación de coordinación de turno.
- **No es compatible con `reporte.py`.** El generador anterior se conserva únicamente para
  reprocesar ciclos ya cerrados.
- **No contempla operación sin conexión.** Se conserva el borrador en el navegador, pero la carga
  requiere señal.
- **No incluye el alta de los otros cuatro especialistas** en el ciclo piloto. El esquema lo prevé,
  pero su incorporación es posterior a la validación del piloto.
- **No administra los sistemas de detección, extinción por agente limpio, sprinklers ni portones
  corta fuego**, que se rigen por otros apartados de la instrucción.

## 9. Criterios de aceptación del piloto

El piloto se considera exitoso si al 20 de agosto de 2026:

1. Los 125 elementos de sistemas internos están capturados desde la aplicación, con sus fotografías
   y sus textos.
2. La evidencia recibida de los otros tres sistemas está clasificada por elemento dentro del sistema,
   sin carpetas creadas a mano.
3. El avance fue consultable en cualquier momento sin recorrer carpetas.
4. El catálogo se pudo corregir durante la ejecución sin apoyo técnico.
5. El informe mensual se generó a partir de los datos capturados.
