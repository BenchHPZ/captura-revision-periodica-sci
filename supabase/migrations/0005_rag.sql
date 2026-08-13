-- Formatos RAG estandarizados. Ver docs/decisiones.md D-15 y D-16, y el
-- plan de estandarización que dio origen a este cambio.
--
-- 'formatos' declara la identidad de cada RAG: lo que es particular de
-- ese documento y estable entre ciclos. Lo que cambia mes a mes —los
-- puntos de revisión— sigue viviendo en 'plantillas' (D-02); esa
-- separación es la que permite que un formato semanal o diario entre
-- después sin tocar los cinco mensuales.
--
-- Lo que debe ser IDÉNTICO en los cinco formatos (clasificación, razón
-- social, domicilio, instrucción general, bloque de cierre) no vive
-- aquí: vive como constantes en web/lib/rag/constantes.ts, precisamente
-- para que no haya manera de que diverjan entre RAG por error de
-- captura. Esta tabla sólo guarda lo que sí varía de un formato a otro.
create table formatos (
  id                    uuid primary key default gen_random_uuid(),
  clave                 text not null,                    -- 'RAG 2.3'
  nombre                text not null,                     -- título completo del formato
  periodicidad          text not null default 'mensual',   -- 'mensual' hoy; el campo ya admite otras
  sistema_id            uuid references sistemas(id) on delete restrict,
  documento_referencia  text not null default 'I1.15M2_4037-002',
  revision              text,                              -- va al pie, junto con documento_referencia
  -- Sólo las instrucciones PROPIAS de este formato (p. ej. "P = Pie, G =
  -- Gabinete" en RAG 2.2). La instrucción general se concatena al
  -- renderizar, desde constantes.ts — no se repite aquí.
  instrucciones         jsonb not null default '[]'::jsonb,
  notas                 text,                              -- discrepancias del documento de origen, sin resolver
  creado                timestamptz not null default now(),
  actualizado           timestamptz not null default now(),
  unique (nombre, periodicidad),
  unique (clave)
);

create trigger trg_formatos_actualizado
  before update on formatos
  for each row execute function set_actualizado();

alter table formatos enable row level security;

create policy "autenticados_todo" on formatos
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- elementos — columnas nuevas para la tabla estándar del RAG
-- =====================================================================
-- 'seccion' + 'orden_seccion': cómo se agrupa el elemento dentro del
-- documento. Campo propio del catálogo, no derivado de 'zona' ni de
-- 'ubicacion', para que el área pueda agrupar como convenga sin depender
-- de que otro dato tenga la forma correcta.
-- 'referencia': ayuda corta a la ubicación (≤5 palabras); se valida en la
-- pantalla de catálogo, no aquí.
alter table elementos
  add column referencia    text,
  add column seccion       text,
  add column orden_seccion smallint;

-- =====================================================================
-- plantillas — 'observaciones' deja de ser un punto más
-- =====================================================================
-- La columna Observaciones del documento RAG se llena con
-- 'registros.pendientes' (ya existente, ya habilitado en texto_libre en
-- los cinco sistemas) — no con un punto de plantilla ni con una columna
-- nueva. Este paso sólo retira, de forma idempotente, el punto viejo si
-- alguna plantilla ya se hubiera cargado con él.
update plantillas
set puntos = (
  select coalesce(jsonb_agg(punto), '[]'::jsonb)
  from jsonb_array_elements(puntos) as punto
  where punto ->> 'id' <> 'observaciones'
)
where puntos @> '[{"id": "observaciones"}]'::jsonb;
