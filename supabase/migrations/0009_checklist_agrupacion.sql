-- Agrupación configurable por categoría y ubicación física en el checklist.
-- Ver el plan de ampliación de RAGs (Etapa 2b) y docs/decisiones.md D-22.
--
-- El Excel de trabajo de la ambulancia A-01 ganó una columna nueva,
-- 'ubicacion_fisica', independiente de 'categoria' -- ambas deben poder
-- mostrarse como sección (banner) en el documento impreso. Es, de hecho,
-- la respuesta al requisito original de "identificar correctamente dónde
-- encontrar los elementos de la lista de verificación", que en la Etapa 2
-- había quedado resuelto sólo a medias (únicamente se agrupaba por
-- 'categoria'). El orden de anidado se deja configurable por bloque, no
-- fijo en código, porque un checklist futuro podría necesitar el orden
-- invertido, un solo nivel, o ninguno.

alter table checklist_items
  add column ubicacion_fisica text;  -- segunda dimensión de agrupación, independiente de 'categoria'

alter table checklist_bloques
  add column agrupacion jsonb not null default '["ubicacion_fisica", "categoria"]'::jsonb;

comment on column checklist_bloques.agrupacion is
  'Orden de agrupación anidada para tabla_verificacion/tabla_simple: arreglo de 0 a 2 elementos de '
  '{"categoria","ubicacion_fisica"}. [] = sin banners de sección (plano). Un elemento = un nivel. '
  'Dos = anidado, el primero es el banner externo. Vive en el bloque, no en el formato, porque cada '
  'bloque de un mismo checklist puede necesitar un orden distinto.';
