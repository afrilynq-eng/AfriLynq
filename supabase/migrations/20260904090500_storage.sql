-- AfriLynq platform
-- Migration 0006: storage buckets and their policies
--
-- Two kinds of file, two kinds of rule.
--   Public:  logos, cover images, product photography. These are marketing
--            assets and they should be cached and indexable.
--   Private: certificates, licences, dispute evidence. These are read through
--            short lived signed URLs generated server side, never directly.
--
-- Path convention for every bucket: {company_id}/{rest of path}
-- The first path segment is the company id, which is what the policies below
-- check. Do not deviate from it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-public', 'company-public', true,  5242880,
   array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('product-images', 'product-images', true,  5242880,
   array['image/jpeg','image/png','image/webp','image/avif']),
  ('company-documents', 'company-documents', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp']),
  ('order-documents', 'order-documents', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Helper: the company id encoded in the first path segment.
create or replace function app.path_company_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_segment text;
begin
  first_segment := split_part(object_name, '/', 1);
  if first_segment ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;

grant execute on function app.path_company_id(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Public buckets: anyone reads, only members of the owning company write.
-- ---------------------------------------------------------------------------

create policy storage_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('company-public', 'product-images'));

create policy storage_public_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('company-public', 'product-images')
    and app.path_company_id(name) is not null
    and app.is_member_of(app.path_company_id(name))
  );

create policy storage_public_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('company-public', 'product-images')
    and app.is_member_of(app.path_company_id(name))
  )
  with check (
    bucket_id in ('company-public', 'product-images')
    and app.is_member_of(app.path_company_id(name))
  );

create policy storage_public_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('company-public', 'product-images')
    and app.is_member_of(app.path_company_id(name))
  );

-- ---------------------------------------------------------------------------
-- Private buckets: only the owning company and platform admins. Buyers never
-- read a supplier certificate directly. The server issues a signed URL after
-- deciding whether they should see it.
-- ---------------------------------------------------------------------------

create policy storage_private_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('company-documents', 'order-documents')
    and (
      app.is_member_of(app.path_company_id(name))
      or app.is_platform_admin()
    )
  );

create policy storage_private_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('company-documents', 'order-documents')
    and app.path_company_id(name) is not null
    and app.is_member_of(app.path_company_id(name))
  );

create policy storage_private_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('company-documents', 'order-documents')
    and (app.is_member_of(app.path_company_id(name)) or app.is_platform_admin())
  )
  with check (
    bucket_id in ('company-documents', 'order-documents')
    and (app.is_member_of(app.path_company_id(name)) or app.is_platform_admin())
  );

create policy storage_private_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('company-documents', 'order-documents')
    and (app.is_company_admin(app.path_company_id(name)) or app.is_platform_admin())
  );
