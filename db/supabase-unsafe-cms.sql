-- ============================================================
-- UNSAFE CMS add-on for the existing "UNSAFE public grants" setup
-- Enables:
-- - Inline editor "Publish" (stores full HTML snapshots per page)
-- - Optional image uploads to a public Storage bucket
--
-- WARNING: This makes your website editable by anyone who can access it.
-- ============================================================

-- 1) CMS page snapshots table
create table if not exists public.cms_pages (
  path text primary key,
  html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cms_pages_updated_at on public.cms_pages;
create trigger set_cms_pages_updated_at
before update on public.cms_pages
for each row execute function public.set_updated_at();

-- Public grants (UNSAFE)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.cms_pages to anon, authenticated;

-- 2) Storage bucket for editor uploads (optional)
-- If you do not need image uploads, you can skip everything below.
insert into storage.buckets (id, name, public)
values ('resume-cms', 'resume-cms', true)
on conflict (id) do update set public = excluded.public;

alter table storage.objects enable row level security;

-- Public read/write (UNSAFE)
drop policy if exists "resume_cms_public_read" on storage.objects;
create policy "resume_cms_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'resume-cms');

drop policy if exists "resume_cms_public_insert" on storage.objects;
create policy "resume_cms_public_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'resume-cms');

drop policy if exists "resume_cms_public_update" on storage.objects;
create policy "resume_cms_public_update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'resume-cms')
with check (bucket_id = 'resume-cms');

drop policy if exists "resume_cms_public_delete" on storage.objects;
create policy "resume_cms_public_delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'resume-cms');

