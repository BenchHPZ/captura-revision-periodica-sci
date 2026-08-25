# Decisiones

Registro de las decisiones de negocio y técnicas que dan forma al sistema. Cada una deja constancia
del contexto en que se tomó, de lo que se descartó y de lo que implica sostenerla, para que quien
retome el proyecto no tenga que reconstruir el razonamiento.

Estado de cada decisión: **vigente**, **pendiente** o **revisada**.

---

## D-01 · Se abandona la compatibilidad con el generador anterior

**Estado:** vigente

**Contexto.** El generador de informes existente (`reporte.py`) localiza las fotografías construyendo
una ruta a partir del nombre del elemento tal como aparece en el libro de Excel, y lee el contenido
de esa carpeta sin recorrer subcarpetas. Eso obliga a que las imágenes queden planas dentro de una
carpeta cuyo nombre coincida carácter por carácter con el del libro. La coincidencia es literal: en
marzo, `105 Yesenia` en el libro contra `105 - Yesenia` en disco bastó para que el elemento quedara
sin fotografías, sin ningún error visible.

**Decisión.** El sistema nuevo no se ata a esa estructura. Organiza el almacenamiento por
identificador de elemento y guarda la relación en la base de datos, no en el nombre de una carpeta.

**Consecuencias.** El generador anterior deja de servir para los ciclos nuevos y se conserva sólo
para reprocesar los ya cerrados. A cambio, desaparece toda una familia de fallas silenciosas: un
cambio de nombre ya no rompe la liga entre el elemento y su evidencia.

**Alternativa descartada.** Mantener la convención de carpetas y adaptarle el sistema. Se descartó
porque conserva el problema de fondo —la identidad del activo depende de una cadena de texto
escrita a mano— a cambio de compatibilidad con una herramienta que de todos modos se sustituye.

---

## D-02 · Los puntos de revisión son datos, no estructura del programa

**Estado:** vigente

**Contexto.** Lo que se supervisa en cada sistema cambia de un ciclo a otro. Este mes los hidrantes
interiores se revisan contra cuatro puntos del RAG 2.3; el mes que entra pueden ser otros
completamente distintos, y está previsto estandarizar los formatos, lo que moverá esos puntos otra
vez.

**Decisión.** Los puntos de revisión, los momentos fotográficos requeridos y los campos de
descripción se definen por sistema y por ciclo en una plantilla almacenada como datos. El formulario
de captura se dibuja a partir de ella y la regla de completitud se deriva de ella.

**Consecuencias.** Cambiar lo que se supervisa no requiere modificar ni volver a desplegar la
aplicación: se edita la plantilla y surte efecto de inmediato. El costo es que la validación no puede
comprobarse al escribir el programa, sino en tiempo de ejecución, y que un cambio de plantilla
recalcula el estado de lo ya capturado.

**Alternativa descartada.** Codificar los campos de cada RAG. Habría dado formularios más simples,
pero cada modificación de formato —que es una certeza, no una hipótesis— exigiría intervención
técnica en plena ejecución del ciclo.

---

## D-03 · Cada elemento lleva identificador único propio

**Estado:** vigente

**Contexto.** El número rotulado en campo no identifica al activo. El RAG 2.4 repite `ELEM. 101` en
tres zonas distintas, y en las carpetas de marzo eso se resolvió agregando el nombre de quien revisó:
`101 - Andres`, `101 - Jesus`, `101 - Julio`. La identidad del activo quedó atada a quién lo atendió
ese mes, de modo que al cambiar el reparto se pierde la trazabilidad histórica.

**Decisión.** Cada elemento tiene un identificador único y estable, asignado por el área,
independiente del rótulo. Junto a él se registran zona, ubicación y tipo. El rótulo se conserva como
dato de presentación y puede repetirse.

**Consecuencias.** El área debe asignar y mantener esos identificadores; es trabajo que hoy no
existe. A cambio, el historial de un activo se puede seguir entre ciclos aunque cambie de
responsable, y desaparece la ambigüedad al clasificar evidencia.

---

## D-04 · El informe se genera desde el equipo local

**Estado:** revisada — ver D-17

**Contexto.** La presentación mensual se arma sobre la plantilla corporativa `Reporte sistemas -
MASTER.pptx`, con las fuentes institucionales instaladas en el equipo, y se revisa abriéndola en
PowerPoint antes de entregarla.

**Decisión original.** La captura y el seguimiento viven en la nube; la generación del informe es un
programa que se ejecuta en el equipo del encargado, lee los datos del ciclo y deposita el archivo
resultante en la carpeta de trabajo.

**Consecuencias.** Hay dos piezas que mantener en lugar de una. A cambio, el informe se produce con
la plantilla y la tipografía correctas, se puede revisar antes de entregarlo, y la nube no necesita
cargar con dependencias de ofimática.

**Por qué se revisó.** Al retomar esta fase se pidió explícitamente que el informe también corriera
desde el servidor, con un botón en la propia aplicación — no sólo desde el equipo local. D-17 explica
cómo: `python-pptx` no tiene equivalente directo en el entorno de Node de Vercel, así que el
generador se reescribió en TypeScript. La revisión abierta antes de entregar (razón de fondo de esta
decisión) se conserva igual: el archivo generado se descarga y se revisa en PowerPoint antes de
enviarlo, sólo que ya no hace falta estar frente al equipo que lo generó.

---

## D-05 · Base de datos gestionada en lugar de archivos

**Estado:** vigente

**Contexto.** El planteamiento inicial guardaba todo en archivos JSON junto a las fotografías. Al
decidirse que el sistema se publica en internet y que puede haber más de una persona capturando,
escribir archivos deja de ser seguro: dos escrituras simultáneas sobre el mismo archivo lo corrompen,
y el sistema de archivos de un alojamiento sin servidor no conserva nada entre invocaciones.

**Decisión.** Los resultados se escriben en PostgreSQL gestionado. La configuración y el catálogo
también viven ahí, para poder modificarlos durante la ejecución sin volver a desplegar. El sistema
ofrece importación y exportación en JSON en ambos sentidos.

**Consecuencias.** Se depende de un servicio externo y hay que administrar credenciales y respaldos.
A cambio, la escritura concurrente deja de ser un riesgo y el avance se puede consultar sin recorrer
archivos. La exportación conserva la ventaja de tener los datos en un formato legible y versionable.

**Nota.** Se evaluó SQLite, que era la opción natural para una aplicación local. No es viable en un
alojamiento sin servidor: el sistema de archivos es efímero y cada invocación arranca en blanco.

---

## D-06 · Las fotografías suben directo al depósito, con la sesión del usuario

**Estado:** vigente (revisada en la fase 2)

**Contexto.** El alojamiento de la aplicación limita el tamaño del cuerpo de las peticiones a unos
pocos megabytes. Una tanda de fotografías de teléfono lo excede con facilidad. Además, la captura
ocurre parado frente al elemento con la señal de teléfono que haya dentro de la nave (RNF-03), así
que cada vuelta cliente-servidor de más se siente.

**Decisión.** El navegador sube cada fotografía directamente al depósito de archivos con la sesión
ya autenticada del usuario, y sólo informa a la aplicación la ruta resultante para registrarla en
`fotos`. Al diseñar esto se consideró emitir una URL firmada de un solo uso por fotografía (una
autorización temporal de corta vigencia, generada por el servidor antes de cada subida) en vez de
subir directo; se descartó porque exige una vuelta extra al servidor *antes* de cada fotografía —
justo el costo que D-06 busca evitar— sin una ganancia real de seguridad mientras opera un solo
usuario autenticado (D-09): las políticas de Storage de `0004_storage.sql` ya exigen sesión válida
para leer o escribir en el depósito.

**Consecuencias.** No hay límite práctico de tamaño, la carga desde teléfono es más rápida (una sola
vuelta por fotografía) y el servidor de la aplicación no gasta recursos moviendo archivos. El costo:
cualquier sesión autenticada puede escribir en cualquier ruta del depósito, no sólo en la del
elemento que tiene abierto — aceptable con un solo usuario, pero **al dar de alta a más
especialistas (D-09) hay que revisar las políticas de Storage** para restringir la escritura por
prefijo de ruta (`storage.foldername(name)`), de modo que cada quien sólo pueda escribir dentro de
su propio ciclo/sistema.

---

## D-07 · Resolución de las fotografías: 2560 px y calidad 88

**Estado:** vigente

**Contexto.** El informe arma collages de 900 × 900 píxeles, para lo que bastaría una resolución
mucho menor. Pero la fotografía se levanta como evidencia y puede necesitarse después para sustentar
un hallazgo, no sólo para ilustrar la presentación.

**Decisión.** Las imágenes se reducen en el navegador al lado mayor de 2560 píxeles con calidad 88, y
se les aplica al píxel la orientación registrada en los metadatos antes de subirlas. No se conserva
el archivo original.

**Consecuencias.** Cada fotografía ocupa entre 800 KB y 1.2 MB, y un ciclo completo ronda los 440 MB.
Ese volumen es el que obliga a archivar cada ciclo al cerrarlo. Aplicar la orientación al píxel evita
que las fotografías tomadas en horizontal aparezcan acostadas en el informe, que es lo que ocurre
cuando el navegador reduce la imagen sin considerar sus metadatos.

**Pendiente de confirmar.** Si algún dictamen llegara a requerir el archivo original sin reducir,
habría que decidirlo antes de que arranque la captura, porque el original no se conserva.

---

## D-08 · Dos vías de entrada de evidencia

**Estado:** vigente

**Contexto.** El ciclo piloto cubre los dos sistemas internos, que ejecuta el encargado y que puede
capturar directamente. Los otros tres los ejecutan cuatro especialistas que seguirán enviando su
evidencia por WhatsApp.

**Decisión.** El sistema admite las dos vías contra el mismo almacén: captura directa desde teléfono
y recepción de conjuntos sin clasificar que se asignan a su elemento desde una pantalla de
escritorio. El origen queda marcado en cada fotografía.

**Consecuencias.** Hay dos pantallas que mantener. A cambio, la transición no obliga a cambiar de
golpe la forma de trabajar de todo el equipo, y el seguimiento cubre los 221 elementos desde el
primer ciclo, no sólo los 125 internos.

---

## D-09 · Un solo usuario en el ciclo piloto

**Estado:** vigente

**Contexto.** La aplicación queda expuesta en internet para poder usarse desde teléfono personal
dentro de la planta, sin depender de la red corporativa.

**Decisión.** Una sola cuenta, la del encargado de sistemas. El modelo de datos ya contempla el
responsable de cada elemento y el autor de cada captura, de modo que dar de alta a los demás
especialistas no exige migrar nada.

**Consecuencias.** Se reduce al mínimo la superficie expuesta mientras se valida el piloto. El costo
es que la evidencia de los otros tres sistemas pasa por el encargado en lugar de entrar directo, que
es justamente la carga que se busca eliminar más adelante.

---

## D-10 · Clasificación de la información

**Estado:** pendiente

**Contexto.** Los formatos RAG están marcados como información interna, y las fotografías muestran
infraestructura contra incendio de la planta: ubicación de hidrantes, estado de válvulas y puntos de
acceso a la red de agua. Alojar la aplicación en servicios de terceros implica que esa información
sale de la infraestructura de la empresa.

**Decisión.** Para el ciclo piloto, limitado a los dos sistemas internos, se acepta el alojamiento
externo con depósito privado, acceso autenticado y enlaces de vigencia corta.

**Acción pendiente.** Antes de incorporar los 221 elementos y adoptar el sistema como proceso
oficial, confirmar la ubicación de los datos y las condiciones de tratamiento con quien lleva
seguridad de la información. Si el resultado lo exige, la alternativa es alojar la aplicación en
infraestructura de la empresa: el modelo de datos y la aplicación no cambian, sólo el alojamiento.

---

## D-11 · El repositorio vive fuera de la carpeta sincronizada

**Estado:** vigente

**Contexto.** El área trabaja sobre una carpeta de Google Drive sincronizada. Un proyecto de
aplicación web arrastra del orden de 30 000 archivos de dependencias, y la sincronización sobre el
directorio de control de versiones corrompe el repositorio.

**Decisión.** El código y la documentación viven en un repositorio local respaldado en un servicio de
control de versiones, fuera de la carpeta sincronizada. En la carpeta de trabajo se depositan
únicamente los productos operativos: el catálogo exportado, los resultados exportados y el informe
generado.

**Consecuencias.** Quien necesite consultar la documentación lo hace desde el repositorio y no desde
la carpeta compartida. A cambio, se evita corromper el historial y saturar la sincronización.

---

## D-12 · Alcance deliberadamente acotado

**Estado:** vigente

**Contexto.** El sistema toca un proceso que hoy involucra formatos en papel, un libro de Excel,
firmas y validaciones de coordinación. Es tentador absorberlo todo de una vez.

**Decisión.** El sistema captura evidencia y da seguimiento. No sustituye los formatos oficiales, no
incorpora firma electrónica, no gestiona los formatos por evento de cierre de válvulas y no reemplaza
la validación de coordinación de turno.

**Consecuencias.** Durante un tiempo conviven el sistema y los formatos en papel, con captura doble
de algunos datos. Se acepta a cambio de poder liberar algo utilizable dentro del ciclo en curso, y de
no condicionar el proyecto a la estandarización de formatos, que corre por separado.

**Revisión prevista.** Una vez estandarizados los formatos, evaluar la generación automática del
libro de RAG a partir de los puntos ya capturados. Los datos necesarios se están levantando desde
este primer ciclo, de modo que la funcionalidad no exigirá recapturar nada.

**Seguimiento.** Esa revisión se hizo — ver D-15 y D-16. Se pudo generar sin recapturar nada, tal
como se anticipaba: los cinco puntos de revisión ya estaban modelados como datos (D-02) y el único
ajuste real fue de forma, no de fondo — pasar sus respuestas de texto ("SI"/"NO") a booleano.

---

## D-15 · Estructura única para los cinco RAG mensuales

**Estado:** vigente

**Contexto.** Los cinco RAG mensuales son hoy cinco hojas de Excel de 2022 impresas a PDF, cada una
con su propio acomodo de columnas, su propio encabezado y sus propias instrucciones — algunas ni
siquiera coinciden entre sí en detalles básicos como si llevan la marca `INTERNAL#`. Eso impide
llenarlos digitalmente contra un modelo común y analizar los resultados por sección o por punto de
revisión entre formatos, que es justo lo que motivó esta revisión (ver D-12).

**Decisión.** Los cinco formatos comparten una sola estructura de documento — mismo encabezado, mismo
pie corrido, mismas columnas fijas (`ID`, `Numeración`, `Ubicación`, `Referencia`, puntos de la
plantilla vigente, `Observaciones`) — con una tabla nueva, `formatos`, que declara esa identidad e
imagen por `(nombre, periodicidad)`, separada de `plantillas` (que sigue declarando qué se supervisa,
D-02). Dentro de esa estructura común:

- **`Observaciones` deja de ser un punto de plantilla.** Antes vivía como un punto más de tipo texto,
  repetido idéntico en las cinco plantillas con `requerido: false`. Ahora es columna fija del
  documento, y se llena con `registros.pendientes` — no hay una columna `observaciones` aparte (una
  primera versión de esta decisión sí agregó una; se retiró en la revisión de §7.2 porque duplicaba lo
  que `pendientes` ya cubre, y ese campo ya estaba habilitado en `texto_libre` en los cinco sistemas).
- **Los puntos `si_no`/`si_no_na` se guardan como booleano**, no como cadena `"SI"`/`"NO"`. Separar el
  dato de su presentación es lo que hace posible el análisis por punto que motivó todo esto — contar,
  promediar y comparar entre formatos sin normalizar texto antes. El costo quedó acotado a un solo
  lugar delicado: `calcularEstado()` tenía que dejar de comprobar veracidad (`!!valor`) y pasar a
  comprobar presencia de la llave, porque `false` (NO) es una respuesta válida y es falsy — con la
  comprobación vieja, un elemento con todo en NO se habría quedado en `parcial` para siempre. Se pagó
  ahora porque el esquema todavía no se aplicaba en Supabase y no había un solo registro capturado;
  después del piloto habría costado una migración sobre 221 elementos.
- **`Ubicación` seguía una lectura invertida.** El formato de campo es `AA00-00`: eje oeste-este, nave,
  eje norte-sur, siempre por pares; fuera de nave es `Exterior` y se guía sólo por `Referencia`.
  `scripts/extraer_rags.py` traducía `H 01 N A 01 02` a `"Nave A · 01-02"` — leyendo el eje como si
  fuera la nave. Se corrigió a `"A01-02"`. Se verificó contra los cinco PDF de origen antes de tocar
  el código: 61 de 71 hidrantes interiores y las 15 válvulas aéreas sí traen esa cuadrícula; el resto
  no se adivina —RAG 2.2 y RAG 2.8 no traen columna de ubicación en el PDF (109 de 221 elementos en
  total quedan con `ubicacion: null`), y el script señala en `notas` los casos ambiguos (`"0.1"/"0.2"`
  en avisadores, que parecen nivel de planta y no eje; naves con el guion sin número) en vez de
  resolverlos por su cuenta — mismo criterio que ya usaba para D-03.
- **`ID` es correlativo dentro de cada edición del documento, no un dato guardado.** Se deriva al
  generar, recorriendo las secciones y sus elementos en orden; se renumera solo si se da de alta o de
  baja un elemento. Por eso el documento lleva ciclo y fecha de generación en el encabezado y
  `Página X de Y` en el pie: sin ese sello, "item 14" deja de ser inequívoco entre una edición y la
  siguiente.
- **`Sección` es campo propio del catálogo** (`elementos.seccion` + `orden_seccion`), no derivado de
  `zona` ni de `ubicacion`. Se consideró y se descartó reutilizar `zona` —ya existía y ya traía datos
  para avisadores y válvulas subterráneas— precisamente porque atar la agrupación del documento a un
  campo que sirve para otra cosa le quita al área la libertad de agrupar el RAG como convenga sin que
  ese otro dato tenga que tener la forma correcta primero.

**Consecuencias.** El área tiene trabajo de captura pendiente que ningún script puede inventar: 109
elementos sin `ubicacion`/`referencia` y los 221 sin `seccion`/`orden_seccion` — se llenan desde
`/catalogo` o por el JSON de importación, que ya concilia por `(sistema, código)` sin tocar los
sistemas ausentes del archivo (D-13, D-14). A cambio, el documento generado es uno solo por
definición, no cinco mantenidos a mano, y las respuestas quedan en una forma que sí se presta a
análisis.

**Alternativa descartada.** Mantener las cinco plantillas de Excel y limitarse a llenarlas por
software. Se descartó porque conserva el problema de fondo — cinco imágenes distintas, sin columnas
comparables entre sí — a cambio de parecerse más a lo que ya existe.

**Revisión.** La primera versión de esta decisión guardaba `encabezado` y `cierre` como `jsonb` **por
formato** en la propia tabla `formatos` — nada impedía que la razón social o el bloque de firmas
quedaran distintos entre RAG por un error de captura, justo el problema que esta decisión buscaba
resolver. Contrastado contra fotos de los RAG 2.4 y 2.8 reales, se corrigió:

- **`clasificacion`, `razon_social`, `domicilio`, la instrucción general y el bloque de cierre
  completo pasan a constantes en código** (`web/lib/rag/constantes.ts`), no a datos — es la única forma
  de que "no haya posibilidad de cambiarlos" por formato. `documento_referencia` y `revision` siguen
  siendo particulares de cada formato, pero se mueven del encabezado al **pie**, como en los RAG
  reales. Las `instrucciones` de `formatos` quedan sólo con las propias de cada uno (p. ej. "P = Pie,
  G = Gabinete"); la general se concatena al generar.
- **El bloque de cierre se estandariza también en contenido**, no sólo en estructura: los PDF de
  origen traían tres acomodos distintos ("Bombero que realizó" + "Coordinador Técnico de Soporte" en
  RAG 2.2/2.3; los mismos dos más "Grupo" aparte en RAG 2.4; "Realizó" + "Coordinador de Soporte de
  PCI" en RAG 2.7/2.8). El bloque global queda como **Realizó** (nombre, grupo y firma) · **Fecha** ·
  **Coordinador de Soporte de PCI** (nombre y firma) — es el objetivo mismo de la estandarización, no
  un descuido; el documento generado ya no reproduce literal el cierre de cada PDF de origen.
- **Rediseño de impresión**, verificado renderizando RAG 2.2 y RAG 2.3 reales y comparando contra las
  fotos: encabezado (clasificación + wordmark VW en un solo renglón, centrado y alto) y encabezados de
  columna dentro de `<thead>`; pie corporativo y bloque de cierre dentro de `<tfoot>` — de la misma
  tabla que trae los renglones, para que ambos se repitan de forma nativa al paginar sin programarlo.
  `@page { margin: 8mm }` para aprovechar la hoja completa. `#`/`Numeración`/`Ubicación` con
  `white-space: nowrap` y ancho fijo en milímetros para que nunca partan renglón. Cada punto de
  revisión ocupa **una sola columna de 10mm**, con la respuesta (`SI`/`NO`/`NA`) escrita dentro de la
  celda, bajo la etiqueta **rotada en vertical** (`writing-mode: vertical-rl`) para que la columna
  quede angosta. Observaciones se lleva todo el ancho que sobra. Las secciones quedan enmarcadas con
  regla gruesa arriba y abajo de la franja verde, para leerse como bloque propio dentro de la tabla.
- **Un punto de revisión = una columna, no dos sub-columnas SI/NO.** El primer diseño le daba a cada
  punto dos sub-columnas con casilla marcada con "X". Se revirtió por dos razones. La de forma: dos
  casillas cuestan el doble de ancho sin agregar información, porque la respuesta es excluyente —
  basta escribirla. La de fondo: las sub-columnas hacían que el número real de columnas dejara de
  coincidir con `4 + puntos.length + 1`, que es lo que `render.ts` usaba en cada `colspan`. Con cinco
  puntos la tabla tenía 15 columnas y los `colspan` decían 10, así que **todo lo de ancho completo
  —wordmark, título, instrucciones, franjas de sección y pie— se cortaba a dos tercios de la hoja** y
  el logo quedaba visiblemente descentrado. Al volver a una columna por punto los dos conteos vuelven
  a ser el mismo número por construcción, y el defecto no puede reaparecer sin que se note.
- **La etiqueta vertical lleva altura fija (`height: 18mm`), no libre.** Sin tope, una etiqueta larga
  estira el encabezado hacia abajo; y como el encabezado se repite en cada hoja, ese exceso se paga en
  todas. Con el tope, la etiqueta larga se parte en dos renglones verticales —que caben de sobra en
  los 10mm de la columna, así que el ajuste no cuesta ancho— y todas las columnas quedan a la misma
  altura. 18mm se eligió midiendo: por encima (22mm, 26mm) el encabezado crece sin que las etiquetas
  dejen de partirse, y por debajo (15mm) ya no se gana ningún renglón por hoja pero alguna etiqueta
  cae a tres líneas. Entre 26mm y 18mm la diferencia es de 32 a 34 renglones por hoja.
- **El renderizador acepta las respuestas en booleano y en el texto viejo `"SI"`/`"NO"`.** Los
  registros capturados en campo antes del cambio a booleanos (D-15) quedaron como cadenas, y conviven
  con los nuevos en la misma tabla. `respuestaDe()` normaliza ambas formas al imprimir en vez de
  migrar los datos: son capturas reales de un ciclo en curso y no hay motivo para reescribirlas.
- **El logo VW se agrega**, wordmark `VWM_logo_Deep_Space_Blue_rgb.svg` de la skill `vw-brand-style`
  (mismo lockup *VOLKSWAGEN / DE MÉXICO* de los RAG originales), embebido como marcado SVG crudo en
  `constantes.ts` para que el documento siga siendo autocontenido. Fondo blanco en todo el documento,
  no un panel oscuro — así son los RAG de origen; el verde queda reservado a los divisores de sección.
  **No se embebe la tipografía corporativa "The Group"**: es un activo con licencia restringida que
  `web/tailwind.config.ts` ya excluye de la aplicación por la misma razón (no se distribuye en un
  despliegue público); el documento usa la misma pila de reemplazo que el resto de la app.
- **El formato se vuelve editable desde `/rag/[formato]`**, acotado a lo mismo que es particular de
  arriba — `clave` queda fuera (es la llave única y el slug de la URL, mismo criterio que
  `PlantillaEditor.tsx` ya aplica al id de un punto existente); los campos globales ni siquiera llegan
  a esa pantalla. `elementos` y `plantillas` se siguen editando sólo en `/catalogo`.

---

## D-16 · Un renderizador, pensado para dos entradas — sólo una se construye ahora

**Estado:** vigente

**Contexto.** Los formatos deben poder verse y llenarse digitalmente, imprimirse en blanco o con lo
capturado, y exportarse a PDF con la misma imagen. El equipo no puede instalar nada — ni un ejecutable
propio ni herramientas de conversión de PDF — así que la salida tiene que apoyarse en lo que el
navegador ya sabe hacer. Además, D-10 (clasificación de la información) sigue **pendiente**: si
seguridad de la información no autoriza el alojamiento externo de `captura-sci`, hace falta un camino
que no dependa de él.

**Decisión.** `lib/rag/documento.ts` y `lib/rag/render.ts` son una función pura de datos a HTML: no
importan `server-only`, `next/*` ni `react`. Reciben exactamente la forma del catálogo exportado
(§3.5 de `docs/modelo-de-datos.md`) y devuelven una cadena. Sobre esa base:

- **Entrada A, la app — se construye ahora.** `/rag/[formato]` arma el documento desde Supabase, lo
  incrusta en la pantalla, y usa el mismo HTML autocontenido (con su CSS embebido) para "Imprimir" —en
  un iframe oculto, para no imprimir con el resto de la app de por medio. Imprimir en blanco o con lo
  capturado, y exportar a PDF, los da el propio navegador (Chrome/Edge "Guardar como PDF"); no hace
  falta generar el PDF por software. **No hay botón de descarga directa de un archivo**: se consideró
  agregar generación de PDF en servidor (Chromium sin cabeza, tipo Puppeteer/Playwright) para que
  "Descargar" entregara un `.pdf` real con un clic, y se descartó — dependencia nueva y pesada,
  cold-start más largo en el despliegue, más superficie de fallas, a cambio de evitar un diálogo del
  sistema que de todos modos hay que atravesar para "Imprimir". El límite es honesto y hay que tenerlo
  presente: desde JavaScript no se puede preseleccionar "Guardar como PDF" ni saltarse el diálogo de
  impresión — es una frontera de seguridad del navegador. El `<title>` del documento sí queda fijado
  (p. ej. `RAG 2.3 — Agosto 2026`) para que sea el nombre que el diálogo sugiere al guardar.
- **El encabezado y el pie no se programan para repetirse: se declaran.** Todo vive dentro de
  `<thead>`/`<tfoot>` de una única `<table>`, que los navegadores repiten de forma nativa al paginar.
  El bloque de firmas se repite con ellos porque así se decidió que debía verse — cada hoja se firma
  por separado — aunque `cierre.repetir` queda declarado por formato, no global, para que un formato
  de otra periodicidad lo pueda resolver distinto sin tocar los cinco mensuales.
  **Limitación aceptada:** Chrome/Edge no soportan los contadores de página de CSS Paged Media
  (`@page { @bottom-right { content: counter(page) } }`); el `Página X de Y` real, si se necesita, lo
  añade el propio diálogo de impresión del navegador ("Más ajustes → Encabezados y pies de página"),
  no esta plantilla.
- **Entrada B, un generador local — queda diferida.** No se escribe todavía. Lo que se paga ahora es
  que `documento.ts`/`render.ts` no dependan de nada del entorno, verificado importándolos desde un
  script de Node suelto sin Next ni Supabase: si eso deja de funcionar, la entrada B queda bloqueada.
  Cumplida esa condición, la entrada B es después leer el JSON exportado y escribir un `.html` a
  disco — unas pocas decenas de líneas, sin tocar el renderizador.

**Consecuencias.** El renderizador queda en TypeScript mientras que las utilerías locales existentes
(`extraer_rags.py`, `cargar_catalogo.py`) están en Python — se acepta la mezcla en vez de reimplementar
el HTML/CSS dos veces, que es la única forma de que las dos salidas no se desincronicen con el tiempo.

**Alternativa descartada.** Un ejecutable de escritorio empaquetado. Se descartó de entrada: instalar
un ejecutable es justo la restricción que el equipo no puede cumplir, y se pierde el motor de
impresión del navegador, que es lo que resuelve la paginación sin escribir un renderizador de PDF
propio.

---

## D-13 · El código del elemento es único por sistema, no por ciclo

**Estado:** vigente

**Contexto.** El diseño original de D-03 asumía que `codigo` sería único en todo el ciclo, y así
quedó la primera versión de la restricción en `elementos`. Al correr `extraer_rags.py` contra los
cinco RAG reales de agosto, el propio catálogo la contradijo: `HC1-1` nombra un hidrante exterior en
el RAG 2.2 y, por separado, la válvula que cierra ese mismo hidrante en el RAG 2.8. Son dos elementos
físicos distintos —un hidrante y una válvula— que la instrucción nombra igual porque comparten
ubicación, no porque sea un error de captura. Con la restricción original, cargar el catálogo
completo habría rechazado el segundo como duplicado del primero; el script lo hizo evidente de
inmediato al comparar `(sistema, código)` entre los 221 elementos extraídos.

**Decisión.** La restricción de unicidad de `elementos.codigo` quedó en `(ciclo_id, sistema_id,
codigo)`, no en `(ciclo_id, codigo)`. Cada sistema es su propio espacio de nombres.

**Consecuencias.** Ninguna consulta que ya filtraba por sistema antes de buscar por código se ve
afectada — es el caso normal, porque la aplicación siempre sabe en qué sistema está trabajando (la
URL de captura y el panel de recepción llevan el sistema explícito). El único lugar que había que
ajustar a mano fue la conciliación de la importación masiva (Flujo 5), que ahora concilia por
`(sistema, código)` y no por código solo.

**Cómo se detectó.** No por análisis previo, sino por instrumentar el extractor para reportar
duplicados y correrlo contra los PDF reales antes de cargar nada — ver
docs/flujos-de-usuario.md Flujo 1 y `scripts/extraer_rags.py`. Queda como recordatorio de que el
catálogo real es la prueba de fondo para el modelo de datos, no al revés.

---

## D-14 · La importación del catálogo sólo concilia los sistemas presentes en el archivo

**Estado:** vigente

**Contexto.** Flujo 5 describe la importación masiva como un ciclo completo: exportar el catálogo,
editarlo fuera y volver a importarlo. Pero nada obliga a que el archivo que se importa sea siempre
ese ciclo completo — alguien puede exportar, recortar el archivo a un solo sistema para revisarlo
con más calma y volver a importar sólo eso. Si la conciliación comparara contra el catálogo entero
del ciclo, cualquier sistema ausente del archivo se leería como "ya no aparece" y se daría de baja
completo sin que nadie lo pidiera.

**Decisión.** La importación agrupa los elementos del archivo por el campo `sistema` y concilia cada
grupo únicamente contra los elementos existentes de ese mismo sistema. Un sistema que no aparece en
el archivo queda intacto, no se toca. Dentro de un sistema que sí está presente en el archivo, la
regla de Flujo 5 se aplica completa: lo que existe se actualiza, lo nuevo se da de alta y lo que ya
no aparece se marca inactivo.

**Consecuencias.** Un archivo parcial es seguro de importar — no puede dar de baja por accidente
sistemas que no tocó. El costo es que un archivo que de verdad pretendía vaciar un sistema completo
(dejarlo sin ningún elemento) tiene que decirlo explícitamente incluyendo ese sistema con una lista
vacía... lo cual en la práctica nunca aplica: ver un sistema entero desaparecer del catálogo no es un
caso de uso real de esta pantalla, sólo un riesgo a evitar.

**Cómo se detectó.** Al diseñar la fase 5, antes de escribir código: revisar Flujo 5 contra un caso
concreto —exportar 221 elementos, editar sólo botones avisadores, reimportar— bastó para ver que una
conciliación global habría desactivado hidrantes interiores, exteriores y ambas redes de válvulas sin
que el archivo dijera nada sobre ellos.

---

## D-17 · El informe fotográfico se genera en el servidor, en TypeScript

**Estado:** vigente

**Contexto.** D-04 fijó el generador como un programa local en Python porque necesitaba la plantilla
corporativa, las fuentes institucionales y PowerPoint para revisar el resultado antes de entregarlo.
Al retomar esta fase se pidió que también corriera desde el servidor, disparado con un botón en la
propia aplicación — no como alternativa al camino local, sino en vez de él.

**Decisión.** El generador vive en `web/lib/informe/` y corre como una acción de servidor de Next.js
(`/informe`), con la sesión normal del usuario — nunca la llave de servicio, que sigue reservada a
las utilerías locales (ver README § Variables de entorno). `python-pptx` no tiene equivalente en el
entorno de Node de Vercel, así que el generador se escribió de nuevo, no se migró:

- **`pptx-automizer`** abre la plantilla corporativa real (`Reporte sistemas - MASTER.pptx`, subida al
  depósito bajo `_plantillas/`) y clona su diapositiva `Elemento` una vez por elemento activo — es la
  única librería de Node encontrada que trabaja sobre un `.pptx` existente en vez de construir uno
  desde cero (`pptxgenjs` a solas no puede abrir una plantilla ya hecha).
- **El contenido de cada diapositiva se agrega, no se modifica.** Los placeholders de la diapositiva
  de referencia están vacíos —nunca se escribió nada en ellos dentro de PowerPoint—, y las funciones
  de `pptx-automizer` para modificar un elemento existente (`modify.setText`,
  `ModifyImageHelper.setRelationTarget`) sólo saben reemplazar contenido que ya está ahí: sobre un
  placeholder vacío no hacen nada, sin avisar. La única vía que sí funciona sobre un placeholder vacío
  es `slide.generate()`, el atajo de `pptx-automizer` hacia `pptxgenjs` puro — así que título, la
  línea de metadatos, los tres textos, el collage y la tabla de puntos de revisión se agregan como
  elementos nuevos, posicionados con las coordenadas exactas de cada placeholder (medidas una sola vez
  con `python-pptx` sobre la plantilla real, ver `web/lib/informe/geometria.ts`) en vez de intentar
  llenar el placeholder que ocupa ese lugar.
- **`sharp`** arma el collage fotográfico — mismo criterio de acomodo según cantidad y orientación que
  `generar_collage()` en `reporte.py` (Marzo, Drive), portado a mano porque ese script vive fuera del
  repositorio (D-11) y no porque la lógica cambiara.
- El documento RAG y el informe comparten la misma regla de agrupación por sección
  (`agruparPorSeccion`, exportada de `web/lib/rag/documento.ts` y reutilizada tal cual, no
  reimplementada) para que un mismo elemento caiga en el mismo lugar relativo en los dos.
- **Riesgo aceptado, no resuelto:** `image-size` —dependencia transitiva de `pptxgenjs`— tiene una
  vulnerabilidad de denegación de servicio (`GHSA-w3rx-r6r6-pgpr`) sin versión corregida todavía en
  ninguna versión publicada. Se acepta para este piloto porque el generador sólo procesa fotografías
  que la propia aplicación subió como JPEG (nunca un archivo arbitrario de un tercero) — revisar antes
  de dar de alta a más especialistas o de ampliar qué archivos puede procesar este camino.

**Cómo se detectó y resolvió el problema de tiempo de ejecución.** La primera versión, verificada
contra el ciclo real de agosto (224 elementos activos, 141 registros y 445 fotografías ya capturadas
en ese momento), tardó más de diez minutos — muy por encima de cualquier límite razonable de una
función serverless. Se investigó por partes, no se aceptó el número tal cual:

1. Una plantilla creada sin `removeExistingSlides: true` conserva las 18 diapositivas de muestra de
   MASTER (guías de color, iconos, portadas) y las vuelve a escribir en cada `write()` junto con las
   generadas. Activar esa opción, sin tocar nada más, bajó una prueba sintética de 221 diapositivas de
   más de diez minutos a **3 segundos**.
2. Aun así, la corrida real seguía tardando varios minutos. Instrumentar el tiempo por sistema mostró
   que no era proporcional ni a la cantidad de elementos ni a la de puntos de revisión, sino que
   coincidía con los dos sistemas de captura directa —los únicos con fotografías y registros reales
   capturados hasta ese momento—: el tiempo restante es descarga de fotografías del depósito y
   composición del collage, trabajo real y proporcional a la evidencia ya levantada, no una falla.
3. El generador arma un `.pptx` **por sistema**, en una instancia de `pptx-automizer` propia para cada
   uno, y los combina al final en una pasada aparte que sólo clona diapositivas ya armadas (sin volver
   a llamar `slide.generate()`). Contra datos sintéticos sin fotografías, cinco tandas de tamaño real
   más la combinación final corrieron en su conjunto por debajo de los 15 segundos, así que cualquier
   comportamiento del lado de `pptx-automizer` que empeore con la cantidad de diapositivas acumuladas
   en una sola instancia queda acotado al tamaño de un sistema, no al ciclo completo. Las descargas de
   fotografías de un mismo elemento, antes secuenciales, pasaron a pedirse en paralelo.

**Consecuencias.** El tiempo de generación crece con la evidencia ya capturada, no con el tamaño del
catálogo — así que seguirá subiendo según avance el ciclo piloto. `web/app/(app)/informe/page.tsx`
fija `maxDuration = 300` como margen; si el ciclo completo con las fotografías de los 221 elementos
lo rebasa, hay que medirlo contra datos reales y, si hace falta, subir el límite (Vercel Pro con
Fluid Compute permite hasta 800s) o exponer el mismo armado por sistema como pasos separados en la
interfaz en vez de un solo botón para el ciclo entero.

**Alternativa descartada.** Copiar el patrón de `/rag` (HTML autocontenido + "Imprimir" del navegador,
ver D-16). Se descartó porque el documento es de otra naturaleza: `generar_collage()` maqueta
imágenes con cinco acomodos distintos según cantidad y orientación, algo que CSS de impresión no
resuelve sin escribir un motor de maquetación de imágenes propio —justo lo contrario del caso RAG,
donde una tabla con `<thead>/<tfoot>` resuelve la paginación de forma nativa—, y D-04 exige revisar el
resultado abierto en PowerPoint antes de entregarlo, no sólo poder verlo.
