-- ===========================================================================
-- 0026 — Resursplanering: gf_resources + gf_resource_allocations
-- ===========================================================================
-- Backar /intern/resursplanering — intern vy av Kund ▸ Uppdrag ▸
-- Resurs. RLS gör att bara plattformsadmin (gf_is_platform_admin) kan läsa
-- och skriva.
--
-- Resurser seedas från RESOURCE_ROSTER i lib/resource-planning.ts (det
-- faktiska leveransteamet). Allokeringarna lämnas tomma — UI:n börjar med en
-- ren startbild och planering bygger upp datan därefter.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- gf_resources — leveransteamet
-- =============================================================================
create table public.gf_resources (
  id text primary key,                                       -- 'kent', 'clas', ...
  name text not null,
  role text,                                                 -- null = intern, 'Konsult' för externa
  capacity_hours_per_week numeric not null default 40,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_resources_active_idx on public.gf_resources(active, sort_order);

alter table public.gf_resources enable row level security;

create policy "gf_resources_select" on public.gf_resources
  for select using (gf_is_platform_admin());

create policy "gf_resources_write" on public.gf_resources
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

-- =============================================================================
-- gf_resource_allocations — timmar per (resurs × projekt × ISO-vecka)
-- =============================================================================
create table public.gf_resource_allocations (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  iso_year int not null,
  iso_week int not null check (iso_week between 1 and 53),
  hours numeric not null check (hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id, project_id, iso_year, iso_week)
);

create index gf_resource_allocations_resource_idx
  on public.gf_resource_allocations(resource_id);
create index gf_resource_allocations_project_idx
  on public.gf_resource_allocations(project_id);
create index gf_resource_allocations_week_idx
  on public.gf_resource_allocations(iso_year, iso_week);

alter table public.gf_resource_allocations enable row level security;

create policy "gf_resource_allocations_select" on public.gf_resource_allocations
  for select using (gf_is_platform_admin());

create policy "gf_resource_allocations_write" on public.gf_resource_allocations
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

-- =============================================================================
-- Updated_at-trigger (återanvänder funktion från 0021)
-- =============================================================================
create trigger gf_resources_updated_at before update on public.gf_resources
  for each row execute function public.gf_schedules_set_updated_at();

create trigger gf_resource_allocations_updated_at before update on public.gf_resource_allocations
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- Seed — resurser (RESOURCE_ROSTER i lib/resource-planning.ts)
-- Allokeringarna lämnas tomma — användaren bygger upp planeringen i UI:n.
-- =============================================================================
insert into public.gf_resources (id, name, role, capacity_hours_per_week, sort_order) values
  ('kent',    'Kent Karlsson',       null,      40, 1),
  ('clas',    'Clas Tosser',         null,      40, 2),
  ('camilla', 'Camilla Sondermann',  null,      40, 3),
  ('anders',  'Anders Strömberg',    null,      40, 4),
  ('annak',   'Anna Karlsson',       null,      32, 5),
  ('annaa',   'Anna Alavaara',       'Konsult', 24, 6)
on conflict (id) do nothing;
