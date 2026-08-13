-- Ajuste correctivo de 'formatos' y 'registros'. Ver docs/decisiones.md
-- D-15 §7.1/§7.2. Necesaria porque 0005_rag.sql se aplicó a la base real
-- de forma directa (fuera del CLI, antes de la Adenda 2), así que el
-- historial de migraciones nunca se enteró y los objetos quedaron con la
-- forma vieja: 'formatos.encabezado'/'cierre' en vez de columnas propias
-- de documento_referencia/revision, y 'registros.observaciones' (que se
-- decidió no usar; el RAG lee 'pendientes'). Esta migración corrige eso
-- sobre datos ya reales (5 formatos, 228 elementos, 50 registros
-- capturados en campo) sin perder nada de lo ya capturado.

-- =====================================================================
-- formatos — documento_referencia/revision como columnas propias
-- =====================================================================
alter table formatos
  add column documento_referencia text,
  add column revision text;

update formatos
set documento_referencia = coalesce(encabezado ->> 'documento_referencia', 'I1.15M2_4037-002'),
    revision = encabezado ->> 'revision';

alter table formatos
  alter column documento_referencia set not null,
  alter column documento_referencia set default 'I1.15M2_4037-002';

-- Las 'instrucciones' que ya se cargaron traen la instrucción general
-- duplicada como dos renglones sueltos (se escribió antes de que
-- constantes.ts existiera). Se retira: la general ahora se concatena en
-- código (INSTRUCCION_GENERAL) y aquí sólo deben quedar las particulares.
update formatos
set instrucciones = (
  select coalesce(jsonb_agg(valor), '[]'::jsonb)
  from jsonb_array_elements_text(instrucciones) as valor
  where valor not in (
    'Marque SI o NO en cada punto de revisión según el estado del elemento.',
    'Toda respuesta NO debe quedar explicada en la columna de Observaciones, y darle seguimiento hasta su corrección.'
  )
);

-- clasificacion/razon_social/domicilio/cierre eran idénticos en las 5
-- filas (verificado); pasan a vivir sólo en constantes.ts.
alter table formatos
  drop column encabezado,
  drop column cierre;

-- =====================================================================
-- registros — 'observaciones' se retira; el RAG usa 'pendientes'
-- =====================================================================
-- Antes de borrar, se conserva cualquier observación ya capturada
-- anexándola a 'pendientes', para no perder trabajo real de campo.
update registros
set pendientes = coalesce(pendientes || E'\n', '') || observaciones
where observaciones is not null and observaciones <> '';

alter table registros
  drop column observaciones;
