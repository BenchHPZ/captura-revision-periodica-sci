-- 'elementos' deja de pertenecer a un ciclo específico y pasa a ser el
-- catálogo persistente de la planta, igual que 'sistemas' y 'zonas'. Lo
-- que varía mes a mes sigue viviendo en 'plantillas' (D-02); lo que se
-- captura cada mes pasa a vivir en 'registros', que ahora sí lleva su
-- propio ciclo_id porque un mismo elemento puede tener un registro por
-- cada ciclo en el que se supervisó. Ver docs/decisiones.md D-26.
--
-- Corre sobre datos reales de producción. ANTES de aplicar esto:
--   1. Correr la consulta de auditoría de docs/decisiones.md D-26 (o ver
--      el comentario al final de este archivo) y resolver a mano
--      cualquier grupo (sistema_id, codigo) donde el nombre cambie de
--      forma sospechosa entre ciclos — esta migración NO distingue "el
--      mismo elemento que persiste" de "un código reciclado para otra
--      cosa distinta": colapsa por (sistema_id, codigo) literal, sin
--      excepción.
--   2. Tomar un respaldo de 'elementos' y 'registros' (pg_dump o snapshot
--      de Supabase). Los pasos 6 y 7 son destructivos y, una vez
--      aplicados, sólo se deshacen restaurando ese respaldo.

begin;

-- =====================================================================
-- PASO 1 — registros gana ciclo_id (nullable primero)
-- =====================================================================
-- Invariante que este paso prepara: cada registro va a necesitar saber
-- a qué ciclo pertenece, porque ese dato hoy vive indirectamente en
-- elementos.ciclo_id y está a punto de desaparecer de ahí.
alter table registros
  add column ciclo_id uuid references ciclos(id) on delete cascade;

-- =====================================================================
-- PASO 2 — backfill: cada registro hereda el ciclo_id de SU elemento
-- =====================================================================
-- Invariante que garantiza que este UPDATE es una copia 1:1 sin
-- ambigüedad posible: en este momento la relación registro→elemento
-- todavía es la vieja (un elemento = un ciclo, elemento_id es único en
-- registros), así que cada registro tiene exactamente un elemento, y ese
-- elemento tiene exactamente un ciclo_id.
update registros r
set ciclo_id = e.ciclo_id
from elementos e
where e.id = r.elemento_id;

-- Verificación manual antes de continuar (debe devolver 0 filas):
--   select count(*) from registros where ciclo_id is null;

-- =====================================================================
-- PASO 3 — ciclo_id ya no puede quedar nulo
-- =====================================================================
alter table registros
  alter column ciclo_id set not null;

-- =====================================================================
-- PASO 4 — registros: unique(elemento_id) -> unique(elemento_id, ciclo_id)
-- =====================================================================
-- Se hace ANTES de reasignar elemento_id (paso 6): con la restricción
-- vieja (elemento_id solo) el UPDATE del paso 6 fallaría en la segunda
-- fila que intente apuntar al mismo elemento canónico. Con la compuesta,
-- el UPDATE es válido siempre que, por canónico, no lleguen dos
-- registros del MISMO ciclo — y eso está garantizado (ver comentario del
-- paso 6).
--
-- Nombre de restricción esperado por convención de Postgres para
-- 'elemento_id uuid not null unique references ...' declarado inline en
-- 0001_schema.sql — verificar antes de correr con:
--   select conname from pg_constraint where conrelid = 'registros'::regclass and contype = 'u';
alter table registros
  drop constraint if exists registros_elemento_id_key;

alter table registros
  add constraint registros_elemento_id_ciclo_id_key unique (elemento_id, ciclo_id);

-- =====================================================================
-- PASO 5 — elegir la fila canónica de 'elementos' por (sistema_id, codigo)
-- =====================================================================
-- "Más reciente" = del ciclo con mayor (anio, mes). elementos no tiene
-- columna de fecha propia, así que el criterio sale por completo del
-- join a 'ciclos'. Desempate final por elementos.id: no debería
-- activarse nunca en datos sanos (clave de ciclo es única y 1:1 con
-- anio-mes), se deja sólo como red de seguridad.
create temporary table map_elemento_canonico as
select distinct on (e.sistema_id, e.codigo)
  e.sistema_id,
  e.codigo,
  e.id as canonico_id
from elementos e
join ciclos c on c.id = e.ciclo_id
order by e.sistema_id, e.codigo, c.anio desc, c.mes desc, e.id desc;

create unique index on map_elemento_canonico (sistema_id, codigo);

-- Mapa completo: cada fila vieja de elementos -> su canónico (la propia
-- fila canónica se mapea a sí misma).
create temporary table map_elemento_todos as
select e.id as viejo_id, m.canonico_id
from elementos e
join map_elemento_canonico m
  on m.sistema_id = e.sistema_id and m.codigo = e.codigo;

create unique index on map_elemento_todos (viejo_id);

-- Consecuencia explícita, no un bug: si nombre/ubicacion/zona_id/etc.
-- difieren entre ciclos para el mismo (sistema_id, codigo), a partir de
-- aquí sólo sobrevive el valor de la fila del ciclo MÁS RECIENTE. Es la
-- semántica correcta de "el catálogo persiste hasta que se edite
-- directo" — los valores de ciclos viejos para esas columnas se pierden.
-- 'registros' de esos ciclos viejos no se tocan: conservan lo que se
-- capturó, sólo cambia a qué fila de 'elementos' apuntan.

-- =====================================================================
-- PASO 6 — reasignar registros.elemento_id hacia la fila canónica
-- =====================================================================
-- Seguro sin colisión: antes de este paso, cada fila VIEJA de elementos
-- pertenecía a un solo ciclo (ciclo_id not null, unique(ciclo_id,
-- sistema_id, codigo)), así que a lo más UN registro por ciclo llega al
-- mismo canónico. La restricción compuesta del paso 4
-- (elemento_id, ciclo_id) no se viola: para un canónico dado, cada
-- registro que aterriza ahí trae un ciclo_id distinto (heredado en el
-- paso 2 de SU elemento original, antes de colapsar).
update registros r
set elemento_id = t.canonico_id
from map_elemento_todos t
where r.elemento_id = t.viejo_id
  and t.viejo_id <> t.canonico_id;

-- =====================================================================
-- PASO 7 — borrar las filas de 'elementos' no canónicas
-- =====================================================================
-- No hace falta tocar el 'on delete cascade' de elementos→registros: en
-- el paso 6 ya se reasignó CADA registro que pudiera colgar de una fila
-- no canónica, así que en este DELETE ningún registro apunta ya a las
-- filas que se van a borrar. El cascade se dispara pero no encuentra
-- nada que borrar — el orden (reasignar primero, borrar después) es lo
-- que lo hace seguro, no un cambio al comportamiento del cascade.
delete from elementos e
using map_elemento_todos t
where e.id = t.viejo_id
  and t.viejo_id <> t.canonico_id;

-- Verificación manual antes de continuar (comparar contra los conteos de
-- antes de la migración; 'registros' no debe haber cambiado de tamaño):
--   select count(*) from elementos;
--   select count(*) from registros;

-- =====================================================================
-- PASO 8 — elementos: quitar ciclo_id, ajustar restricción única e índice
-- =====================================================================
drop index if exists ix_elementos_recorrido;

-- Nombre de restricción esperado por convención para
-- 'unique (ciclo_id, sistema_id, codigo)' declarado inline en
-- 0001_schema.sql — verificar antes de correr con:
--   select conname from pg_constraint where conrelid = 'elementos'::regclass and contype = 'u';
alter table elementos
  drop constraint if exists elementos_ciclo_id_sistema_id_codigo_key;

-- Quitar la columna también tira su propia FK (elementos_ciclo_id_fkey)
-- automáticamente; se deja explícito el resto para que quede auditable
-- paso por paso en vez de depender de un DROP ... CASCADE implícito.
alter table elementos
  drop column ciclo_id;

alter table elementos
  add constraint elementos_sistema_id_codigo_key unique (sistema_id, codigo);

create index ix_elementos_recorrido
  on elementos (sistema_id, orden);

drop table map_elemento_canonico;
drop table map_elemento_todos;

commit;

-- Supabase refresca el caché de esquema de PostgREST ante cambios de DDL
-- (event trigger), pero si esta migración corre con un rol que no
-- dispara ese trigger, forzarlo explícitamente evita que la API siga
-- sirviendo el esquema viejo (columnas fantasma en 'elementos'):
notify pgrst, 'reload schema';

-- =====================================================================
-- Consulta de auditoría (léela y córrela ANTES del begin/commit de
-- arriba — no modifica nada, sólo reporta). Ver docs/decisiones.md D-26.
-- =====================================================================
-- with grupos as (
--   select e.sistema_id, e.codigo, c.clave as ciclo_clave, c.anio, c.mes,
--          e.id as elemento_id, e.nombre, e.ubicacion, e.zona_id, e.activo
--   from elementos e join ciclos c on c.id = e.ciclo_id
-- )
-- select s.clave as sistema, g.codigo, count(*) as filas,
--        count(distinct btrim(lower(g.nombre))) as nombres_distintos,
--        jsonb_agg(jsonb_build_object('ciclo', g.ciclo_clave, 'nombre', g.nombre,
--          'ubicacion', g.ubicacion, 'activo', g.activo) order by g.anio, g.mes) as detalle
-- from grupos g join sistemas s on s.id = g.sistema_id
-- group by s.clave, g.codigo having count(*) > 1
-- order by nombres_distintos desc, filas desc;
