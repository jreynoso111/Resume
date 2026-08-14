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
set search_path = ''
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

  if char_length(coalesce(p_page_title, '')) > 200
    or char_length(coalesce(p_referrer, '')) > 512
    or char_length(coalesce(p_utm_source, '')) > 100
    or char_length(coalesce(p_utm_medium, '')) > 100
    or char_length(coalesce(p_utm_campaign, '')) > 150
    or char_length(coalesce(p_device_type, '')) > 32
    or char_length(coalesce(p_session_id, '')) > 64
    or char_length(coalesce(p_visitor_id, '')) > 64
    or char_length(coalesce(p_language, '')) > 32
    or char_length(coalesce(p_timezone, '')) > 64
    or char_length(coalesce(p_user_agent, '')) > 512 then
    return false;
  end if;

  if coalesce(p_screen_width, 0) < 0 or coalesce(p_screen_width, 0) > 10000
    or coalesce(p_screen_height, 0) < 0 or coalesce(p_screen_height, 0) > 10000 then
    return false;
  end if;

  if jsonb_typeof(metadata_obj) <> 'object' or pg_column_size(metadata_obj) > 4096 then
    return false;
  end if;

  if normalized_event = 'page_view'
    and normalized_path ~ '^/(admin(?:/|$)|auth/callback\.html$)' then
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
set search_path = ''
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

revoke execute on function public.can_accept_site_analytics_event(
  text, text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) from public, anon, authenticated;

revoke execute on function public.record_site_page_view(
  text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.record_site_page_view(
  text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) to anon, authenticated;

alter table public.site_analytics_events enable row level security;

revoke all on table public.site_analytics_events from public, anon, authenticated;
grant select, insert, delete on table public.site_analytics_events to authenticated;

drop policy if exists site_analytics_events_public_insert on public.site_analytics_events;
drop policy if exists site_analytics_events_admin_insert on public.site_analytics_events;

grant execute on function public.can_accept_site_analytics_event(
  text, text, text, text, text, text, text, text, text, text, text,
  integer, integer, text, text, jsonb
) to authenticated;

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
);

notify pgrst, 'reload schema';
