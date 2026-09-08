-- 0021: Tidplanmodulen — gf_schedules, gf_tasks, gf_task_dependencies,
--       gf_calendars, gf_calendar_exceptions, gf_schedule_baselines
--
-- Tidplanen är en separat schedule-entitet, inte en utökning av pm_phases.
-- pm_phases behålls för ProcessView (`/process`). På sikt kan
-- gf_schedules.kind = 'process' ersätta pm_phases — men inte i denna migration.
--
-- RLS följer mönstret från 0019:
--   select: gf_can_access_unit  (Owner/User/Visitor på projekt)
--   insert/update: gf_can_upload_unit  (Owner/User, inte Visitor)
--   delete: gf_can_manage_unit  (Owner)
--
-- För kalendrar:
--   customer_id IS NULL  →  system-global (svensk standardkalender) — alla läser
--   customer_id satt    →  kund-egendom (alla kundmedlemmar läser, kund-admin skriver)
--
-- Protokolldisciplin: schemat exponerar bara stabila kolumner som matchar
-- lib/scheduling/schema.ts. Cache-kolumner för CPM (computed_*, *_float_*,
-- is_critical) är frivilliga — de uppdateras av CPM-körningen.

-- =============================================================================
-- Enums
-- =============================================================================

do $$ begin
  create type gf_schedule_kind as enum ('main', 'tender', 'what-if', 'baseline-only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gf_schedule_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gf_task_type as enum ('summary', 'task', 'milestone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gf_dep_type as enum ('FS', 'SS', 'FF', 'SF');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gf_constraint_type as enum (
    'ASAP', 'ALAP', 'MSO', 'MFO', 'SNET', 'SNLT', 'FNET', 'FNLT'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type gf_calendar_exception_type as enum ('holiday', 'workday', 'partial');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- gf_calendars (customer-scoped, NULL = system-global)
-- =============================================================================

create table public.gf_calendars (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.gf_organizations(id) on delete cascade,
  ref text not null,                              -- mänskligt läsbar ref ("se-standard")
  name text not null,
  description text,
  working_days int[] not null default '{1,2,3,4,5}',  -- ISO weekday, 1=mån
  working_hours_per_day numeric not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index gf_calendars_ref_per_customer
  on public.gf_calendars (coalesce(customer_id::text, '__system__'), ref);

create index gf_calendars_customer_id_idx on public.gf_calendars(customer_id);

alter table public.gf_calendars enable row level security;

-- Läs: system-global eller kundmedlem
create policy "gf_calendars_select" on public.gf_calendars
  for select
  using (customer_id is null or gf_is_org_member(customer_id));

-- Skriv: bara org-admin för kund-kalendrar, plattformsadmin för system-globala
create policy "gf_calendars_insert" on public.gf_calendars
  for insert
  with check (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  );

create policy "gf_calendars_update" on public.gf_calendars
  for update
  using (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  )
  with check (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  );

create policy "gf_calendars_delete" on public.gf_calendars
  for delete
  using (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  );

-- =============================================================================
-- gf_calendar_exceptions
-- =============================================================================

create table public.gf_calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.gf_calendars(id) on delete cascade,
  date date not null,
  type gf_calendar_exception_type not null,
  hours numeric,                                   -- används vid type='partial'
  label text
);

create unique index gf_calendar_exceptions_unique on public.gf_calendar_exceptions(calendar_id, date);
create index gf_calendar_exceptions_calendar_id_idx on public.gf_calendar_exceptions(calendar_id);

alter table public.gf_calendar_exceptions enable row level security;

-- Ärver tillgång från kalendern
create policy "gf_calendar_exceptions_select" on public.gf_calendar_exceptions
  for select
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and (c.customer_id is null or gf_is_org_member(c.customer_id))
  ));

create policy "gf_calendar_exceptions_insert" on public.gf_calendar_exceptions
  for insert
  with check (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

create policy "gf_calendar_exceptions_update" on public.gf_calendar_exceptions
  for update
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

create policy "gf_calendar_exceptions_delete" on public.gf_calendar_exceptions
  for delete
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

-- =============================================================================
-- gf_schedules
-- =============================================================================

create table public.gf_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  name text not null,
  kind gf_schedule_kind not null default 'main',
  status gf_schedule_status not null default 'draft',
  calendar_id uuid references public.gf_calendars(id) on delete restrict,
  project_start_date date,
  data_date date,                                 -- "as of"-datum för actuals
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index gf_schedules_project_id_idx on public.gf_schedules(project_id);

alter table public.gf_schedules enable row level security;

create policy "gf_schedules_select" on public.gf_schedules
  for select using (gf_can_access_unit(project_id));

create policy "gf_schedules_insert" on public.gf_schedules
  for insert with check (gf_can_upload_unit(project_id));

create policy "gf_schedules_update" on public.gf_schedules
  for update
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

create policy "gf_schedules_delete" on public.gf_schedules
  for delete using (gf_can_manage_unit(project_id));

-- =============================================================================
-- gf_tasks (rekursiv WBS-tree)
-- =============================================================================

create table public.gf_tasks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.gf_schedules(id) on delete cascade,
  parent_id uuid references public.gf_tasks(id) on delete cascade,
  external_uid text,                              -- för round-trip via JSON/MSP
  wbs_code text,
  name text not null,
  type gf_task_type not null default 'task',
  -- planerat
  planned_start date,
  planned_end date,
  planned_duration_days int,                      -- arbetsdagar
  -- baseline (frusen vid baselining)
  baseline_start date,
  baseline_end date,
  -- faktisk
  actual_start date,
  actual_end date,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  -- constraint (MSP-stil)
  constraint_type gf_constraint_type not null default 'ASAP',
  constraint_date date,
  -- CPM-cache (uppdateras av CPM-körning)
  computed_early_start date,
  computed_early_finish date,
  computed_late_start date,
  computed_late_finish date,
  total_float_days int,
  free_float_days int,
  is_critical boolean not null default false,
  -- meta
  sort_order int not null default 0,
  discipline_id uuid references public.pm_disciplines(id) on delete set null,
  deliverable_id uuid references public.pm_deliverables(id) on delete set null,
  responsible text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_tasks_schedule_id_idx on public.gf_tasks(schedule_id);
create index gf_tasks_parent_id_idx on public.gf_tasks(parent_id);
create index gf_tasks_critical_idx on public.gf_tasks(schedule_id, is_critical) where is_critical;
create unique index gf_tasks_external_uid_per_schedule
  on public.gf_tasks(schedule_id, external_uid) where external_uid is not null;

alter table public.gf_tasks enable row level security;

-- RLS via schemat → projektet. SECURITY DEFINER-funktioner är cachebara.
create policy "gf_tasks_select" on public.gf_tasks
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

create policy "gf_tasks_insert" on public.gf_tasks
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

create policy "gf_tasks_update" on public.gf_tasks
  for update
  using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

create policy "gf_tasks_delete" on public.gf_tasks
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

-- =============================================================================
-- gf_task_dependencies
-- =============================================================================

create table public.gf_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.gf_schedules(id) on delete cascade,
  predecessor_id uuid not null references public.gf_tasks(id) on delete cascade,
  successor_id uuid not null references public.gf_tasks(id) on delete cascade,
  type gf_dep_type not null default 'FS',
  lag_days int not null default 0,
  created_at timestamptz not null default now(),
  check (predecessor_id <> successor_id),
  unique (predecessor_id, successor_id, type)
);

create index gf_task_dependencies_schedule_id_idx on public.gf_task_dependencies(schedule_id);
create index gf_task_dependencies_predecessor_idx on public.gf_task_dependencies(predecessor_id);
create index gf_task_dependencies_successor_idx on public.gf_task_dependencies(successor_id);

alter table public.gf_task_dependencies enable row level security;

create policy "gf_task_dependencies_select" on public.gf_task_dependencies
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

create policy "gf_task_dependencies_insert" on public.gf_task_dependencies
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

create policy "gf_task_dependencies_update" on public.gf_task_dependencies
  for update
  using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

create policy "gf_task_dependencies_delete" on public.gf_task_dependencies
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

-- =============================================================================
-- gf_schedule_baselines (frusna snapshots)
-- =============================================================================

create table public.gf_schedule_baselines (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.gf_schedules(id) on delete cascade,
  name text not null,
  snapshot_at timestamptz not null default now(),
  snapshot_data jsonb not null,                   -- frusen kopia av tasks + deps
  created_by uuid references auth.users(id)
);

create index gf_schedule_baselines_schedule_id_idx on public.gf_schedule_baselines(schedule_id);

alter table public.gf_schedule_baselines enable row level security;

create policy "gf_schedule_baselines_select" on public.gf_schedule_baselines
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

create policy "gf_schedule_baselines_insert" on public.gf_schedule_baselines
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

-- Baselines är immutabla i designen, men plattformsadmin kan radera vid behov
create policy "gf_schedule_baselines_delete" on public.gf_schedule_baselines
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

-- =============================================================================
-- Updated_at-trigger för relevanta tabeller
-- =============================================================================

create or replace function public.gf_schedules_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger gf_schedules_updated_at before update on public.gf_schedules
  for each row execute function public.gf_schedules_set_updated_at();

create trigger gf_tasks_updated_at before update on public.gf_tasks
  for each row execute function public.gf_schedules_set_updated_at();

create trigger gf_calendars_updated_at before update on public.gf_calendars
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- Seed: Svensk standardkalender (customer_id = NULL → system-global)
-- =============================================================================

insert into public.gf_calendars (id, customer_id, ref, name, description, working_days, working_hours_per_day)
values (
  '10000000-0000-0000-0000-000000000001',
  null,
  'se-standard',
  'Svensk arbetskalender (standard)',
  'Mån–fre, 8h per dag, svenska helgdagar 2026–2028.',
  '{1,2,3,4,5}',
  8
);

-- Helgdagar 2026–2028
insert into public.gf_calendar_exceptions (calendar_id, date, type, label) values
  ('10000000-0000-0000-0000-000000000001', '2026-01-01', 'holiday', 'Nyårsdagen'),
  ('10000000-0000-0000-0000-000000000001', '2026-01-06', 'holiday', 'Trettondedag jul'),
  ('10000000-0000-0000-0000-000000000001', '2026-04-03', 'holiday', 'Långfredagen'),
  ('10000000-0000-0000-0000-000000000001', '2026-04-05', 'holiday', 'Påskdagen'),
  ('10000000-0000-0000-0000-000000000001', '2026-04-06', 'holiday', 'Annandag påsk'),
  ('10000000-0000-0000-0000-000000000001', '2026-05-01', 'holiday', 'Första maj'),
  ('10000000-0000-0000-0000-000000000001', '2026-05-14', 'holiday', 'Kristi himmelsfärd'),
  ('10000000-0000-0000-0000-000000000001', '2026-06-06', 'holiday', 'Sveriges nationaldag'),
  ('10000000-0000-0000-0000-000000000001', '2026-06-19', 'holiday', 'Midsommarafton'),
  ('10000000-0000-0000-0000-000000000001', '2026-06-20', 'holiday', 'Midsommardagen'),
  ('10000000-0000-0000-0000-000000000001', '2026-10-31', 'holiday', 'Alla helgons dag'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-24', 'holiday', 'Julafton'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-25', 'holiday', 'Juldagen'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-26', 'holiday', 'Annandag jul'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-31', 'holiday', 'Nyårsafton'),
  ('10000000-0000-0000-0000-000000000001', '2027-01-01', 'holiday', 'Nyårsdagen'),
  ('10000000-0000-0000-0000-000000000001', '2027-01-06', 'holiday', 'Trettondedag jul'),
  ('10000000-0000-0000-0000-000000000001', '2027-03-26', 'holiday', 'Långfredagen'),
  ('10000000-0000-0000-0000-000000000001', '2027-03-28', 'holiday', 'Påskdagen'),
  ('10000000-0000-0000-0000-000000000001', '2027-03-29', 'holiday', 'Annandag påsk'),
  ('10000000-0000-0000-0000-000000000001', '2027-05-01', 'holiday', 'Första maj'),
  ('10000000-0000-0000-0000-000000000001', '2027-05-06', 'holiday', 'Kristi himmelsfärd'),
  ('10000000-0000-0000-0000-000000000001', '2027-06-06', 'holiday', 'Sveriges nationaldag'),
  ('10000000-0000-0000-0000-000000000001', '2027-06-25', 'holiday', 'Midsommarafton'),
  ('10000000-0000-0000-0000-000000000001', '2027-06-26', 'holiday', 'Midsommardagen'),
  ('10000000-0000-0000-0000-000000000001', '2027-11-06', 'holiday', 'Alla helgons dag'),
  ('10000000-0000-0000-0000-000000000001', '2027-12-24', 'holiday', 'Julafton'),
  ('10000000-0000-0000-0000-000000000001', '2027-12-25', 'holiday', 'Juldagen'),
  ('10000000-0000-0000-0000-000000000001', '2027-12-26', 'holiday', 'Annandag jul'),
  ('10000000-0000-0000-0000-000000000001', '2027-12-31', 'holiday', 'Nyårsafton'),
  ('10000000-0000-0000-0000-000000000001', '2028-01-01', 'holiday', 'Nyårsdagen'),
  ('10000000-0000-0000-0000-000000000001', '2028-01-06', 'holiday', 'Trettondedag jul'),
  ('10000000-0000-0000-0000-000000000001', '2028-04-14', 'holiday', 'Långfredagen'),
  ('10000000-0000-0000-0000-000000000001', '2028-04-16', 'holiday', 'Påskdagen'),
  ('10000000-0000-0000-0000-000000000001', '2028-04-17', 'holiday', 'Annandag påsk'),
  ('10000000-0000-0000-0000-000000000001', '2028-05-01', 'holiday', 'Första maj'),
  ('10000000-0000-0000-0000-000000000001', '2028-05-25', 'holiday', 'Kristi himmelsfärd'),
  ('10000000-0000-0000-0000-000000000001', '2028-06-06', 'holiday', 'Sveriges nationaldag'),
  ('10000000-0000-0000-0000-000000000001', '2028-06-23', 'holiday', 'Midsommarafton'),
  ('10000000-0000-0000-0000-000000000001', '2028-06-24', 'holiday', 'Midsommardagen'),
  ('10000000-0000-0000-0000-000000000001', '2028-11-04', 'holiday', 'Alla helgons dag'),
  ('10000000-0000-0000-0000-000000000001', '2028-12-24', 'holiday', 'Julafton'),
  ('10000000-0000-0000-0000-000000000001', '2028-12-25', 'holiday', 'Juldagen'),
  ('10000000-0000-0000-0000-000000000001', '2028-12-26', 'holiday', 'Annandag jul'),
  ('10000000-0000-0000-0000-000000000001', '2028-12-31', 'holiday', 'Nyårsafton');

-- =============================================================================
-- Klar
-- =============================================================================
