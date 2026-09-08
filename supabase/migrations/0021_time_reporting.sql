-- ===========================================================================
-- 0021 — Tidrapportering: utvidga gf_resources + ny gf_time_entries
-- ===========================================================================
-- Parallellt med resursplaneringen (planerade timmar i gf_resource_allocations)
-- lägger vi tidrapportering — utfört arbete per dag och projekt. Båda vyerna
-- lever under /intern/resurser som två flikar (Planerat / Utfört).
--
-- gf_resources får två nya kolumner:
--   • user_id            — FK till auth.users; krävs för att rapportera tid
--   • employment_type    — 'employee' eller 'consultant'; bara anställda
--                          rapporterar tid i fas 1. Konsulter syns kvar
--                          i resursplaneringen.
--
-- gf_time_entries lagrar varje rapporterad post (dag × projekt × aktivitet).
-- RLS: användaren ser/skriver bara sina egna rader; plattformsadmin ser allt.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- gf_resources — utvidgning
-- =============================================================================
alter table public.gf_resources
  add column user_id uuid references auth.users(id) on delete set null,
  add column employment_type text not null default 'employee'
    check (employment_type in ('employee','consultant'));

-- Markera Anna Alavaara som konsult (redan flaggad via role='Konsult').
update public.gf_resources
  set employment_type = 'consultant'
  where role = 'Konsult';

-- Backfill user_id för resurser vars namn matchar en gf_profile.
-- Idag finns Kent + Anders i gf_profiles; resten saknar konto än.
update public.gf_resources r
  set user_id = p.user_id
  from public.gf_profiles p
  where lower(p.full_name) = lower(r.name)
    and r.user_id is null;

create index gf_resources_user_id_idx on public.gf_resources(user_id);

-- =============================================================================
-- gf_time_entries — utfört arbete per dag × projekt × aktivitet
-- =============================================================================
create table public.gf_time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.gf_projects(id) on delete set null,
  activity text not null check (activity in (
    'projektering','mote','granskning','uppdragsledning','internt','franvaro'
  )),
  entry_date date not null,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  note text,
  status text not null default 'draft'
    check (status in ('draft','submitted','locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_time_entries_user_date_idx
  on public.gf_time_entries(user_id, entry_date);
create index gf_time_entries_project_date_idx
  on public.gf_time_entries(project_id, entry_date);

alter table public.gf_time_entries enable row level security;

-- Användare ser och hanterar sina egna rader. Plattformsadmin ser allt.
create policy "gf_time_entries_select" on public.gf_time_entries
  for select using (user_id = auth.uid() or gf_is_platform_admin());

create policy "gf_time_entries_insert" on public.gf_time_entries
  for insert with check (user_id = auth.uid() or gf_is_platform_admin());

create policy "gf_time_entries_update" on public.gf_time_entries
  for update
  using (user_id = auth.uid() or gf_is_platform_admin())
  with check (user_id = auth.uid() or gf_is_platform_admin());

create policy "gf_time_entries_delete" on public.gf_time_entries
  for delete using (user_id = auth.uid() or gf_is_platform_admin());

-- Updated_at-trigger (samma funktion som gf_schedules / gf_resources)
create trigger gf_time_entries_updated_at before update on public.gf_time_entries
  for each row execute function public.gf_schedules_set_updated_at();
