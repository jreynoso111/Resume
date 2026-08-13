-- New database objects must be explicitly exposed to the Data API.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated, service_role;

create or replace function public.is_admin_user()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  role_from_jwt text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''));
  admin_by_profile boolean := false;
begin
  if role_from_jwt in ('admin', 'editor') then
    return true;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(coalesce(role, '')) in ('admin', 'editor')
  ) into admin_by_profile;

  return coalesce(admin_by_profile, false);
end;
$$;

revoke execute on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to anon, authenticated;

revoke update on all sequences in schema public from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Prevent users from assigning themselves an elevated CMS role.
alter table public.profiles alter column role set default 'viewer';
revoke insert, update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, full_name, created_at) on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
on public.profiles
for insert
to authenticated
with check (
  public.is_admin_user()
  or (
    (select auth.uid()) = id
    and lower(coalesce(role, 'viewer')) = 'viewer'
  )
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id or public.is_admin_user())
with check ((select auth.uid()) = id or public.is_admin_user());

-- New functions are executable by PUBLIC unless explicitly revoked.
revoke execute on function public.record_site_page_view(
  text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) from public;
grant execute on function public.record_site_page_view(
  text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) to anon, authenticated;
