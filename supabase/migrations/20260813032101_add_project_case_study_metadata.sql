alter table public.projects
  add column if not exists case_study jsonb;

comment on column public.projects.case_study is
  'Optional versioned case-study object with context, problem, approach, tools, solution, impact, evidence, and source metadata.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_case_study_object_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_case_study_object_check
      check (case_study is null or jsonb_typeof(case_study) = 'object');
  end if;
end
$$;
