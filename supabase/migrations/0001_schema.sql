-- Esquema base. Ver docs/modelo-de-datos.md §2 para el diccionario completo.
--
-- gen_random_uuid() viene de pgcrypto, que Supabase habilita por defecto en
-- proyectos nuevos. Si el proyecto no lo tuviera, esta línea lo garantiza.
create extension if not exists pgcrypto;

-- Se toca sola en cada UPDATE. Se usa en plantillas.actualizado y
-- registros.actualizado para no depender de que la aplicación recuerde
-- fijar la marca de tiempo en cada escritura.
create or replace function set_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

-- =====================================================================
-- ciclos — un renglón por mes de revisión
-- =====================================================================
create table ciclos (
  id       uuid primary key default gen_random_uuid(),
  clave    text not null unique,                 -- 'AAAA-MM', p. ej. '2026-08'
  nombre   text not null,                         -- 'Agosto 2026'
  mes      smallint not null check (mes between 1 and 12),
  anio     smallint not null check (anio between 2000 and 2100),
  estado   text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  config   jsonb not null default '{}'::jsonb,    -- ver §3.1
  creado   timestamptz not null default now(),
  cerrado  timestamptz
);

-- Sólo un ciclo puede estar abierto a la vez. Indexar la columna filtrada
-- por el propio valor 'abierto' fuerza que a lo más un renglón la tenga.
create unique index ux_ciclos_unico_abierto
  on ciclos (estado)
  where estado = 'abierto';

-- =====================================================================
-- sistemas — catálogo fijo de los cinco sistemas contra incendio
-- =====================================================================
create table sistemas (
  id      uuid primary key default gen_random_uuid(),
  clave   text not null unique,                   -- 'hidrantes_interiores'
  nombre  text not null,                           -- 'Hidrantes interiores'
  rag     text,                                    -- 'RAG 2.3'
  orden   smallint not null,
  activo  boolean not null default true
);

-- =====================================================================
-- plantillas — qué se supervisa en un sistema durante un ciclo
-- =====================================================================
create table plantillas (
  id          uuid primary key default gen_random_uuid(),
  ciclo_id    uuid not null references ciclos(id) on delete cascade,
  sistema_id  uuid not null references sistemas(id) on delete restrict,
  fotos       jsonb not null default '[]'::jsonb,  -- ver §3.2
  puntos      jsonb not null default '[]'::jsonb,
  texto_libre jsonb not null default '[]'::jsonb,
  actualizado timestamptz not null default now(),
  unique (ciclo_id, sistema_id)
);

create trigger trg_plantillas_actualizado
  before update on plantillas
  for each row execute function set_actualizado();

-- =====================================================================
-- elementos — qué se revisa; el catálogo del ciclo
-- =====================================================================
create table elementos (
  id           uuid primary key default gen_random_uuid(),
  ciclo_id     uuid not null references ciclos(id) on delete cascade,
  sistema_id   uuid not null references sistemas(id) on delete restrict,
  codigo       text not null,                      -- identificador único, p. ej. 'AV-Z1-101'
  nombre       text not null,                       -- rótulo de campo, p. ej. 'ELEM. 101'
  zona         text,
  ubicacion    text,
  tipo         text,
  responsable  text,
  item_rag     smallint,
  orden        integer not null default 0,
  activo       boolean not null default true,
  notas        text,
  unique (ciclo_id, codigo)
);

create index ix_elementos_recorrido
  on elementos (ciclo_id, sistema_id, orden);

-- =====================================================================
-- registros — lo capturado para un elemento
-- =====================================================================
create table registros (
  id                 uuid primary key default gen_random_uuid(),
  elemento_id        uuid not null unique references elementos(id) on delete cascade,
  como_se_encontro    text,
  que_se_realizo      text,
  pendientes          text,
  valores             jsonb not null default '{}'::jsonb,  -- ver §3.3
  estado              text not null default 'sin_iniciar'
                         check (estado in ('sin_iniciar', 'parcial', 'completo')),
  capturado_por        text,
  creado               timestamptz not null default now(),
  actualizado          timestamptz not null default now()
);

create index ix_registros_estado on registros (estado);

create trigger trg_registros_actualizado
  before update on registros
  for each row execute function set_actualizado();

-- =====================================================================
-- fotos
-- =====================================================================
create table fotos (
  id           uuid primary key default gen_random_uuid(),
  registro_id  uuid not null references registros(id) on delete cascade,
  momento      text not null,                       -- 'antes' | 'despues' | 'estado' | ...
  ruta         text not null unique,                 -- ruta del objeto en Storage
  ancho        integer,
  alto         integer,
  bytes        integer,
  orden        smallint not null default 0,
  origen       text not null default 'captura'
                 check (origen in ('captura', 'recepcion')),
  subida       timestamptz not null default now()
);

create index ix_fotos_registro_momento
  on fotos (registro_id, momento, orden);

-- =====================================================================
-- entrada — área de espera para fotografías sin clasificar
-- =====================================================================
create table entrada (
  id               uuid primary key default gen_random_uuid(),
  ciclo_id         uuid not null references ciclos(id) on delete cascade,
  ruta             text not null,
  nombre_original  text,
  bytes            integer,
  estado           text not null default 'pendiente'
                     check (estado in ('pendiente', 'asignada', 'descartada')),
  foto_id          uuid references fotos(id) on delete set null,
  subida           timestamptz not null default now()
);

create index ix_entrada_pendientes
  on entrada (ciclo_id, estado);
