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

**Estado:** vigente — revisada a fondo tras contrastarla con el entregable real (ver la revisión al
final de esta decisión)

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

### Revisión — el generador no reproducía el entregable real

Esta decisión se dio por terminada sin abrir jamás el resultado en PowerPoint. El propio README lo
anotaba como pendiente, y esa omisión escondía un defecto que ninguna comprobación automática podía
ver: **el texto salía invisible**. El layout `Elemento` hereda del master `bg2 → dk2 = #002733`, así
que el fondo es Deep Space Blue; el generador escribía todo el texto en `#002733`, el mismo color.
Cada diapositiva salía con el collage sobre azul oscuro y nada más. `tsc`, `eslint` y `next build`
pasaban limpios, y el conteo de diapositivas y de fotografías cuadraba — nada de eso mira un color
contra otro.

Al contrastarlo con el entregable aprobado (`Informe_Reporte_Marzo2026.pptx`, 220 diapositivas)
aparecieron más divergencias de fondo:

- **Otra plantilla.** El entregable real se arma sobre `Reporte sistemas.pptx`, que trae ocho
  diapositivas base —intro, portada, agenda y **cinco divisores de capítulo ya redactados** con su
  `– RAG 2.x`, en el mismo orden que `sistemas.orden`—. El generador usaba
  `Reporte sistemas - MASTER.pptx` y las descartaba todas. Las dos plantillas además **no son
  intercambiables**: la imagen mide 7.19" contra 6.67" y la columna de texto 5.13" contra 5.91", así
  que las coordenadas, medidas del MASTER, tampoco encajaban.
- **Pie de página de otro ciclo.** Clonaba la diapositiva 10 del MASTER, que es una muestra con el pie
  ya poblado: las 224 diapositivas salían con `KSU X` y la fecha `03.2026`. Las diapositivas de
  elemento del entregable real no llevan pie.
- **Colores fuera de marca.** `#E5484D` y `#E8E8E8` no existen en la paleta VW (son de Radix UI); el
  rojo de marca es `#DA0C1F` y el gris `#E5E9EB`. Y el relleno `#C2FE06` de las celdas "SI" rompía la
  regla crítica de la marca —Electric Neon nunca sobre fondo claro— aunque, por la ironía del fondo
  oscuro real, el color sí era el correcto y lo equivocado era suponer el fondo blanco.
- **Sin tipografía.** No declaraba ninguna `fontFace`, así que salía la de PptxGenJS en vez de
  `The Group HEAD Light` / `The Group TEXT`.

**Correcciones.** Se cambió a `Reporte sistemas.pptx`, con las coordenadas y la tipografía medidas del
entregable real; todo el texto pasa a claro sobre el fondo oscuro; los colores salen de la paleta; la
respuesta SI/NO/NA se pinta **como color de texto y no como relleno**, igual que ya lo hace el
documento RAG (`lib/rag/estilos.ts`), para que el mismo dato se vea igual en los dos entregables; y el
collage pasa de `cover` a `contain`, que recortaba ~6% del ancho.

**Un paso nuevo, y por qué.** `pptx-automizer` sólo sabe clonar diapositivas **que ya existen**
(`addSlide(plantilla, identificador)`); no puede crear una a partir de un layout. Y
`Reporte sistemas.pptx` no trae ninguna diapositiva de `Elemento`. Por eso
`scripts/preparar_plantilla_informe.py` produce `Plantilla_Informe.pptx`: la corporativa más una
novena diapositiva que sirve de molde. Es un paso reproducible y verificable, no un binario
aparecido de la nada.

**El armado por sistema se retiró.** La partición en un `.pptx` por sistema se había introducido
suponiendo que acumular diapositivas en una sola instancia era lo que disparaba el tiempo. Medirlo
mostró que no: 221 diapositivas en una instancia tardan unos tres segundos, y el costo real —dos
minutos y medio— es descargar las fotografías y componer los collages. A cambio, esa partición
introdujo un defecto sutil que sólo se vio al inspeccionar el `.pptx` generado: **el identificador de
`addSlide` es el número del archivo XML de la diapositiva, no su posición en el mazo**, y como
`removeExistingSlides` deja huérfanos los `slide1..9.xml` de la plantilla, pedir las diapositivas
`1..N` de un archivo de parte devolvía las de la plantilla — el informe salía con la portada repetida
seis veces y cuarenta elementos de menos. Al armar en una sola pasada, en el orden final, el problema
desaparece y el código queda más corto.

**Segunda pasada, ya con el archivo a la vista.** Abrirlo destapó dos cosas más que sólo se ven
mirando. La primera: la diapositiva molde conservaba los **placeholders del layout con su texto de
ejemplo dentro** —"Título en Deep Space Blue", "Click para editar el texto"—, que no es un texto guía
sino contenido real, y salía impreso debajo de lo que dibuja el generador. `preparar_plantilla_informe.py`
ahora los retira: como el generador dibuja todo por su cuenta, no hacen falta para nada; el fondo, el
logo y los adornos vienen del layout, no de ellos. La segunda: los bloques se calculaban unos a partir
de otros —la tabla arrancaba debajo de un texto de largo variable, estimando su altura por conteo de
caracteres— así que con un comentario largo se encimaban.

**El acomodo pasa a posiciones fijas.** Tres bloques, cada uno con su subtítulo en el estilo de la
plantilla: *Tabla de características* justo bajo el título, *Observaciones* en medio y *Datos del
sistema* anclado al margen inferior. Que el bloque de datos traiga **siempre los mismos siete
renglones**, con una raya donde falte el dato, es lo que permite anclarlo abajo con altura conocida;
y que las observaciones se encojan (`fit: "shrink"`) en vez de crecer es lo que impide que un
comentario largo vuelva a invadir lo de abajo. Nada se calcula a partir del largo de otra cosa.

**Lo que hay que sostener.** Verificar este generador significa abrir el archivo en PowerPoint. El
conteo de diapositivas, `tsc` y el build no detectan un texto invisible, un pie de otro ciclo, una
portada repetida ni dos bloques encimados — los cuatro defectos aparecieron mirando el resultado, no
compilando.

**Tercera pasada: informes parciales, y un divisor calculado por posición que dejó de serlo.**
`generarInformePptx` ahora acepta una lista opcional de claves de sistema
(`sistemasClaves`) para generar sólo el capítulo de uno o varios sistemas en vez del ciclo completo —
el botón de `/informe` deja elegir cuáles con una casilla por sistema, todas marcadas por defecto. La
intro, la portada y la agenda se agregan igual; lo que cambia es qué divisores y qué diapositivas de
elemento entran.

Escribir esto expuso un defecto que la sección anterior había dejado agazapado: qué divisor le tocaba
a cada sistema se calculaba por su **posición** en `sistemas.orden` (`PRIMER_DIVISOR + índice`), bajo
el supuesto de que siempre serían los mismos cinco sistemas en el mismo orden en que se redactaron los
divisores de la plantilla. Verificando el informe completo contra la base real apareció un sexto
sistema, `central_avisos`, dado de alta desde Configuración con `orden=0` — uso real de la pantalla que
se construyó para eso, no un caso de prueba armado a propósito. Con seis sistemas, la posición 0 ya no
era "Botones avisadores" sino "Central de avisos", y el cálculo por índice le habría puesto el divisor
de otro capítulo. `geo.DIVISOR_POR_SISTEMA` reemplaza el índice por un mapa explícito de **clave de
sistema → número de diapositiva**, así que un sistema nuevo simplemente no tiene entrada ahí y entra
sin capítulo propio —tal como ya se pretendía, sólo que mal calculado— en vez de correr el índice de
todos los que le siguen.

**Lo que hay que sostener, de nuevo.** El primer intento de esta corrección ya había sido probado
—`tsc`, `eslint`, y una corrida completa contra el ciclo real— y pasó todo limpio con el defecto
adentro: nada de eso mira si el título de un divisor corresponde al capítulo que en verdad sigue. Sólo
inspeccionar el XML del `.pptx` generado, diapositiva por diapositiva, lo mostró.

**Cuarta pasada: de cinco sistemas fijos a de 2 a 10, sin editar la plantilla cada mes.**
`DIVISOR_POR_SISTEMA` resolvía el defecto anterior, pero seguía dejando **sin capítulo propio** a
cualquier sistema fuera de los cinco originales — aceptable cuando `central_avisos` era la única
excepción, pero no cuando la planta trabaja con entre 2 y 10 sistemas según el mes, cada uno con
derecho a su propio divisor y a aparecer en la agenda.

- **El divisor pasó de cinco copias a un solo molde.** Las cinco diapositivas de divisor
  (`Reporte sistemas.pptx`, posiciones 4 a 8) resultaron ser estructuralmente idénticas — mismos
  nombres de forma, misma posición; sólo cambian el número grande y el título. `DIVISOR_POR_SISTEMA`
  desapareció: ahora se clona una sola vez la de la posición 4 (`geo.SLIDE_MOLDE_DIVISOR`) por cada
  sistema que sí tenga elementos, numerada en el orden en que aparece, con
  `` `${sistema.nombre} – ${sistema.rag}` `` como título (sin el sufijo si el sistema no tiene `rag`).
  Las otras cuatro copias no se referencian nunca y `removeExistingSlides` las descarta solas — el
  mismo mecanismo que ya limpiaba las diapositivas de un divisor no usado en el informe parcial.
- **La agenda sí necesitó tocar la plantilla.** Es una rejilla fija de 5 casillas (número + nombre),
  con el nombre de los cinco sistemas escrito a mano — el generador nunca la tocaba. Diez sistemas no
  caben en cinco casillas, y redibujarla con `pptxgenjs` en vez de reutilizar la forma real arriesgaba
  no replicar el círculo, el color y la tipografía exactos de la plantilla corporativa. En vez de eso,
  `scripts/preparar_plantilla_informe.py` ahora también **amplía la rejilla a 10 casillas duplicando
  el XML de las 5 originales tal cual** (mismo mecanismo que ya usaba para el molde de `Elemento`:
  extender la plantilla generada, nunca la corporativa), y les da nombre único
  (`"Agenda Numero N"` / `"Agenda Nombre N"`) — las 5 originales de la plantilla repetían el mismo
  nombre en las cinco, así que no había manera de direccionarlas una por una.
- **Encontrado al probar, no al escribir el código:** vaciar el texto de las casillas nuevas en el
  script de preparación (`shape.text_frame.text = ""`) parecía la limpieza obvia — pero python-pptx
  vacía un párrafo quitándole también su `<a:r>` (la corrida de texto), y sin una corrida existente
  `modifyElement` de pptx-automizer no tiene qué reemplazar: es el mismo problema de los placeholders
  vacíos de la primera pasada de esta decisión, sólo que en las casillas de la agenda en vez de en
  `Elemento`. `tsc`, `eslint` y la generación completa contra la base real no lo detectaron — el
  archivo se generaba sin error, con las diez casillas en blanco. Sólo inspeccionar el XML del
  `.pptx` resultante lo mostró. La corrección fue dejar el texto de ejemplo de la plantilla corporativa
  tal cual en las casillas nuevas: el generador llena las diez en cada corrida —usadas o no—, así que
  ese texto nunca sobrevive a un informe real.
- **Techo, no diseño abierto.** `geo.AGENDA_MAX_SISTEMAS = 10` es literal, no un valor de
  configuración: son las casillas físicas que trae la plantilla. Un informe con más sistemas
  seleccionados que ese techo falla con un mensaje claro en vez de generar una agenda incompleta —
  volver a ampliar la rejilla exigiría repetir el mismo procedimiento de duplicar XML con más filas o
  columnas.

Verificado con la base real (seis sistemas activos, incluido `central_avisos`, con `rag = "RAG 2.19"`)
y con un informe parcial de dos sistemas: agenda y divisores coinciden en número y título, las
casillas sin usar quedan vacías, y ningún divisor le pisa el capítulo a otro.

---

## D-18 · Catálogo único de zonas y diccionario de tipos por sistema

**Estado:** vigente

**Contexto.** Verificado contra el ciclo real (228 elementos): `elementos.zona` y `elementos.seccion`
eran la misma cadena en hidrantes exteriores y en válvulas subterráneas, y en botones avisadores la
forma larga y la corta de la misma partición — se estaba tecleando el mismo dato dos veces.
`elementos.orden_seccion` (D-15) estaba en cero en los 228: nunca se llegó a usar, y su regla —"gana
el primer valor no nulo del grupo"— era necesaria sólo porque el orden vivía copiado en cada elemento
en vez de una vez por zona. `elementos.tipo` es texto libre que ninguna pantalla mostraba ni ningún
documento imprimía; sus valores reales (`Gabinete`/`Pie` en hidrantes exteriores, `Mariposa`/`Vástago`
en válvulas subterráneas) ya estaban descritos como prosa en las instrucciones de esos dos formatos
("P = Pie, G = Gabinete"; "Mariposa … o Vástago …").

**Decisión.** Se agregó `zonas`, catálogo único de la planta —no cuelga del ciclo ni del sistema, para
que un elemento de hidrantes exteriores y uno de válvulas subterráneas puedan compartir zona cuando
están co-ubicados— con `nombre` (forma corta, lo que imprime el RAG) y `descripcion` (contexto, sólo
en pantalla). `zonas.orden` sustituye a `orden_seccion`: el orden de las secciones pasa a ser propiedad
del catálogo, no de cada elemento. `elementos.zona_id` referencia esa tabla. Cada sistema gana
`tipos jsonb`, un diccionario `{clave, nombre}` (mismo criterio que `plantillas.puntos`, D-02:
configuración como datos, no como estructura del programa); `elementos.tipo` pasa a guardar la clave,
no el nombre completo.

La migración (`0007_catalogos.sql`) sembró 17 zonas leyendo la forma corta ya capturada
(`seccion` si existía, si no `zona`) y **no fusionó** zonas de sistemas distintos con nombres
parecidos (p. ej. "Calle 1" en hidrantes exteriores contra "Calle 1 · Seccionamiento" en válvulas
subterráneas): decidir si de verdad son el mismo lugar físico es criterio del área, no algo que una
migración deba adivinar — se deja para la pantalla de Zonas. Los 91 elementos de hidrantes interiores
y válvulas aéreas, sin `zona`/`seccion` capturada, quedaron con `zona_id` nulo. `zona`, `seccion` y
`orden_seccion` no se borraron — ver la nota sobre la cadena de migraciones más abajo.

**Por qué se revierte el criterio de D-15.** D-15 había considerado y descartado reutilizar `zona`
para esto mismo, con el argumento de que atarían la agrupación del documento a un campo que sirve
para otra cosa. La razón dejó de aplicar: `zona` y `seccion` demostraron ser el mismo dato en la
práctica, no dos cosas que coincidieran por accidente, así que ya no hay "otro campo" del que
depender — hay un catálogo propio (`zonas`), que es lo que D-15 pedía desde el principio.

**Incidente durante esta migración, y por qué queda documentado.** Antes de sembrar `zonas` se
confirmó que la base real ya traía `seccion` para los 54 avisadores y `zona`/`seccion` para los 33
hidrantes exteriores — datos que no estaban en `supabase/seed/catalogo_2026-08.json` (el archivo
versionado, último commit al momento de esta migración). Alguien los había cargado directo a la base
—a mano en `/catalogo`, o con un proceso que nunca se exportó de vuelta al JSON— sin dejar rastro en
el repositorio. Al probar la actualización de `scripts/cargar_catalogo.py` para esta misma migración,
correr `--confirmar` sobre ese archivo desactualizado **revirtió esos 89 elementos a `null`**: el
script siempre ha sobrescrito todos los campos sin distinguir qué cambió desde la última exportación.
La causa raíz no es la migración —`0007_catalogos.sql` sembró correctamente con los datos que tenía
enfrente en ese momento—, es que `cargar_catalogo.py --confirmar` nunca fue seguro de correr dos veces
sobre un catálogo que ya se editó fuera del propio archivo. Ahora lleva una advertencia explícita en
su docstring. Los 89 `zona_id` se volvieron a resolver una vez recuperado el dato original.

**Consecuencias.** A cambio de sembrar sin fusionar, quedó trabajo de curación que ningún script podía
inventar: los 175 elementos sin zona (89 revertidos por el incidente más 91 que nunca la tuvieron) se
llenaron a mano, en un Excel exportado para el área con hoja de referencia de las zonas ya sembradas
—`web/scripts` no genera este archivo, se armó una sola vez para esta recuperación. Al llenarlo se
encontraron inconsistencias reales, no errores de captura: los 54 botones avisadores quedaron
reclasificados de la partición original de tres zonas (Zona 1/2/3-4, que el extractor había inferido
por corte de página del PDF — ver `scripts/extraer_rags.py`) a cinco zonas más finas y ya reales
(Nave 01, Nave 90, Oficinas, Pent house, Exterior); `cuarto-bombas` se renombró de "Cuarto de bombas
contra incendio" a "Cuarto de bombas", el nombre que de verdad usa el área. Zona 1/2/3-4 quedaron sin
ningún elemento y se marcaron `activo = false` — no se borran, D-15 documenta que la partición original
era una inferencia del extractor, no un dato capturado. Con eso, los 221 elementos activos del ciclo
tienen `zona_id`. La agrupación del documento y la del informe fotográfico (D-17) dependen ahora de
una sola fuente de verdad, editable desde la aplicación en vez de tecleada dos veces por sistema.

**Deuda que sigue sin resolver.** La cadena de migraciones de este repositorio no corre sobre una
base limpia: `0005_rag.sql`, tal como está en el repo, ya tiene la forma *posterior* a
`0006_ajuste_formatos.sql` (crea `formatos.documento_referencia`/`revision` directamente, nunca crea
`encabezado`/`cierre`), así que sobre un proyecto nuevo la `0006` fallaría tres veces. Hoy la única
fuente de verdad del esquema es la base real, no el repositorio — un respaldo del código no alcanza
para reconstruirla. Se decidió no resolverlo en esta migración; queda anotado para cuando se retome.

---

## D-19 · Fuente única de las columnas del documento RAG

**Estado:** vigente

**Contexto.** La lista de columnas del documento no existía como constante: estaba repartida a mano
en cinco lugares de `render.ts` (anchos en milímetros, `totalCols = 4 + puntos.length + 1`, el
`<colgroup>`, la fila de `<th>` y los `<td>` de cada renglón). D-15 ya documenta el defecto que
produce cuando esos cinco conteos se desincronizan: con dos sub-columnas por punto, `totalCols` se
quedaba corto y todo lo de ancho completo —logo, título, instrucciones, franjas de sección y pie— se
cortaba a dos tercios de la hoja. Se pidió que Ubicación y Referencia fueran opcionales por formato
(verificado que en hidrantes exteriores `ubicacion` está capturada en 0 de 33 elementos: la columna
ocupaba 18mm sin contenido) y que Tipo apareciera sólo en los sistemas con diccionario. Hacerlo
condicional sobre los cinco lugares sueltos habría hecho casi seguro que volvieran a desincronizarse.

**Decisión.** `web/lib/rag/columnas.ts` es la única función que decide qué columnas lleva un
documento, en qué orden y con qué ancho — `columnasDe(doc)`. `render.ts` deriva sus cinco usos de esa
misma lista; `totalCols` pasa a ser literalmente `columnas.length`, así que los conteos coinciden por
construcción, no por disciplina del que edite el archivo después. `RenglonRAG` ganó un campo `tipo`
(la clave del diccionario, ya corta) y `Formato` ganó `columnas: {ubicacion, referencia}`;
`web/scripts/verificar-rag.ts` arma varios documentos de prueba —incluida la combinación real de RAG
2.2 (sin ubicación, con referencia y con tipo)— y comprueba que `columnasDe().length`, el `<colgroup>`,
los `<th>` y los `<td>` de cada renglón den siempre el mismo número; también confirma, al poder
importar `lib/rag/*` desde un script suelto de Node, que la pureza que pide D-16 se conserva.

**Consecuencias.** Agregar o quitar una columna fija implica un solo cambio, en un solo archivo. El
costo es indirecto: `elementos.tipo` sólo se imprime cuando `sistemas.tipos` no está vacío, así que un
sistema sin diccionario puede tener datos en `tipo` que ningún documento muestra — es intencional
(D-18: botones avisadores queda sin diccionario porque sus 54 elementos comparten el mismo valor), no
un dato perdido.

**Alternativa descartada.** Mantener las cinco listas sueltas y sólo agregar los `if` necesarios para
las columnas condicionales. Se descartó de entrada: es exactamente la forma en que el defecto de D-15
apareció la primera vez, y agregar más condiciones a cinco copias en vez de una sola fuente aumenta,
no reduce, la probabilidad de que un cambio futuro las desincronice otra vez.

---

## D-20 · El orden de recorrido se calcula; el anclaje manual es la excepción

**Estado:** vigente

**Contexto.** `elementos.orden` era, hasta ahora, la única señal de orden: un contador `1..N` fijado
al extraer los RAG originales, editable sólo exportando el catálogo a JSON, cambiando el número a
mano y reimportando. No reflejaba nada del mundo físico —dos hidrantes contiguos podían tener
cualquier `orden` relativo—, así que el recorrido de captura, el documento RAG y el informe
fotográfico no tenían ninguna garantía de presentar los elementos en el mismo orden entre sí, ni un
orden que ayudara de verdad a alguien caminando la planta.

**Decisión.** El orden por defecto se calcula: dentro de cada zona, por `ubicacion` (alfabético
natural — `localeCompare` con `numeric: true`, para que "H-2" preceda a "H-10") y, en empate o si
falta, por `nombre`; las ubicaciones vacías van al final. Un elemento con `elementos.orden_anclado`
no nulo se saca de esa regla: los anclados van primero dentro de su zona, ordenados entre ellos por su
propio valor, y el resto los sigue con el criterio calculado — una prioridad, no una posición
intercalada entre huecos, que habría exigido definir qué pasa cuando dos anclajes compiten por el
mismo lugar o cuando el anclaje excede el tamaño de la lista; ningún elemento tiene todavía
`orden_anclado` fijado, así que no había un caso real que forzara resolver esa complejidad ahora.
`web/lib/orden.ts` implementa la regla una sola vez (`compararElementos`, `ordenarDentroDeZona`,
`compararZonas`) — sin dependencias de Next ni de Supabase, mismo criterio que `lib/estado.ts` y
`lib/rag/*` — y la usan tanto el documento RAG como el informe fotográfico (D-17), para que un mismo
elemento aparezca en el mismo lugar relativo en los dos.

**Consecuencias.** En hidrantes exteriores y válvulas subterráneas, donde `ubicacion` no está
capturada para ningún elemento (0 de 33 y 0 de 50 respectivamente, verificado), el orden calculado cae
directo al desempate por `nombre` — correcto, pero conviene saberlo antes de ver la lista reordenada
por primera vez. `elementos.orden` deja de decidir el recorrido; queda en el esquema sin usarse, igual
que `zona`/`seccion`/`orden_seccion` (D-18) — no se borra en esta migración.

**Actualización (D-21).** El anclaje ya tiene control — "Posición fija" en el editor de elementos de
`/sistemas/[clave]`. Lo que sigue pendiente es usar `lib/orden.ts` en las consultas de captura
(`lib/datos.ts`, "guardar y siguiente" de `/capturar`): hoy sólo lo usan el documento RAG y el informe
fotográfico (D-17); el recorrido de captura sigue por `elementos.orden`. Se dejó fuera de la
reorganización de pantallas a propósito — toca un flujo que el área usa todos los días, y cambiar su
orden de recorrido merece su propia verificación de campo, no venir de paso dentro de un cambio más
grande.

---

## D-21 · De seis entradas a tres, y todo lo configurable dentro de la aplicación

**Estado:** vigente

**Contexto.** El inicio era un menú de seis tarjetas del mismo peso visual, sin distinguir entre lo
que se usa a diario (Capturar) y lo que se usa una vez al mes (Informe). El encabezado tenía un único
elemento interactivo —cerrar sesión— así que cinco de las once rutas no tenían ninguna forma de volver
al inicio salvo el botón atrás del navegador. El "sistema" es la unidad natural de trabajo y estaba
partido en tres pantallas sin enlace entre sí (`/capturar/[sistema]`, `/catalogo/[sistema]`,
`/rag/[formato]`), pese a que la relación ya existía en datos (`formatos.sistema_id`); editar la
plantilla de un sistema no tenía forma de llevar a ver cómo quedaba su documento RAG, ni al revés.
`ciclos.config` y la tabla `sistemas` no tenían ninguna pantalla de edición: la política de RLS ya lo
permitía (`0003_rls.sql`), sólo faltaba construirla — `config` sólo se escribía una vez, en el `insert`
inicial de `cargar_catalogo.py`, y quedaba inmutable el resto del ciclo.

**Decisión.**

- **El inicio pasa a ser el tablero.** Antes vivía en `/tablero`; ahora es `/`, la pantalla de trabajo
  del día a día en vez de un menú.
- **`/catalogo/[sistema]` y `/rag/[formato]` se fusionan en `/sistemas/[clave]`**: elementos, plantilla,
  formato y documento RAG de un mismo sistema, en una sola pantalla. El parámetro de ruta ya era la
  clave del sistema en el primer caso; en el segundo hay que resolver formato → sistema, y un formato
  sin sistema asociado no tiene pantalla propia (queda accesible sólo desde Configuración).
- **`/catalogo` y `/rag` (los índices) se fusionan en `/configuracion`**: Ciclo, Sistemas, Zonas e
  Importar/exportar, en pestañas de una sola pantalla. Es la primera vez que `ciclos.config` y
  `sistemas` se pueden editar desde la aplicación — antes exigían Python o el panel de Supabase
  directamente.
- **Barra de navegación real** en el encabezado (`web/components/NavBar.tsx`): Tablero, Capturar,
  Recepción, Configuración — resalta la ruta activa. `/informe` se conserva como pantalla aparte
  —se genera una vez al mes, no todos los días— y se alcanza con un enlace desde el tablero.
- **Redirecciones** en las cinco rutas viejas (`/catalogo`, `/catalogo/[sistema]`, `/rag`,
  `/rag/[formato]`, `/tablero`), para que un enlace guardado o un marcador no rompan.

**Componentes compartidos primero.** Antes de mover pantallas se extrajeron a `web/components/` los
patrones que estaban copiados a mano: `Aviso` (banner de error/ámbar/éxito, 8 copias literales),
`PanelVistaPrevia`/`PanelExito` (la máquina "vista previa → confirmar → aplicado", 5 copias),
`SinCiclo` (5 copias), `Campo`/`CampoTexto`/`CampoSelect` (4 variantes) y `BuscadorLista` (3 copias).
Reorganizar pantallas sin extraerlos primero habría multiplicado las copias en vez de reducirlas.

**Alcance deliberadamente acotado.** "Un solo bloque" para importar/exportar (RF-24) se cumple en el
sentido de ubicación —un solo lugar en la pantalla— pero no se rediseñó el formato de intercambio: el
catálogo y los formatos se siguen importando por separado, reutilizando tal cual la conciliación ya
probada de D-14 (por sistema y código) y la de formatos (por clave). Diseñar un solo archivo que cubra
config + zonas + sistemas + catálogo + plantillas + formatos a la vez habría exigido versionar un
formato de intercambio nuevo bajo el mismo cambio que ya movía la mitad de las pantallas de la
aplicación — se dejó fuera. Zonas y sistemas no tienen importación propia: al ser catálogos chicos
(17 zonas, 5 sistemas) y ya editables uno por uno en pantalla, sólo llevan exportación de respaldo.
**Abrir un ciclo nuevo** (Flujo 1: clonar el catálogo del ciclo anterior) tampoco se construyó — sigue
siendo `cargar_catalogo.py`; es una operación de una vez al mes, bastante más compleja que editar un
ciclo ya abierto, y no bloqueaba nada de lo demás.

**Consecuencias.** Ocho archivos de pantalla se dieron de baja (`catalogo/{page,CatalogoIndex,actions}.tsx`,
`catalogo/[sistema]/{page,actions,PlantillaEditor,ElementosCatalogo}.tsx`, `rag/{page,actions,RagIndex}.tsx`,
`rag/[formato]/{page,FormatoEditor,VisorRAG}.tsx`, `tablero/{page,Tablero}.tsx`) y se reemplazaron por
cinco (`sistemas/[clave]/{page,actions,PlantillaEditor,ElementosCatalogo,FormatoEditor,VisorRAG}.tsx`,
`configuracion/{page,actions,Configuracion,PanelCiclo,PanelSistemas,PanelZonas,PanelImportarExportar}.tsx`,
más `page.tsx`/`Tablero.tsx` en la raíz de `(app)`) — más archivos porque cada uno quedó más chico y
enfocado, no menos. `ElementosCatalogo.tsx` cambió de fondo, no sólo de lugar: `zona`/`seccion` como
texto libre se sustituyeron por un selector sobre el catálogo de zonas (D-18), y `tipo` por un selector
sobre el diccionario del sistema — ya no se puede escribir una zona o un tipo que no exista en el
catálogo correspondiente.

## D-22 · Un segundo tipo de documento ("checklist"), y /rag vuelve a existir

**Estado:** vigente

**Contexto.** El usuario compartió un formato de VW que el sistema no soporta hoy: una lista de
verificación diaria de una unidad (ambulancia A-01, RAG 4.1), llenada a mano en papel por especialistas
en turno. No recorre un catálogo de elementos ni pasa por el flujo de captura fotográfica — se imprime
en blanco y punto. Habrá más unidades. Estructuralmente es distinto de los cinco RAG mensuales: ahí una
fila es un elemento de catálogo y una columna es un punto de revisión de una plantilla compartida, con
un único bloque de cierre al final del documento; aquí una fila es un ítem propio del documento (sin
relación a `elementos`/`sistemas`/`plantillas`), una columna es una fecha de revisión repetida con
Fecha+Grupo en el encabezado y Nombre+Firma en el pie — el cierre se repite POR COLUMNA, no una sola vez
al final. El esquema ya anticipaba esto sin usarlo: `formatos.periodicidad` no está atada a `'mensual'`
y `formatos.sistema_id` ya es nullable ("formatos que no recorren catálogo, por evento" —
docs/modelo-de-datos.md); y el comentario de `CierreFormato.repetir` en `web/lib/rag/tipos.ts` dice
literalmente "para que un formato de otra periodicidad lo pueda resolver distinto más adelante".

D-21 decomisionó `/rag` y `/rag/[formato]` a redirecciones porque, en ese momento, todo formato RAG
colgaba de un sistema — "un formato sin sistema asociado no tiene pantalla propia: se administra desde
Configuración" dejó de ser cierto en cuanto un tipo de documento entero no tiene sistema asociado nunca.

**Decisión.**

- **`web/lib/checklist/` es un módulo hermano de `web/lib/rag/`, no una extensión de `DocumentoRAG`.**
  Forzar el checklist dentro de `RenglonRAG`/`CierreFormato` habría hecho mentir a `elementoId` (no hay
  elemento) y habría obligado a `CierreFormato` a ganar un modo "por columna" que ningún RAG usa nunca —
  exactamente el tipo de divergencia condicional que D-19 documenta haber eliminado una vez.
- **Lo que SÍ es idéntico entre los dos motores** (clasificación, razón social, domicilio, logo, paleta
  de color, mecánica genérica de `<table>`) se factoriza a `web/lib/documentos/` — `constantes.ts` y
  `estilos-base.ts`. `web/lib/rag/constantes.ts` reexporta desde ahí sin romper sus imports. La CSS
  completa de RAG (`web/lib/rag/estilos.ts`) NO se reescribió para consumir la base compartida: hacerlo
  exigía también renombrar las clases que emite `web/lib/rag/render.ts`, y tocar ese render.ts —ya
  verificado, en producción— sólo para des-duplicar CSS no valía el riesgo. La duplicación que queda es
  la de "RAG ya traía su propia hoja completa antes de que existiera un segundo tipo de documento", no
  la que D-22 se proponía evitar hacia adelante.
- **`formatos` gana `tipo_documento` (`'rag' | 'checklist'`, default `'rag'`)** — decide qué motor arma
  el documento. Dos tablas nuevas, `checklist_bloques` y `checklist_items` (migración
  `0008_checklist.sql`), guardan el contenido propio de un checklist. `categoria` en `checklist_items`
  es texto libre, NO fk a `zonas`: zonas es a propósito un catálogo único de planta (D-18) pensado para
  que elementos de SISTEMAS distintos compartan ubicación física — las categorías de un checklist
  ("EQUIPO MEDICO", "BOTIQUIN DE AMBULANCIA") son propias de ese checklist y no necesitan ese catálogo
  compartido. `pos` es texto sin restricción de unicidad (el PDF de origen trae Pos duplicados reales:
  "63" se repite 6 veces); `orden` es lo único que decide el renderizado — mismo patrón que
  `elementos.codigo` (identidad) contra `elementos.orden` (render).
- **Las columnas de fecha no se guardan.** Se derivan de los días del mes del ciclo abierto al generar
  (`new Date(anio, mes, 0).getDate()`, con 31 de respaldo si no hay ciclo) — las celdas quedan en blanco
  para llenarse a mano, nunca con una fecha real preimpresa, igual que el papel de origen.
- **Orientación apaisada, pedido explícito del usuario** — única diferencia real de `@page` frente a
  RAG (`size: letter landscape` contra `portrait`). Como puede haber hasta 31 columnas de fecha, más de
  las que caben en una hoja, cada bloque de tabla se reparte en VARIAS `<table>` independientes (una por
  grupo de columnas que sí cabe, `rebanarColumnasFecha()` en `columnas.ts`), cada una con su propio
  thead/tfoot completo y `page-break-before` entre ellas — mismo mecanismo nativo de repetición que D-16
  documenta para RAG, aplicado varias veces en vez de una.
- **Sin tabla de "capturas".** Este tipo de documento se imprime en blanco y punto; no tiene equivalente
  a `registros`/`valores`. Si algún día se pide captura digital de un checklist, es una decisión nueva y
  separada — mismo criterio de alcance acotado que D-12.
- **`/rag` deja de redirigir.** Pasa a ser la pestaña independiente que pidió el usuario: "Ver e
  imprimir" lista TODOS los formatos (un RAG con sistema enlaza a `/sistemas/[clave]`, preservando lo
  que D-21 ganó; un checklist enlaza a `/rag/[formato]`, resuelto aquí mismo); "Construir tipo nuevo"
  queda como marcador de posición hasta la Etapa 3 del plan de ampliación de RAGs (el constructor sin
  código y el importador de JSON). `web/components/NavBar.tsx` gana la entrada "RAG".
- **La lógica de impresión por iframe oculto se generaliza** de `sistemas/[clave]/VisorRAG.tsx` a
  `web/components/VisorDocumento.tsx` (prop `soloVacio` para el checklist, que nunca alterna
  Vacío/Lleno). `VisorRAG.tsx` queda como envoltorio delgado sobre el componente compartido, para no
  tocar el import que ya usa `sistemas/[clave]/page.tsx`.

**Verificación.** `web/scripts/verificar-checklist.ts` (mismo patrón que `verificar-rag.ts`): confirma
que `lib/checklist/*` es puro (importable desde Node suelto) y que, en cada `<table>` que arma
`render.ts`, el colgroup, el `<th>` del encabezado principal y los `colspan` usados coinciden entre sí —
agravado aquí porque un solo bloque puede repartirse en varias tablas, así que hay que comprobarlo en
cada una, no sólo en la primera — y que las columnas de fecha repartidas entre todas las tablas de un
bloque suman exactamente los días pedidos. `verificar-rag.ts` se corrió de nuevo sin cambios de
comportamiento, confirmando que mover las constantes compartidas no alteró los cinco RAG existentes.

**Revisión (agrupación configurable por categoría y ubicación física).** Mientras se seguía trabajando
el Excel de la ambulancia (Etapa 1 del plan de ampliación de RAGs), apareció una columna nueva,
`ubicacion_fisica` — independiente de `categoria`, y ambas debían mostrarse como sección agrupada en el
documento impreso. Es, de hecho, la respuesta directa a un requisito original ("secciones habilitadas
para identificar correctamente dónde encontrar los elementos") que había quedado resuelto sólo a medias
en la primera pasada (sólo se agrupaba por `categoria`). El orden de anidado (ubicación física por
fuera, categoría por dentro, en el caso de la ambulancia) se dejó **configurable por bloque**, no fijo
en código — un checklist futuro podría necesitarlo invertido, a un solo nivel, o sin agrupar — porque
el usuario lo pidió explícitamente así.

Migración `0009_checklist_agrupacion.sql`: `checklist_items` gana `ubicacion_fisica text`;
`checklist_bloques` gana `agrupacion jsonb` (arreglo de 0 a 2 elementos de
`{"categoria","ubicacion_fisica"}`, default `["ubicacion_fisica","categoria"]`) — vive en el bloque, no
en el formato, porque distintos bloques del mismo checklist pueden necesitar un orden distinto (p. ej.
"Equipo" agrupado y "Mecánico" plano). `CategoriaChecklist { nombre, items }` en
`web/lib/checklist/tipos.ts` se generalizó a un nodo recursivo `GrupoChecklist { nombre, items,
subgrupos }` de hasta 2 niveles — un nodo hoja trae `items`, un nodo con un nivel más debajo trae
`subgrupos`; `agrupacion=[]` produce un único nodo raíz sin `nombre` (sin banner, plano). `documento.ts`
gana `agruparItems()` (reemplaza a `agruparPorCategoria()`): genérica sobre 0, 1 o 2 niveles según el
arreglo del bloque, no hardcodea qué campo va primero. `render.ts` gana `renderizarGrupos()`, recorrido
recursivo con dos clases CSS distintas — `.chk-categoria` (verde vívido) para el banner externo,
`.chk-subgrupo` (gris claro, `--vw-dsb-20`) para el interno, para que se lea subordinado sin competir.

Verificado con dos casos nuevos en `verificar-checklist.ts` (2 niveles y 0 niveles) y en vivo contra el
proyecto remoto: banner externo con los valores de `ubicacion_fisica` ("Cabina", "Compartimento
trasero"), banner interno con los de `categoria` ("RECURSOS FISICOS DE APOYO", "EQUIPO MEDICO") anidado
debajo de cada uno, y el bloque mecánico (`agrupacion=[]`) sin ningún banner — mismo resultado visual
que tenía antes de este cambio.

**Revisión (constructor de checklist e importación JSON — Etapa 3).** "Construir tipo nuevo" deja de
ser un marcador de posición: `web/app/(app)/rag/ConstructorChecklist.tsx` monta un editor de
identidad+bloques+ítems (mismo patrón add/quitar/reordenar con flechas que `PlantillaEditor.tsx`, no
drag&drop) y una sección de importación de un JSON ya armado, en la misma pantalla. Los dos caminos
terminan en las mismas dos funciones de `web/app/(app)/rag/actions.ts`:
`previsualizarChecklist()`/`confirmarChecklist()`, que reciben la forma `ChecklistImportado` (documentada
en docs/modelo-de-datos.md §3.5.5) sin que importe si esa forma la armó el formulario o vino de un
archivo.

- **Reemplazo completo por `clave`, no diff incremental** — a diferencia de `reconciliarCatalogo()` (que
  concilia elemento por elemento y sólo desactiva lo que ya no aparece), aquí `confirmarChecklist()`
  hace `upsert` del `formato` por `clave` y luego borra TODOS sus `checklist_bloques` (el `on delete
  cascade` de la migración 0008 se lleva los `checklist_items`) antes de volver a insertarlos completos.
  Un checklist es una estructura anidada de baja frecuencia de cambio; intentar calzar ítems viejos
  contra nuevos por identidad (¿por `pos`? ¿por `nombre`? ninguno es estable — el PDF de origen trae
  `pos` repetidos) habría sido más riesgo que beneficio. La consecuencia aceptada: reimportar borra y
  vuelve a crear los `id` de bloques e ítems en cada ocasión — no hay nada más, en este tipo de
  documento, que referencie esos `id` desde otra tabla (a diferencia de `elementos`, que si se borrara
  se llevaría `registros`/`fotos` con él).
- **Validación de forma sin librería de esquema** (ni zod ni similar en el repo) — mismo criterio que
  `reconciliarCatalogo()`/`reconciliarFormatos()` en `configuracion/actions.ts`: comprobaciones manuales
  que lanzan error para lo que impide guardar (falta `clave`, tipo de bloque desconocido, `agrupacion`
  con un campo repetido o fuera de `categoria`/`ubicacion_fisica`) y acumulan advertencia para lo que sí
  se puede guardar pero probablemente sea un descuido (un bloque de tabla sin ítems, más de un
  `portada_fotos` o `bitacora_libre` — `renderizarCuerpoChecklist()` sólo toma el primero de cada uno, un
  segundo se imprimiría como si no existiera).
- **La foto de referencia se sube antes de previsualizar, no al confirmar** — mismo patrón que
  `Formulario.tsx` (D-06): el navegador sube directo a `evidencias/checklist-ref/{clave}/{itemId}.{ext}`
  con la llave pública en cuanto se elige el archivo, y sólo la ruta ya subida viaja en el JSON. Exige
  que la "Clave" del formato ya esté escrita antes de subir una foto (si no, no hay prefijo de carpeta);
  el formulario lo señala en vez de subir a una carpeta temporal que luego habría que mover.
- **`periodicidad` deja de ser fija a `'mensual'` en la práctica** — el formulario y el JSON la traen
  como campo libre (default `"diario"`, el caso real de un checklist de unidad), sin ninguna validación
  de valores permitidos: sigue siendo texto libre en el esquema (ver docs/modelo-de-datos.md §2.8), la
  Etapa 3 sólo es la primera vez que algo distinto de `"mensual"` se escribe desde la aplicación en vez
  de por migración.

Verificado con `tsc --noEmit` y `eslint` limpios (el módulo de acciones y el constructor no forman parte
de `verificar-checklist.ts`, que sólo cubre `lib/checklist/*` puro) y en vivo contra el proyecto remoto:
una unidad ficticia (`RAG 9.9`) definida sólo desde la UI —tres bloques, agrupación de dos niveles en
"Equipo"— se guardó, apareció en "Ver e imprimir" y se imprimió en apaisado con el mismo motor que la
ambulancia (banners "Cabina"/"Compartimento trasero" por fuera, "RECURSOS FISICOS DE APOYO"/"EQUIPO
MEDICO" anidados por dentro, AÑO/MES, franja de pie). Reimportada la misma clave con un bloque distinto
(un solo ítem, "Guantes de nitrilo", sin agrupación), el documento impreso quedó únicamente con ese
ítem — sin rastro de "Cinturones de seguridad", "Camilla rígida", el bloque "Mecánico" ni "Bitácora" de
la primera versión, confirmando que el reemplazo por `clave` no deja bloques ni ítems huérfanos. Datos de
prueba retirados después con el mismo script desechable de la Etapa 2b. La subida de foto de referencia
(`subirFoto()` en `ConstructorChecklist.tsx`) se revisó por código —mismo patrón que `Formulario.tsx`,
mismo bucket y política RLS ya en producción— pero no se probó subiendo un archivo real en esta pasada;
importar el JSON real de la A-01 (Etapa 1), que sí trae fotos de referencia, es la primera oportunidad
real de ejercitarla.

## D-23 · Ciclo de vida de `formatos`: baja recuperable, borrado permanente y columnas de fecha explícitas

**Estado:** vigente

**Contexto.** Con dos tipos de formato conviviendo en `/rag` (D-22), el usuario pidió cuatro cosas
relacionadas: distinguir visualmente los RAG mensuales de los checklists en la lista; poder **editar**
un checklist ya guardado en el sitio, igual que ya se puede editar un RAG mensual desde
`/sistemas/[clave]` (antes sólo se podía crear uno nuevo o verlo impreso — nunca modificarlo); volver
**configurable por checklist** cuántas columnas de fecha imprime, en vez de derivarlas del ciclo abierto
en tiempo de solicitud (un dato que ni siquiera tiene sentido para un documento que no pertenece a
ningún ciclo); y un botón para **eliminar** cualquier formato, de cualquier tipo, con dos formas: baja
recuperable y borrado permanente. De regalo, también pidió poder dar de alta los RAG mensuales desde
esta misma pantalla — antes sólo se cargaban por importación masiva de JSON en Configuración.

**Decisión.**

- **`formatos` gana `activo boolean not null default true`** — mismo patrón que `elementos.activo`/
  `sistemas.activo`/`zonas.activo` (D-18): no borra nada, sólo saca la fila de las listas por defecto.
  Aplica a **ambos** tipos de formato por igual, con una sola acción compartida
  (`cambiarActivoFormato()`), y una sola UI compartida (`FormatosLista.tsx`, ver abajo) — evita duplicar
  la lógica una vez en `/sistemas/[clave]` y otra en `/rag/[formato]`.
- **`formatos` gana `columnas_fecha smallint not null default 31`** — antes `rag/[formato]/page.tsx`
  calculaba `new Date(ciclo.anio, ciclo.mes, 0).getDate()` con el ciclo ABIERTO ese día, atando un dato
  propio del documento a qué mes estuviera corriendo la captura en ese momento; dos checklists de
  distinta frecuencia no podían tener conteos distintos, y editar el checklist en un mes distinto al de
  su creación cambiaba silenciosamente cuántas columnas imprimía. Ahora es explícito, propio de cada
  formato, y se edita junto con el resto de su identidad en `ConstructorChecklist.tsx`. El default 31
  iguala el respaldo que ya usaba `DIAS_POR_DEFECTO`, así que aplicar la migración no cambia el
  documento impreso de ningún checklist ya cargado hasta que alguien lo edite explícitamente. Sin
  significado para `tipo_documento='rag'`.
- **Borrado permanente, primera vez que una fila de DEFINICIÓN se borra de verdad** — hasta ahora el
  único hard-delete real de la aplicación era `fotos` (una fila hoja de captura, con su objeto de
  Storage). Borrar un `formatos` es un tipo de operación distinto (borra una DEFINICIÓN, no una
  captura), así que exige una confirmación más pesada, construida con dos condiciones exigidas del lado
  del **servidor** en `eliminarFormatoPermanente()`, no sólo en la UI: (1) el formato debe estar de baja
  primero — la baja ES el paso de vista previa obligatorio de este borrado, no un botón aparte —, y (2)
  hay que teclear la `clave` exacta como confirmación. Es seguro por construcción: verificado contra las
  10 migraciones que **nada** referencia `formatos.id` salvo `checklist_bloques.formato_id` (cascada,
  migración 0008) — `elementos`/`plantillas`/`registros`/`fotos` cuelgan de `sistema_id`+`ciclo_id`, no
  de `formatos.id`, así que borrar un formato de cualquier tipo nunca rompe la captura de un sistema; el
  sistema se queda sin "documento" hasta que se le asigne uno nuevo, exactamente el estado que
  `/sistemas/[clave]/page.tsx` ya toleraba (`formato === null`) antes de esta característica. No limpia
  Storage (`checklist-ref/{clave}/…`) — mismo punto ciego que ya tiene `confirmarChecklist()` al
  reemplazar bloques, no se resuelve aquí.
- **Checklist editable en el sitio** — `ConstructorChecklist.tsx` gana un prop opcional `inicial` que,
  si está presente, siembra todo el formulario (identidad, columnas de fecha, bloques e ítems) desde un
  checklist ya guardado en vez de arrancar vacío; `rag/[formato]/page.tsx` lo renderiza arriba de la
  vista previa de impresión, misma composición sin pestañas ni asistente que ya usa `/sistemas/[clave]`
  (editor + vista previa, todo visible a la vez — D-21). La `clave` se bloquea al editar (mismo
  principio que `FormatoEditor.tsx`, "nunca edita clave") porque `confirmarChecklist()` hace
  upsert-por-clave + reemplazo completo: una clave distinta crearía una fila nueva y dejaría huérfana la
  que se está editando — el bloqueo aplica tanto al campo del formulario manual como a un JSON
  reimportado mientras se edita (se sobreescribe la clave del archivo con la del formato que se está
  editando, silenciosamente, antes de previsualizar).
- **Crear un RAG mensual desde `/rag`** — `ConstructorFormatoRag.tsx` (nuevo) es un formulario de
  identidad como el de `FormatoEditor.tsx` más un selector de `sistema_id` limitado a sistemas activos
  que todavía no tengan un RAG activo asociado (la app no impone esa restricción por esquema, sólo por
  código — un formato futuro con otra necesidad podría relajarla). Crear un sistema nuevo sigue siendo
  Configuración → Sistemas, fuera de alcance aquí. Sin `PanelVistaPrevia`: una alta de una sola fila no
  tiene nada que resumir — mismo criterio que `crearSistema()`/`crearZona()`/`crearElemento()`, ninguno
  usa vista previa.
- **"Ver e imprimir" gana sub-pestañas** ("Sistemas mensuales" / "Checklists") en vez de una sola lista
  con encabezados — pedido explícito del usuario. "Construir tipo nuevo" gana un selector de tipo (RAG
  mensual / Checklist) por el mismo motivo que ahora hay dos formularios de alta distintos.
- **`sistemas/[clave]/page.tsx` necesitó una corrección real, no sólo cosmética**: con `activo` pudiendo
  haber dos filas de `formatos` para el mismo sistema (una activa, una de baja), el `.find()` original
  podía devolver cualquiera de las dos según el orden de `clave`. Ahora prefiere explícitamente la
  activa y sólo cae a una inactiva si no hay ninguna activa —para poder reactivarla desde ahí—, con un
  aviso visible cuando el formato mostrado está de baja.

**Verificación.** `tsc --noEmit` y `eslint --max-warnings=0` limpios; `verificar-rag.ts` y
`verificar-checklist.ts` sin cambios de comportamiento (ninguno de los dos toca la base ni pasa por
`activo`/`columnas_fecha`, sólo por los tipos puros). Verificado en vivo contra el proyecto remoto con
datos sintéticos desechables (un sistema y sus formatos de prueba, borrados al terminar) y, para el modo
edición, releyendo el checklist real de la ambulancia A-01 sin guardar cambios:

- **Alta de RAG mensual**: creado desde `/rag → Construir tipo nuevo → RAG mensual` para un sistema de
  prueba sin formato — redirigió a `/sistemas/{clave}` con `PlantillaEditor`/`ElementosCatalogo` y el
  documento RAG en blanco, todo sin tocar los 6 formatos reales.
- **Edición de checklist existente**: `/rag/RAG-4.1` (el checklist real de la ambulancia, 141 ítems)
  abrió con `ConstructorChecklist` prellenado — identidad, 4 bloques, fotos de referencia con URL firmada
  incluidas — y la `Clave` deshabilitada; no se confirmó ningún cambio, sólo se verificó la carga
  completa y correcta de datos reales.
- **`columnas_fecha` configurable**: un checklist de prueba con `columnas_fecha=5` imprimió exactamente 5
  columnas de fecha (`document.querySelectorAll('.chk-celda-marca').length === 20` = 5 columnas × 4 filas
  que las repiten — encabezado, Fecha, Grupo, un renglón de ítem), contra las 31 por defecto de antes.
- **Baja/reactivación**: confirmado por la vía directa (la vía de UI depende de `window.confirm()`, que
  el entorno de automatización no puede aceptar) — un formato de cada tipo desaparece de la lista por
  defecto y reaparece con "Mostrar de baja"; `/sistemas/[clave]` de un RAG dado de baja muestra el aviso
  correspondiente y sigue permitiendo editar `FormatoEditor`.
- **Borrado permanente**: confirmado por la UI real en ambos tipos — "Eliminar permanentemente" sólo
  aparece dado de baja; clave incorrecta deja el botón deshabilitado; clave correcta borra la fila
  (confirmado por log de servidor: `eliminarFormatoPermanente(id, clave)`) y, para el checklist de
  prueba, sin dejar `checklist_bloques`/`checklist_items` huérfanos (cascada). Tras borrar el RAG de
  prueba, `/sistemas/{clave}` siguió cargando con el aviso "sin formato" — `elementos`/`plantillas` de
  ese sistema (vacíos, por ser de prueba) quedaron intactos, confirmando que el análisis de FK se
  sostiene. Estado final del proyecto: 7 formatos, todos activos (los 6 RAG mensuales + RAG 4.1), sin
  rastro de datos de prueba.

## D-24 · `numero` autocalculado reemplaza `pos`; banners y firma se repiten en cada página; portada con el mismo encabezado/pie

**Estado:** vigente

**Contexto.** Revisando `A01.pdf` (el checklist real de la ambulancia, RAG 4.1, 15 páginas) el usuario
encontró tres problemas de fondo, no cosméticos:

1. **"Pos." es un campo tecleado a mano**, heredado de transcribir el PDF de origen, y puede repetirse
   sin que nada lo impida — el checklist real ya trae duplicados intencionales de la transcripción
   ("63" aparece 6 veces, "74" dos). Aceptable como transcripción literal de un papel viejo, pero sin
   ninguna razón para pedirle al usuario que teclee (y arriesgue chocar) un número en un checklist que
   se arma desde cero.
2. **El banner de una sección no se repetía al cruzar una página**: "Consumibles médicos" ocupaba las
   páginas 2-6 completas de `A01.pdf`, pero el banner verde sólo aparecía en la página 2 — las
   continuaciones no decían a qué categoría pertenecían sus renglones. Mismo problema en RAG con el
   banner de zona.
3. **La portada de fotos de un checklist no llevaba el mismo encabezado/pie que el resto de las
   secciones** — sin "Generado…", sin AÑO/MES, sin Fecha/Grupo/Nombre/Firma.

**Decisión — Parte 1, `numero` reemplaza `pos`:**

- `ItemChecklist.pos: string | null` (tecleado) se reemplaza por `ItemChecklist.numero: number`
  (calculado). Mismo patrón que `RenglonRAG.id` (`web/lib/rag/documento.ts`), que ya resolvía este
  problema para los 5 RAG mensuales — el checklist simplemente no lo tenía. `agruparItems()`
  (`web/lib/checklist/documento.ts`) numera con un contador cerrado, **por bloque** (no global al
  documento, no reiniciado por categoría): "Equipo" numera de corrido 1..129 a través de sus categorías,
  "Mecánico" numera 1..24 aparte — igual que ya distinguía el PDF de origen.
- Aplica **retroactivamente a todos los checklists**, incluidos los ya importados — decisión explícita
  del usuario, confirmada al preguntar: el checklist real de la ambulancia pasa de imprimir "78, 86,
  88…" a "1, 2, 3…" la próxima vez que se genere, sin que nadie edite nada. No hay una versión "sólo
  para checklists nuevos" que preserve el campo viejo — sería mantener dos convenciones de numeración a
  la vez sin ninguna ventaja real.
- La columna se sigue llamando `"#"` (antes "Pos.") — mismo rótulo que ya usa RAG, para que ambos
  documentos hablen el mismo lenguaje visual. `checklist_items.pos` en la base y
  `ItemChecklistImportado.pos?` en `actions.ts` se conservan sin cambio (un JSON puede seguir trayendo
  `pos` por trazabilidad histórica de archivo) — simplemente ya nada lo lee para imprimir, y
  `ConstructorChecklist.tsx` deja de pedirlo en el formulario.

**Decisión — Parte 2, banners y firma repitiéndose en cada página:**

La causa raíz era la misma en los dos motores: el banner vivía como un `<tr>` cualquiera dentro de
`<tbody>`, y los navegadores sólo repiten nativamente `<thead>`/`<tfoot>` al paginar una tabla (D-16) —
nunca un renglón de en medio. La única forma de que un banner se repita de verdad, sin JS ni PDF de
servidor, es que viva en el `<thead>` de su propia tabla — lo que exige partir la tabla continua de hoy
en **una tabla por unidad repetible**: una por zona en RAG (`renderizarCuerpoRAG()`,
`web/lib/rag/render.ts`), una por "hoja" (categoría/ubicación física aplanada por la nueva
`hojasDeGrupos()`) dentro de cada bloque en checklist (`renderizarBloqueTabla()`,
`web/lib/checklist/render.ts`). El banner se mueve del `tbody` al `thead` de su tabla, sin cambiar su
HTML/CSS; el cierre (Nombre/Firma en checklist, Realizó/Coordinador en RAG) queda en el `tfoot`, como ya
estaba.

**La duda que se planteó y se resolvió con evidencia real, no con teoría.** Al diseñar esto se
consideró forzar un salto de página entre cada sección nueva, por seguridad — D-16 exige "cada hoja se
firma por separado", y partir en más tablas sin forzar saltos parecía arriesgar una página compartida
por dos secciones sin firma en medio. El usuario corrigió esta cautela con el propio `A01.pdf` como
evidencia: **hoy, sin ningún salto forzado entre categorías**, la firma ya aparece en cada página — la
transición "Consumibles médicos" → "Equipo médico" ocurre a media página 7 sin salto, y aun así ambas
mitades muestran su propio bloque de firma. La razón: `tfoot` se repite en cada fragmento de
**cualquier** tabla que toque una página, sin que importe si esa página se comparte con otra tabla.
Partir en más tablas no cambia esa garantía — cada tabla nueva sigue mostrando su propio `tfoot` en cada
página que toque. Conclusión adoptada: **no se fuerza ningún salto de página nuevo** entre zonas (RAG) ni
entre hojas de una misma rebanada de fecha (checklist) — se sigue empacando libremente, igual que ya
hacía el resto del documento; sólo se agrega la repetición del banner.

Esto se **verificó empíricamente**, no sólo se razonó: se generó el HTML real de dos documentos con
datos reales de Supabase (RAG 4.1, el checklist de la ambulancia, 157 ítems; RAG 2.3, hidrantes
interiores, 74 elementos en 2 zonas) con un script desechable que reusa `armarDocumentoChecklist`/
`armarDocumentoRAG` + `renderizarDocumentoCompleto` sobre datos reales, impreso a PDF con
`msedge --headless --disable-gpu --print-to-pdf` (con `--user-data-dir` propio — sin él, Edge reusa la
ventana ya abierta del usuario y el proceso headless no llega a imprimir nada) y renderizado a imágenes
con `pdftoppm` para inspección visual página por página. Confirmado en ambos documentos: el banner de
"Consumibles médicos"/"Nave 01" se repite correctamente en cada página de continuación (incluida la
transición tabla-a-tabla dentro de una página compartida, y el cruce real página-a-página de una misma
tabla); la firma/cierre aparece en cada página sin excepción; los saltos forzados siguen ocurriendo sólo
donde deben (frontera de bloque en checklist: "Equipo" 1-129 → salto → "Mecánico" 1-24 reinicia el
contador → salto → "Bitácora"); ningún caso de `thead` huérfano en las 16 + 3 páginas inspeccionadas.

**Efecto secundario aceptado, no un defecto:** cuando dos tablas de sección comparten una misma página
física (p. ej. "Consumibles médicos" termina y "Equipo médico" empieza a media página 7 de `A01.pdf`),
cada una imprime su propio encabezado general completo (franja VW, título, "Generado…", AÑO/MES,
Fecha/Grupo) — no sólo su banner de sección — porque cada `<table>` necesita su propio `<thead>`
completo por semántica de HTML; no hay forma de saber en el HTML generado qué tabla va a empezar una
página nueva en tiempo de impresión (eso lo decide el navegador, no el servidor — D-16), así que no se
puede suprimir condicionalmente el encabezado "sólo si esta tabla cae a media página". Es el mismo costo,
a escala más fina, que ya existía antes de este cambio entre una rebanada de fecha y la siguiente. Se
acepta como parte del mismo trade-off que hace posible la garantía que pidió el usuario.

**Decisión — Parte 3, la portada del checklist gana el mismo encabezado y pie:**

`renderizarPortada()` (`web/lib/checklist/render.ts`) pasa de un `<div>` suelto (sin fecha, sin firma) a
una tabla más — `<table class="doc-tabla chk-tabla chk-portada">`, siempre la primera del documento —
con la misma estructura de tres piezas que el resto: `<thead>` = encabezado general (con instrucciones,
por ser el primer bloque) + fila de Fecha + fila de Grupo; `<tbody>` = una sola fila con la cuadrícula de
fotos, ahora de **2×2** (antes 4 en una fila, a pedido explícito del usuario); `<tfoot>` = fila de Nombre
+ fila de Firma + franja-pie. Pedido explícito del usuario: **todo cabe en una sola hoja**, con una
columna de fecha por cada día configurado en `columnas_fecha` (hasta 31) — se logra con un ancho de
columna de fecha propio de la portada (`ANCHO_COLUMNA_FECHA_PORTADA_MM = 7.5`, más angosto que el
`ANCHO_COLUMNA_FECHA_MM` que usa el resto del documento) y una columna de etiqueta más ancha
(`ANCHO_ETIQUETA_PORTADA_MM = 14`, para que "Nombre"/"Firma" no partan en dos líneas), usando
`doc.columnasFecha` sin rebanar — la portada nunca necesita `rebanarColumnasFecha()` porque, a
diferencia de Equipo/Mecánico, no carga columnas fijas de ítem que compitan por el ancho disponible.
Verificado con capturas reales para 31 días (el caso límite) y 0 (formato sin columnas de fecha).

**CSS — evitar que la tabla partida se vea como cajas sueltas.** `.chk-tabla`/`.rag-tabla` llevaban borde
completo y margen pensados para una tabla por documento/rebanada; con varias tablas chicas pudiendo
compartir página, eso se veía como cajas separadas con huecos. Se fusiona el borde entre dos tablas
consecutivas que **no** tengan salto forzado entre sí, con `:has()`:
`.chk-tabla:has(+ .chk-tabla:not(.chk-salto-pagina))` / `.rag-tabla:has(+ .rag-tabla)` — soportado en
Chrome/Edge desde v105, aceptable porque la app ya sólo se dirige a esos motores (D-16). Se aprovechó el
mismo cambio para quitar `break-inside: avoid` de `.chk-categoria`/`.chk-subgrupo`/`.rag-seccion` — CSS
muerto desde que esas filas viven en un `<thead>`, que ya se mueve como unidad atómica al paginar.

**Verificación.** `tsc --noEmit` y `eslint --max-warnings=0` limpios. `verificar-checklist.ts` y
`verificar-rag.ts` reescritos para iterar **todas** las tablas de un documento (antes asumían una sola
por documento/bloque) — colgroup/th/colspan por tabla, a lo más un banner externo y uno interno por
tabla, y una suma de columnas de fecha que dedupe rebanadas consecutivas iguales (una hoja nueva no
duplica la cuenta de su rebanada) — sin fallas en los casos de 31/28/0 días ni en los 4 casos de RAG.
Impresión real con headless Edge contra datos reales de Supabase (ver Parte 2) para RAG 4.1 y RAG 2.3,
inspeccionada página por página — éste es el único paso de los cuatro que ningún script puede cubrir,
porque ambos trabajan sobre HTML estático, donde no existen páginas.

**Archivos:** `web/lib/checklist/tipos.ts`, `documento.ts`, `columnas.ts`, `render.ts`, `estilos.ts`;
`web/lib/rag/render.ts`, `estilos.ts`; `web/app/(app)/rag/ConstructorChecklist.tsx`;
`web/scripts/verificar-checklist.ts`, `verificar-rag.ts`.
