-- 0015: Leverabel-modellen från PM Cloud
--
-- Tre nya tabeller, alla per projekt:
--   pm_disciplines  — teknikområden (Arkitektur, Konstruktion, El, ...)
--   pm_phases       — rich phase-data utöver gf_project_phase enum
--                     (PM Cloud-stages 0-7 med progress, keyActivities)
--   pm_deliverables — leverabler (D001-) med metadata, FK till phase + discipline
--
-- Plus: gf_documents.deliverable_id för att koppla dokument till en leverabel.
--
-- RLS: alla tre tabeller använder gf_can_access_unit(project_id) — samma
-- access-modell som projekt-data. Inga separata roller.

-- =============================================================================
-- pm_disciplines
-- =============================================================================
create table public.pm_disciplines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  code text not null,
  name text not null,
  color text,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (project_id, code)
);

create index pm_disciplines_project_id_idx on public.pm_disciplines(project_id);

alter table public.pm_disciplines enable row level security;

create policy "pm_disciplines_access" on public.pm_disciplines
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

-- =============================================================================
-- pm_phases — rich data per projekt-fas (PM Cloud-stages 0-7)
-- =============================================================================
create table public.pm_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  stage text not null,
  name text not null,
  description text,
  status text default 'upcoming',
  progress int default 0,
  completion_date date,
  key_activities text[],
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (project_id, stage)
);

create index pm_phases_project_id_idx on public.pm_phases(project_id);

alter table public.pm_phases enable row level security;

create policy "pm_phases_access" on public.pm_phases
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

-- =============================================================================
-- pm_deliverables
-- =============================================================================
create table public.pm_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  phase_id uuid references public.pm_phases(id) on delete set null,
  discipline_id uuid references public.pm_disciplines(id) on delete set null,
  status text default 'ej-paborjad',
  format text,
  information_content text[],
  responsible text,
  due_date date,
  building text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, code)
);

create index pm_deliverables_project_id_idx on public.pm_deliverables(project_id);
create index pm_deliverables_phase_id_idx on public.pm_deliverables(phase_id);
create index pm_deliverables_discipline_id_idx on public.pm_deliverables(discipline_id);

alter table public.pm_deliverables enable row level security;

create policy "pm_deliverables_access" on public.pm_deliverables
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

-- =============================================================================
-- gf_documents.deliverable_id — koppla dokument till en leverabel
-- =============================================================================
alter table public.gf_documents
  add column deliverable_id uuid references public.pm_deliverables(id) on delete set null;

create index gf_documents_deliverable_id_idx on public.gf_documents(deliverable_id);
