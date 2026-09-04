-- Tipo de documento "checklist": listas de verificación periódicas de una
-- unidad (p. ej. ambulancia A-01), imprimibles en blanco, que NO recorren
-- un catálogo de elementos ni pasan por el flujo de captura fotográfica —
-- se llenan a mano en papel. Ver plan de ampliación de RAGs y
-- docs/decisiones.md D-22.
--
-- 'formatos' ya admitía esto sin usarlo: 'periodicidad' no está atada a
-- 'mensual' y 'sistema_id' ya es nullable ("formatos que no recorren
-- catálogo, por evento" — ver docs/modelo-de-datos.md). Lo único que
-- faltaba era distinguir qué MOTOR de renderizado le corresponde a cada
-- fila; 'tipo_documento' es esa distinción, nada más.
alter table formatos
  add column tipo_documento text not null default 'rag'
    check (tipo_documento in ('rag', 'checklist'));

-- Un checklist se arma en bloques (portada de fotos, tabla de equipo,
-- tabla mecánica, bitácora libre) — no todos los bloques tienen la misma
-- forma de columnas, por eso 'tipo' decide cómo se interpreta cada uno en
-- vez de forzarlos a un único esquema de renglón (ver web/lib/checklist/).
create table checklist_bloques (
  id            uuid primary key default gen_random_uuid(),
  formato_id    uuid not null references formatos(id) on delete cascade,
  tipo          text not null check (tipo in ('portada_fotos', 'tabla_verificacion', 'tabla_simple', 'bitacora_libre')),
  nombre        text not null,
  orden         smallint not null default 0,
  -- Sólo aplica a 'bitacora_libre': [{id, etiqueta}] de sus columnas fijas.
  columnas      jsonb not null default '[]'::jsonb,
  -- Sólo aplica a 'bitacora_libre': cuántas filas en blanco imprimir.
  filas_blanco  smallint,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

create trigger trg_checklist_bloques_actualizado
  before update on checklist_bloques
  for each row execute function set_actualizado();

alter table checklist_bloques enable row level security;

create policy "autenticados_todo" on checklist_bloques
  for all to authenticated using (true) with check (true);

-- Un renglón del checklist (un "Equipo" o una "Descripción" del sub-
-- checklist mecánico). 'categoria' es texto libre a propósito, NO fk a
-- 'zonas': zonas es un catálogo único de planta pensado para que
-- elementos de SISTEMAS distintos compartan ubicación física — las
-- categorías de un checklist ("EQUIPO MEDICO", "BOTIQUIN DE AMBULANCIA")
-- son propias de ese checklist y no necesitan ese catálogo compartido.
-- 'pos' es el rótulo tal cual el documento de origen y puede repetirse
-- (el PDF de la ambulancia trae Pos duplicados reales, ver
-- extracciones/RAG-4.1_Ambulancia-A01/); 'orden' es lo único que decide
-- el renderizado, mismo patrón que elementos.codigo (identidad) contra
-- elementos.orden (render).
create table checklist_items (
  id                    uuid primary key default gen_random_uuid(),
  bloque_id             uuid not null references checklist_bloques(id) on delete cascade,
  categoria             text,
  pos                   text,
  nombre                text not null,
  cantidad              text,
  -- Storage 'evidencias', prefijo 'checklist-ref/' — mismo depósito que
  -- las fotos de campo, sin bucket nuevo.
  foto_referencia_ruta  text,
  -- [{id, etiqueta}] — vacío en bloques 'tabla_simple'.
  verificaciones        jsonb not null default '[]'::jsonb,
  orden                 smallint not null default 0,
  -- Ambigüedades del documento de origen sin resolver (Pos duplicado,
  -- sin Pos visible, etc.) — mismo principio que 'elementos.notas' y
  -- 'formatos.notas' (ver docs/decisiones.md D-03).
  notas                 text,
  creado                timestamptz not null default now(),
  actualizado           timestamptz not null default now()
);

create trigger trg_checklist_items_actualizado
  before update on checklist_items
  for each row execute function set_actualizado();

alter table checklist_items enable row level security;

create policy "autenticados_todo" on checklist_items
  for all to authenticated using (true) with check (true);

create index idx_checklist_bloques_formato on checklist_bloques (formato_id);
create index idx_checklist_items_bloque on checklist_items (bloque_id);
