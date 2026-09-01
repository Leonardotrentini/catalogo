-- Bucket público para mídia de produtos (imagens e vídeos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalog_media_public_read" on storage.objects;
create policy "catalog_media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'catalog-media');

drop policy if exists "catalog_media_auth_insert" on storage.objects;
create policy "catalog_media_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'catalog-media');

drop policy if exists "catalog_media_auth_update" on storage.objects;
create policy "catalog_media_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'catalog-media')
  with check (bucket_id = 'catalog-media');

drop policy if exists "catalog_media_auth_delete" on storage.objects;
create policy "catalog_media_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'catalog-media');
