-- Catálogos compartidos: zonas, tipos por sistema, columnas opcionales del
-- RAG y anclaje manual del orden. Ver docs/decisiones.md D-18 a D-20.
--
-- Contexto verificado contra la base real (228 elementos): 'elementos.zona'
-- y 'elementos.seccion' son la misma cadena en hidrantes exteriores y en
-- válvulas subterráneas, y en botones avisadores son la forma larga y la
-- corta de la misma partición. 'elementos.orden_seccion' está en cero en
-- los 228 — nunca se llegó a usar. 'elementos.tipo' es texto libre que
-- ninguna pantalla muestra ni ningún documento imprime hoy, y sus valores
-- reales ya están descritos como prosa en las instrucciones de dos
-- formatos ("P = Pie, G = Gabinete" en RAG 2.2; "Mariposa … o Vástago …"
-- en RAG 2.8).
--
-- Esta migración NO borra 'zona', 'seccion', 'orden_seccion' ni reescribe
-- el texto libre de 'tipo' fuera de lo mapeado: los deja sin leer. La
-- cadena de migraciones de este repositorio no corre sobre una base
-- limpia (0005/0006 quedaron reescritas sobre la base real, ver el aviso
-- en docs/decisiones.md D-18), así que cualquier paso que borre columnas
-- se deja para una migración aparte, ya con estos datos verificados.

-- =====================================================================
-- zonas — catálogo único de la planta, no del ciclo ni del sistema
-- =====================================================================
-- Vive fuera de 'ciclos' y de 'sistemas' a propósito: es lo que permite
-- que un elemento de hidrantes exteriores y uno de válvulas subterráneas
-- compartan zona cuando están co-ubicados, sin que cada sistema mantenga
-- su propia lista. 'nombre' es la forma corta que imprime el documento
-- RAG (columna angosta); 'descripcion' es el contexto que sólo se
-- muestra en pantalla — resuelve que, por ejemplo, avisadores traía
-- "Zona 1" en 'seccion' y "Zona 1 · Nave producción" en 'zona': la
-- primera es lo que va al papel, la segunda acompaña en la interfaz.
-- 'orden' sustituye a 'elementos.orden_seccion': el orden de las
-- secciones pasa a ser propiedad del catálogo, no de cada elemento —
-- desaparece la regla de "gana el primer valor no nulo del grupo".
create table zonas (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique,
  nombre      text not null,
  descripcion text,
  orden       smallint not null default 0,
  activo      boolean not null default true
);

alter table zonas enable row level security;

create policy "autenticados_todo" on zonas
  for all to authenticated using (true) with check (true);

-- Sembrado con las zonas que ya existen en los datos reales, agrupando
-- por la forma corta (seccion cuando está capturada, si no zona). No se
-- fusionan zonas de sistemas distintos que hoy tienen nombres parecidos
-- (p. ej. "Calle 1" en hidrantes exteriores contra "Calle 1 ·
-- Seccionamiento" en válvulas subterráneas): decidir si de verdad son el
-- mismo lugar físico es criterio del área, no algo que esta migración
-- deba adivinar. La pantalla de Zonas (fase de pantallas) es donde se
-- puede fusionar o renombrar después.
insert into zonas (clave, nombre, descripcion, orden) values
  ('zona-1',                    'Zona 1',                          'Nave producción',                      1),
  ('zona-2',                    'Zona 2',                          'Nave producción y logística',          2),
  ('zona-3-4',                  'Zona 3-4',                        'Edificio CC / Nave 90 / otros',         3),
  ('avenida-a',                 'Avenida A',                       null,                                    4),
  ('avenida-b',                 'Avenida B',                       null,                                    5),
  ('calle-1',                   'Calle 1',                         null,                                    6),
  ('calle-2',                   'Calle 2',                         null,                                    7),
  ('techumbre',                 'Techumbre',                       null,                                    8),
  ('calle-1-seccionamiento',    'Calle 1 · Seccionamiento',        null,                                    9),
  ('calle-1-cierre-hidrante',   'Calle 1 · Cierre de hidrante',    null,                                   10),
  ('calle-2-seccionamiento',    'Calle 2 · Seccionamiento',        null,                                   11),
  ('calle-2-cierre-hidrante',   'Calle 2 · Cierre de hidrante',    null,                                   12),
  ('calle-a-seccionamiento',    'Calle A · Seccionamiento',        null,                                   13),
  ('calle-a-cierre-hidrante',   'Calle A · Cierre de hidrante',    null,                                   14),
  ('calle-b-seccionamiento',    'Calle B · Seccionamiento',        null,                                   15),
  ('calle-b-cierre-hidrante',   'Calle B · Cierre de hidrante',    null,                                   16),
  ('cuarto-bombas',             'Cuarto de bombas contra incendio', null,                                  17);

-- =====================================================================
-- elementos — zona_id, orden_anclado
-- =====================================================================
alter table elementos
  add column zona_id       uuid references zonas(id) on delete restrict,
  add column orden_anclado smallint;  -- null = posición calculada (ver web/lib/orden.ts); no nulo = fija ese lugar

comment on column elementos.orden_anclado is
  'Cuando no es null, fija la posición del elemento dentro de su zona en vez de calcularla por ubicación/nombre.';

-- Enlaza cada elemento con su zona por la misma forma corta que se usó
-- para sembrar el catálogo: seccion si está capturada, si no zona. Los
-- 91 elementos de hidrantes interiores y válvulas aéreas no tienen
-- ninguna de las dos capturada y quedan con zona_id nulo — no hay dato
-- del que partir; se asignan desde la pantalla de catálogo cuando el
-- área lo tenga.
update elementos e
set zona_id = z.id
from zonas z
where z.nombre = coalesce(nullif(trim(e.seccion), ''), nullif(trim(e.zona), ''));

-- =====================================================================
-- sistemas — diccionario de tipos, propio de cada sistema
-- =====================================================================
-- Mismo criterio que 'plantillas.puntos' (D-02): configuración como
-- datos, no como estructura del programa. 'clave' es lo que imprime el
-- RAG en una columna de 10mm; 'nombre' es lo que se elige en pantalla.
-- Semilla derivada de los valores reales: hidrantes exteriores y
-- válvulas subterráneas ya tenían exactamente estos dos valores cada
-- uno, descritos hasta ahora sólo como prosa en las instrucciones de su
-- formato. Botones avisadores queda con diccionario vacío a propósito:
-- sus 54 elementos comparten el mismo valor ("HMS-D"), así que una
-- columna constante no discriminaría nada — queda a criterio del área
-- agregarlo desde Configuración si más adelante aporta. Hidrantes
-- interiores y válvulas aéreas no traen tipo capturado.
alter table sistemas add column tipos jsonb not null default '[]'::jsonb;

update sistemas set tipos = '[
  {"clave": "P", "nombre": "Pie"},
  {"clave": "G", "nombre": "Gabinete"}
]'::jsonb
where clave = 'hidrantes_exteriores';

update sistemas set tipos = '[
  {"clave": "M", "nombre": "Mariposa"},
  {"clave": "V", "nombre": "Vástago"}
]'::jsonb
where clave = 'valvulas_subterraneas';

-- elementos.tipo pasa a guardar la CLAVE del diccionario de su sistema,
-- no el nombre completo — mapeo de los valores capturados hoy.
update elementos
set tipo = case tipo when 'Gabinete' then 'G' when 'Pie' then 'P' else tipo end
where sistema_id = (select id from sistemas where clave = 'hidrantes_exteriores');

update elementos
set tipo = case tipo when 'Mariposa' then 'M' when 'Vástago' then 'V' else tipo end
where sistema_id = (select id from sistemas where clave = 'valvulas_subterraneas');

-- =====================================================================
-- formatos — columnas opcionales del documento
-- =====================================================================
-- Ubicación y Referencia dejan de ser fijas: cada formato decide si le
-- aportan. Verificado contra los datos reales antes de fijar el
-- default de RAG 2.2: 'ubicacion' está capturada en 0 de 33 hidrantes
-- exteriores (ocupa 18mm sin contenido), mientras que 'referencia' sí
-- tiene 1 de 33 y es el campo que de verdad localiza un elemento fuera
-- de nave (ver docs/decisiones.md D-15, "Ubicación seguía una lectura
-- invertida").
alter table formatos
  add column columnas jsonb not null default '{"ubicacion": true, "referencia": true}'::jsonb;

update formatos
set columnas = '{"ubicacion": false, "referencia": true}'::jsonb
where clave = 'RAG 2.2';

-- Las instrucciones que explicaban el tipo en prosa quedan retiradas:
-- ahora es una columna del documento, no algo que el bombero tenga que
-- leer en el encabezado y recordar al llenar el renglón.
update formatos set instrucciones = '[]'::jsonb where clave in ('RAG 2.2', 'RAG 2.8');
