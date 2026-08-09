-- Los cinco sistemas contra incendio que cubre la revisión mensual no
-- cambian de un ciclo a otro (ver docs/modelo-de-datos.md §2.2), así que
-- se cargan como parte del esquema y no como carga inicial del catálogo.
-- Cada ciclo decide cuáles quedan activos mediante ciclos.config
-- (sistemas_activos / captura_directa), no dando de alta o de baja aquí.

insert into sistemas (clave, nombre, rag, orden) values
  ('botones_avisadores',     'Botones avisadores',     'RAG 2.4', 1),
  ('hidrantes_interiores',   'Hidrantes interiores',   'RAG 2.3', 2),
  ('hidrantes_exteriores',   'Hidrantes exteriores',   'RAG 2.2', 3),
  ('valvulas_aereas',        'Válvulas aéreas',        'RAG 2.7', 4),
  ('valvulas_subterraneas',  'Válvulas subterráneas',  'RAG 2.8', 5)
on conflict (clave) do nothing;
