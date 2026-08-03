-- =====================================================================
-- Madskraft Billing - Branding asset storage
-- Creates the public `branding` bucket that backs the logo, company
-- stamp and authorised-signature uploads in the settings panel.
-- The bucket is public so the PDF generator can fetch the images by URL
-- without minting signed URLs on every render.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152, -- 2 MB; stamps and signatures are small transparent PNGs
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read: the bucket is public and invoices are shared as PDFs.
drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read" on storage.objects
  for select to public
  using (bucket_id = 'branding');

-- Only signed-in staff may add or replace branding assets.
drop policy if exists "branding_authenticated_insert" on storage.objects;
create policy "branding_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding');

drop policy if exists "branding_authenticated_update" on storage.objects;
create policy "branding_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding')
  with check (bucket_id = 'branding');

drop policy if exists "branding_authenticated_delete" on storage.objects;
create policy "branding_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding');
