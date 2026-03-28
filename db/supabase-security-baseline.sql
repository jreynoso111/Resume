-- Security baseline for the current Supabase-backed site.
-- Review this file before applying it in production.
--
-- Goals:
-- - Restore versioned RLS/policy definitions to the repository.
-- - Avoid hard-coded admin emails in SQL by deriving admin access from JWT app_metadata
--   or from public.profiles.role = 'admin' / 'editor'.
-- - Keep public read limited to the data the site intentionally exposes.

create schema if not exists public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  role_from_jwt text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''));
  has_profiles boolean := false;
  admin_by_profile boolean := false;
begin
  if role_from_jwt in ('admin', 'editor') then
    return true;
  end if;

  select to_regclass('public.profiles') is not null into has_profiles;
  if has_profiles then
    execute $sql$
      select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and lower(coalesce(role, '')) in ('admin', 'editor')
      )
    $sql$
    into admin_by_profile;
  end if;

  return coalesce(admin_by_profile, false);
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.is_admin_user()
$$;

create or replace function public.can_accept_site_analytics_event(
  p_event_type text,
  p_page_path text,
  p_page_title text,
  p_referrer text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_device_type text,
  p_session_id text,
  p_visitor_id text,
  p_language text,
  p_screen_width integer,
  p_screen_height integer,
  p_timezone text,
  p_user_agent text,
  p_metadata jsonb
)
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  normalized_event text := lower(trim(coalesce(p_event_type, '')));
  normalized_path text := trim(coalesce(p_page_path, ''));
  metadata_obj jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if normalized_event not in ('page_view', 'cms_publish') then
    return false;
  end if;

  if normalized_path = '' or left(normalized_path, 1) <> '/' or char_length(normalized_path) > 512 then
    return false;
  end if;

  if char_length(coalesce(p_page_title, '')) > 200 then
    return false;
  end if;
  if char_length(coalesce(p_referrer, '')) > 512 then
    return false;
  end if;
  if char_length(coalesce(p_utm_source, '')) > 100 then
    return false;
  end if;
  if char_length(coalesce(p_utm_medium, '')) > 100 then
    return false;
  end if;
  if char_length(coalesce(p_utm_campaign, '')) > 150 then
    return false;
  end if;
  if char_length(coalesce(p_device_type, '')) > 32 then
    return false;
  end if;
  if char_length(coalesce(p_session_id, '')) > 64 then
    return false;
  end if;
  if char_length(coalesce(p_visitor_id, '')) > 64 then
    return false;
  end if;
  if char_length(coalesce(p_language, '')) > 32 then
    return false;
  end if;
  if char_length(coalesce(p_timezone, '')) > 64 then
    return false;
  end if;
  if char_length(coalesce(p_user_agent, '')) > 512 then
    return false;
  end if;
  if coalesce(p_screen_width, 0) < 0 or coalesce(p_screen_width, 0) > 10000 then
    return false;
  end if;
  if coalesce(p_screen_height, 0) < 0 or coalesce(p_screen_height, 0) > 10000 then
    return false;
  end if;
  if jsonb_typeof(metadata_obj) <> 'object' or pg_column_size(metadata_obj) > 4096 then
    return false;
  end if;

  if normalized_event = 'page_view' and normalized_path ~ '^/(admin(?:/|$)|auth/callback\.html$)' then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.record_site_page_view(
  p_page_path text,
  p_page_title text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_device_type text default null,
  p_session_id text default null,
  p_visitor_id text default null,
  p_language text default null,
  p_screen_width integer default null,
  p_screen_height integer default null,
  p_timezone text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_count integer := 0;
  normalized_path text := trim(coalesce(p_page_path, ''));
  normalized_metadata jsonb := jsonb_strip_nulls(coalesce(p_metadata, '{}'::jsonb));
begin
  if not public.can_accept_site_analytics_event(
    'page_view',
    normalized_path,
    p_page_title,
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_device_type,
    p_session_id,
    p_visitor_id,
    p_language,
    p_screen_width,
    p_screen_height,
    p_timezone,
    p_user_agent,
    normalized_metadata
  ) then
    return false;
  end if;

  insert into public.site_analytics_events (
    event_type,
    page_path,
    page_title,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    device_type,
    session_id,
    visitor_id,
    language,
    screen_width,
    screen_height,
    timezone,
    user_agent,
    metadata
  )
  select
    'page_view',
    normalized_path,
    nullif(trim(coalesce(p_page_title, '')), ''),
    nullif(trim(coalesce(p_referrer, '')), ''),
    nullif(trim(coalesce(p_utm_source, '')), ''),
    nullif(trim(coalesce(p_utm_medium, '')), ''),
    nullif(trim(coalesce(p_utm_campaign, '')), ''),
    nullif(trim(coalesce(p_device_type, '')), ''),
    nullif(trim(coalesce(p_session_id, '')), ''),
    nullif(trim(coalesce(p_visitor_id, '')), ''),
    nullif(trim(coalesce(p_language, '')), ''),
    p_screen_width,
    p_screen_height,
    nullif(trim(coalesce(p_timezone, '')), ''),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    normalized_metadata
  where not exists (
    select 1
    from public.site_analytics_events existing
    where existing.event_type = 'page_view'
      and existing.page_path = normalized_path
      and coalesce(existing.session_id, '') = trim(coalesce(p_session_id, ''))
      and coalesce(existing.visitor_id, '') = trim(coalesce(p_visitor_id, ''))
      and existing.created_at >= now() - interval '15 minutes'
  );

  get diagnostics inserted_count = row_count;
  return inserted_count > 0;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage, select, update on all sequences in schema public to authenticated;
grant execute on function public.record_site_page_view(
  text, text, text, text, text, text, text, text, text, text, integer, integer, text, text, jsonb
) to anon, authenticated;

do $$
begin
  if to_regclass('public.profile') is not null then
    execute 'alter table public.profile enable row level security';
    execute 'grant select on public.profile to anon, authenticated';
    execute 'grant insert, update, delete on public.profile to authenticated';
    execute 'drop policy if exists profile_public_read on public.profile';
    execute 'create policy profile_public_read on public.profile for select to anon, authenticated using (true)';
    execute 'drop policy if exists profile_admin_insert on public.profile';
    execute 'create policy profile_admin_insert on public.profile for insert to authenticated with check (public.is_admin_user())';
    execute 'drop policy if exists profile_admin_update on public.profile';
    execute 'create policy profile_admin_update on public.profile for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
    execute 'drop policy if exists profile_admin_delete on public.profile';
    execute 'create policy profile_admin_delete on public.profile for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    execute 'grant select on public.profiles to authenticated';
    execute 'grant insert, update on public.profiles to authenticated';
    execute 'drop policy if exists profiles_self_read on public.profiles';
    execute 'create policy profiles_self_read on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin_user())';
    execute 'drop policy if exists profiles_self_insert on public.profiles';
    execute 'create policy profiles_self_insert on public.profiles for insert to authenticated with check (auth.uid() = id or public.is_admin_user())';
    execute 'drop policy if exists profiles_self_update on public.profiles';
    execute 'create policy profiles_self_update on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin_user()) with check (auth.uid() = id or public.is_admin_user())';
    execute 'drop policy if exists profiles_admin_delete on public.profiles';
    execute 'create policy profiles_admin_delete on public.profiles for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['experience', 'education', 'credentials', 'skills']
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('grant select on public.%I to anon, authenticated', table_name);
      execute format('grant insert, update, delete on public.%I to authenticated', table_name);
      execute format('drop policy if exists %I_public_read on public.%I', table_name, table_name);
      execute format('create policy %I_public_read on public.%I for select to anon, authenticated using (true)', table_name, table_name);
      execute format('drop policy if exists %I_admin_insert on public.%I', table_name, table_name);
      execute format('create policy %I_admin_insert on public.%I for insert to authenticated with check (public.is_admin_user())', table_name, table_name);
      execute format('drop policy if exists %I_admin_update on public.%I', table_name, table_name);
      execute format('create policy %I_admin_update on public.%I for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user())', table_name, table_name);
      execute format('drop policy if exists %I_admin_delete on public.%I', table_name, table_name);
      execute format('create policy %I_admin_delete on public.%I for delete to authenticated using (public.is_admin_user())', table_name, table_name);
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.cms_pages') is not null then
    execute 'alter table public.cms_pages enable row level security';
    execute 'grant select, insert, update, delete on public.cms_pages to authenticated';
    execute 'drop policy if exists cms_pages_admin_read on public.cms_pages';
    execute 'create policy cms_pages_admin_read on public.cms_pages for select to authenticated using (public.is_admin_user())';
    execute 'drop policy if exists cms_pages_public_read on public.cms_pages';
    execute 'drop policy if exists cms_pages_admin_insert on public.cms_pages';
    execute 'create policy cms_pages_admin_insert on public.cms_pages for insert to authenticated with check (public.is_admin_user())';
    execute 'drop policy if exists cms_pages_admin_update on public.cms_pages';
    execute 'create policy cms_pages_admin_update on public.cms_pages for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
    execute 'drop policy if exists cms_pages_admin_delete on public.cms_pages';
    execute 'create policy cms_pages_admin_delete on public.cms_pages for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects enable row level security';
    execute 'grant select on public.projects to anon, authenticated';
    execute 'grant insert, update, delete on public.projects to authenticated';
    execute 'drop policy if exists projects_public_read on public.projects';
    execute 'create policy projects_public_read on public.projects for select to anon, authenticated using (coalesce(is_published, false) = true or public.is_admin_user())';
    execute 'drop policy if exists projects_admin_insert on public.projects';
    execute 'create policy projects_admin_insert on public.projects for insert to authenticated with check (public.is_admin_user())';
    execute 'drop policy if exists projects_admin_update on public.projects';
    execute 'create policy projects_admin_update on public.projects for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
    execute 'drop policy if exists projects_admin_delete on public.projects';
    execute 'create policy projects_admin_delete on public.projects for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.blog_posts') is not null then
    execute 'alter table public.blog_posts enable row level security';
    execute 'grant select on public.blog_posts to anon, authenticated';
    execute 'grant insert, update, delete on public.blog_posts to authenticated';
    execute 'drop policy if exists blog_posts_public_read on public.blog_posts';
    execute 'create policy blog_posts_public_read on public.blog_posts for select to anon, authenticated using (coalesce(is_published, false) = true or public.is_admin_user())';
    execute 'drop policy if exists blog_posts_admin_insert on public.blog_posts';
    execute 'create policy blog_posts_admin_insert on public.blog_posts for insert to authenticated with check (public.is_admin_user())';
    execute 'drop policy if exists blog_posts_admin_update on public.blog_posts';
    execute 'create policy blog_posts_admin_update on public.blog_posts for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
    execute 'drop policy if exists blog_posts_admin_delete on public.blog_posts';
    execute 'create policy blog_posts_admin_delete on public.blog_posts for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.cms_change_log') is not null then
    execute 'alter table public.cms_change_log enable row level security';
    execute 'grant select, insert on public.cms_change_log to authenticated';
    execute 'drop policy if exists cms_change_log_admin_read on public.cms_change_log';
    execute 'create policy cms_change_log_admin_read on public.cms_change_log for select to authenticated using (public.is_admin_user())';
    execute 'drop policy if exists cms_change_log_admin_insert on public.cms_change_log';
    execute 'create policy cms_change_log_admin_insert on public.cms_change_log for insert to authenticated with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.site_analytics_events') is not null then
    execute 'alter table public.site_analytics_events enable row level security';
    execute 'revoke insert on public.site_analytics_events from anon';
    execute 'grant insert on public.site_analytics_events to authenticated';
    execute 'grant select on public.site_analytics_events to authenticated';
    execute 'drop policy if exists site_analytics_events_public_insert on public.site_analytics_events';
    execute 'drop policy if exists site_analytics_events_admin_insert on public.site_analytics_events';
    execute $policy$
      create policy site_analytics_events_admin_insert
      on public.site_analytics_events
      for insert
      to authenticated
      with check (
        public.is_admin_user()
        and event_type = 'cms_publish'
        and public.can_accept_site_analytics_event(
          event_type,
          page_path,
          page_title,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          device_type,
          session_id,
          visitor_id,
          language,
          screen_width,
          screen_height,
          timezone,
          user_agent,
          metadata
        )
      )
    $policy$;
    execute 'drop policy if exists site_analytics_events_admin_read on public.site_analytics_events';
    execute 'create policy site_analytics_events_admin_read on public.site_analytics_events for select to authenticated using (public.is_admin_user())';
    execute 'drop policy if exists site_analytics_events_admin_delete on public.site_analytics_events';
    execute 'create policy site_analytics_events_admin_delete on public.site_analytics_events for delete to authenticated using (public.is_admin_user())';
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('resume-cms', 'resume-cms', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists resume_cms_public_read on storage.objects;
create policy resume_cms_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'resume-cms');

drop policy if exists resume_cms_admin_insert on storage.objects;
create policy resume_cms_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resume-cms'
  and public.is_admin_user()
);

drop policy if exists resume_cms_admin_update on storage.objects;
create policy resume_cms_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resume-cms'
  and public.is_admin_user()
)
with check (
  bucket_id = 'resume-cms'
  and public.is_admin_user()
);

drop policy if exists resume_cms_admin_delete on storage.objects;
create policy resume_cms_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resume-cms'
  and public.is_admin_user()
);
