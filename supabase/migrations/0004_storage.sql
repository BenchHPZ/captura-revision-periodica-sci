-- Depósito de fotografías. Ver docs/modelo-de-datos.md §5.
--
-- Bucket privado: ningún objeto es de acceso público. La aplicación
-- entrega URL firmada de vigencia corta para mostrar o subir un archivo.
-- storage.objects ya trae RLS activo por defecto en Supabase; aquí sólo
-- se agregan las políticas para el bucket 'evidencias'.

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

create policy "autenticados_leer_evidencias" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias');

create policy "autenticados_subir_evidencias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias');

create policy "autenticados_actualizar_evidencias" on storage.objects
  for update to authenticated
  using (bucket_id = 'evidencias')
  with check (bucket_id = 'evidencias');

create policy "autenticados_borrar_evidencias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidencias');
