-- Tamaño y orientación de hoja por formato, y control de saltos de página
-- por bloque de checklist. Ver docs/decisiones.md D-25.

-- Hasta ahora la hoja estaba cableada en el CSS de cada motor (Carta
-- apaisada en checklist, Carta vertical en RAG) y recalculada a mano en
-- tres constantes más de milímetros, sin nada que las atara. Pasa a ser un
-- dato del formato, con web/lib/documentos/pagina.ts como única fuente que
-- alimenta a la vez el @page y el presupuesto de anchos.
alter table formatos
  add column tamano_hoja text not null default 'a4' check (tamano_hoja in ('a4', 'carta', 'oficio')),
  add column orientacion text not null default 'vertical' check (orientacion in ('vertical', 'apaisada'));

-- Conserva la orientación con la que cada tipo se venía imprimiendo; el
-- tamaño sí cambia a A4 (estándar pedido por el área). A4 apaisada es más
-- ancha que Carta apaisada (297mm contra 279.4), así que caben MÁS
-- columnas de fecha por hoja: el cambio va a favor de gastar menos papel.
update formatos set orientacion = 'apaisada' where tipo_documento = 'checklist';

-- Antes cada bloque abría hoja nueva, sin excepción ni forma de evitarlo
-- (el salto se aplicaba en render.ts a la primera tabla de cada bloque):
-- cuatro bloques cortos gastaban cuatro hojas. El default 'true' reproduce
-- exactamente ese comportamiento, así que aplicar esta migración no cambia
-- ningún documento ya cargado hasta que alguien lo edite.
alter table checklist_bloques
  add column hoja_propia boolean not null default true;

comment on column checklist_bloques.hoja_propia is
  'true: el bloque empieza en hoja nueva. false: continúa en la hoja del bloque anterior, y sólo se parte donde caiga el salto natural por tamaño de papel. Ignorado en el primer bloque del documento (no hay hoja anterior a la cual unirse).';

-- Las filas en blanco de la bitácora eran <td></td> sin altura definida en
-- ningún CSS: quedaban de ~2.5mm, imposibles de llenar a mano. 8mm es
-- cercano al alto de la fila de cierre (.chk-celda-cierre, 9mm), que sí
-- estaba dimensionada para escribir encima.
alter table checklist_bloques
  add column alto_fila_mm smallint not null default 8 check (alto_fila_mm > 0 and alto_fila_mm <= 60);

comment on column checklist_bloques.alto_fila_mm is
  'Alto en milímetros de cada renglón en blanco. Sólo tiene efecto en tipo=bitacora_libre.';

-- Ídem: filas_blanco aceptaba 0 y negativos (sin CHECK, y el constructor
-- tampoco lo revisaba). Las filas existentes son todas positivas.
alter table checklist_bloques
  add constraint checklist_bloques_filas_blanco_positivas check (filas_blanco is null or filas_blanco > 0);
