-- Ciclo de vida de 'formatos': baja recuperable + borrado permanente, y
-- columnas de fecha explícitas por checklist. Ver docs/decisiones.md D-23.
alter table formatos
  add column activo boolean not null default true;

-- Antes se derivaba en tiempo de solicitud de los días del mes del ciclo
-- ABIERTO (rag/[formato]/page.tsx), lo cual ataba un dato propio del
-- documento a qué ciclo estuviera abierto ese día — sin sentido para un
-- checklist, que no pertenece a ningún ciclo. Default 31 iguala el
-- respaldo que ya usaba DIAS_POR_DEFECTO, así que aplicar esta migración
-- no cambia el documento impreso de ningún checklist ya cargado hasta que
-- alguien lo edite explícitamente. Sin significado para tipo_documento='rag'.
alter table formatos
  add column columnas_fecha smallint not null default 31 check (columnas_fecha > 0);
