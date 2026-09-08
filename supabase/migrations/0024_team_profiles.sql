-- ===========================================================================
-- 0031 — Team-profiler på plattformsnivå
-- ===========================================================================
-- Bygger ovanpå gf_resources (medarbetare och konsulter) med:
--   • Profilfält direkt på gf_resources (titel, bio, kontakt, kompetenser)
--   • gf_team_education          — utbildningar
--   • gf_team_certifications     — certifieringar
--   • gf_team_experiences        — referensuppdrag (FK gf_projects + extern)
--   • Storage-bucket gf-team-avatars (privat, signed URLs i UI:n)
--
-- Alla tabeller och bucket är platform-admin-only.
-- Externa referensuppdrag (uppdrag utanför plattformen, t.ex. tidigare jobb)
-- har project_id=null och fritext-fält för kund/projekt.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- gf_resources — profilfält
-- =============================================================================
alter table public.gf_resources
  add column title text,
  add column bio text,
  add column email text,
  add column phone text,
  add column linkedin_url text,
  add column avatar_path text,                    -- '<resource_id>/<file>' i gf-team-avatars
  add column skills text[] not null default '{}',
  add column languages text[] not null default '{}',
  add column start_year int;

create index gf_resources_skills_idx on public.gf_resources using gin(skills);

-- =============================================================================
-- gf_team_education — utbildningar
-- =============================================================================
create table public.gf_team_education (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  institution text not null,                      -- "Luleå tekniska universitet"
  degree text,                                    -- "Civilingenjör väg- och vattenbyggnad"
  year_from int,
  year_to int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_team_education_resource_idx
  on public.gf_team_education(resource_id, sort_order);

alter table public.gf_team_education enable row level security;

create policy "gf_team_education_read" on public.gf_team_education
  for select using (gf_is_platform_admin());

create policy "gf_team_education_write" on public.gf_team_education
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_team_education_updated_at before update on public.gf_team_education
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- gf_team_certifications — certifieringar
-- =============================================================================
create table public.gf_team_certifications (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  name text not null,                             -- "BAS-P / BAS-U"
  issuer text,                                    -- "Arbetsmiljöverket"
  issued_year int,
  expires_year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_team_certifications_resource_idx
  on public.gf_team_certifications(resource_id, sort_order);

alter table public.gf_team_certifications enable row level security;

create policy "gf_team_certifications_read" on public.gf_team_certifications
  for select using (gf_is_platform_admin());

create policy "gf_team_certifications_write" on public.gf_team_certifications
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_team_certifications_updated_at before update on public.gf_team_certifications
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- gf_team_experiences — referensuppdrag
-- =============================================================================
-- Kopplar antingen till ett befintligt gf_projects.id (interna uppdrag) eller
-- har fritext-fält för historiska/externa uppdrag (tidigare jobb).
create table public.gf_team_experiences (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  project_id uuid references public.gf_projects(id) on delete set null,
  -- Fritext för externa uppdrag (ignoreras om project_id är satt)
  external_project_name text,
  external_client_name text,
  role text,                                      -- "Projektör", "Uppdragsledare"
  description text,
  year_from int,
  year_to int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_id is not null or external_project_name is not null)
);

create index gf_team_experiences_resource_idx
  on public.gf_team_experiences(resource_id, sort_order);
create index gf_team_experiences_project_idx
  on public.gf_team_experiences(project_id);

alter table public.gf_team_experiences enable row level security;

create policy "gf_team_experiences_read" on public.gf_team_experiences
  for select using (gf_is_platform_admin());

create policy "gf_team_experiences_write" on public.gf_team_experiences
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_team_experiences_updated_at before update on public.gf_team_experiences
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- Storage-bucket gf-team-avatars (privat, signed URLs i UI:n)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('gf-team-avatars', 'gf-team-avatars', false)
on conflict (id) do nothing;

create policy "gf_team_avatars_storage_select" on storage.objects
  for select using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

create policy "gf_team_avatars_storage_insert" on storage.objects
  for insert with check (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

create policy "gf_team_avatars_storage_update" on storage.objects
  for update
  using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin())
  with check (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

create policy "gf_team_avatars_storage_delete" on storage.objects
  for delete using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

-- =============================================================================
-- Backfill — sätt titlar och språk på befintliga 6 resurser som rimliga starter
-- (kan ändras direkt i UI:n efteråt).
-- =============================================================================
update public.gf_resources
  set title = case id
    when 'kent' then 'Grundare · operatör'
    when 'clas' then 'Projektör · samhällsbyggnad'
    when 'camilla' then 'Uppdragsledning · kvalitet'
    when 'anders' then 'Plattform · utveckling'
    when 'annak' then 'Operatör · process'
    when 'annaa' then 'Konsult'
    else null
  end,
  languages = '{"Svenska","Engelska"}'::text[]
where id in ('kent','clas','camilla','anders','annak','annaa');
