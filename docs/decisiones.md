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

**Estado:** vigente

**Contexto.** La presentación mensual se arma sobre la plantilla corporativa `Reporte sistemas -
MASTER.pptx`, con las fuentes institucionales instaladas en el equipo, y se revisa abriéndola en
PowerPoint antes de entregarla.

**Decisión.** La captura y el seguimiento viven en la nube; la generación del informe es un programa
que se ejecuta en el equipo del encargado, lee los datos del ciclo y deposita el archivo resultante
en la carpeta de trabajo.

**Consecuencias.** Hay dos piezas que mantener en lugar de una. A cambio, el informe se produce con
la plantilla y la tipografía correctas, se puede revisar antes de entregarlo, y la nube no necesita
cargar con dependencias de ofimática.

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

## D-06 · Las fotografías suben directo al depósito

**Estado:** vigente

**Contexto.** El alojamiento de la aplicación limita el tamaño del cuerpo de las peticiones a unos
pocos megabytes. Una tanda de fotografías de teléfono lo excede con facilidad.

**Decisión.** El navegador sube cada fotografía directamente al depósito de archivos usando una
autorización temporal, y sólo informa a la aplicación de la ruta resultante.

**Consecuencias.** La lógica de subida es algo más elaborada en el navegador y hay que emitir y
vigilar esas autorizaciones. A cambio, no hay límite práctico de tamaño, la carga desde teléfono es
notablemente más rápida y el servidor no gasta recursos moviendo archivos.

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
