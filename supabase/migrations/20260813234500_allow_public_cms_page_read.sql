-- CMS snapshots contain the same content shown on the public website.
-- Publishing remains admin-only; anonymous users receive SELECT access only.
alter table public.cms_pages enable row level security;

grant select on table public.cms_pages to anon;

drop policy if exists cms_pages_public_read on public.cms_pages;
create policy cms_pages_public_read
on public.cms_pages
for select
to anon, authenticated
using (true);
