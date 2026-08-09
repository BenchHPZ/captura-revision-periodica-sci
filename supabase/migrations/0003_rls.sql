-- Seguridad por renglón. Ver docs/modelo-de-datos.md §7.
--
-- En el ciclo piloto opera un solo usuario, así que la política es la más
-- simple posible: cualquier sesión autenticada puede leer y escribir en
-- todas las tablas; el rol anónimo no tiene acceso a nada. El campo
-- 'responsable' en elementos y 'capturado_por' en registros ya permiten
-- restringir esto por persona más adelante, cambiando sólo estas políticas
-- y sin tocar el esquema.

alter table ciclos     enable row level security;
alter table sistemas   enable row level security;
alter table plantillas enable row level security;
alter table elementos  enable row level security;
alter table registros  enable row level security;
alter table fotos      enable row level security;
alter table entrada    enable row level security;

create policy "autenticados_todo" on ciclos
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on sistemas
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on plantillas
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on elementos
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on registros
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on fotos
  for all to authenticated using (true) with check (true);

create policy "autenticados_todo" on entrada
  for all to authenticated using (true) with check (true);
