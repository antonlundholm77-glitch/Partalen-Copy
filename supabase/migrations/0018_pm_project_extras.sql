-- 0018: Utökad projektdatamodell för anläggningsprojekt
--
-- Fem nya tabeller med samma mönster som pm_phases/pm_disciplines/pm_deliverables:
-- id (uuid pk), project_id (fk cascade), sort_order, created_at, RLS via
-- gf_can_access_unit (select) + gf_can_manage_unit (write).
--
-- Generiskt schema — används av valfritt projekt (pm_stakeholders,
-- pm_restrictions, pm_penalties, pm_contract_deviations, pm_quantity_items).

-- =============================================================================
-- pm_stakeholders — intressenter, ledningsägare, sidoentreprenörer
-- =============================================================================
create table public.pm_stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  category text not null,
  -- 'bestallare' | 'entreprenor' | 'konsult' | 'ledningsagare' |
  -- 'sidoentreprenor' | 'myndighet' | 'ovrigt'
  name text not null,
  organization text,
  role text,
  email text,
  phone text,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index pm_stakeholders_project_id_idx on public.pm_stakeholders(project_id);
alter table public.pm_stakeholders enable row level security;
create policy "pm_stakeholders_select" on public.pm_stakeholders
  for select using (gf_can_access_unit(project_id));
create policy "pm_stakeholders_write" on public.pm_stakeholders
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

-- =============================================================================
-- pm_restrictions — projekt- och arbetsrestriktioner
-- =============================================================================
create table public.pm_restrictions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  category text not null,
  -- 'trafik' | 'arbetsmiljo' | 'sasong' | 'miljo' | 'ovrigt'
  title text not null,
  description text,
  period text,
  severity text default 'info',
  -- 'kritisk' | 'viktig' | 'info'
  sort_order int default 0,
  created_at timestamptz default now()
);

create index pm_restrictions_project_id_idx on public.pm_restrictions(project_id);
alter table public.pm_restrictions enable row level security;
create policy "pm_restrictions_select" on public.pm_restrictions
  for select using (gf_can_access_unit(project_id));
create policy "pm_restrictions_write" on public.pm_restrictions
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

-- =============================================================================
-- pm_penalties — vites + bonus
-- =============================================================================
create table public.pm_penalties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  kind text not null,
  -- 'vite' | 'bonus'
  category text,
  -- 'forsening' | 'arbetsmiljo' | 'klimat' | 'kvalitet' | 'ovrigt'
  title text not null,
  description text,
  amount numeric,
  unit text,
  -- 'SEK', 'SEK/vecka', 'SEK/kWh', '%', 'klumpsumma'
  cap numeric,
  conditions text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index pm_penalties_project_id_idx on public.pm_penalties(project_id);
alter table public.pm_penalties enable row level security;
create policy "pm_penalties_select" on public.pm_penalties
  for select using (gf_can_access_unit(project_id));
create policy "pm_penalties_write" on public.pm_penalties
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

-- =============================================================================
-- pm_contract_deviations — AB 04-ändringar och kontraktsavvikelser
-- =============================================================================
create table public.pm_contract_deviations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  section text,
  -- t.ex. 'AB 04 5:3'
  title text not null,
  original_text text,
  modified_text text,
  reason text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index pm_contract_deviations_project_id_idx on public.pm_contract_deviations(project_id);
alter table public.pm_contract_deviations enable row level security;
create policy "pm_contract_deviations_select" on public.pm_contract_deviations
  for select using (gf_can_access_unit(project_id));
create policy "pm_contract_deviations_write" on public.pm_contract_deviations
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

-- =============================================================================
-- pm_quantity_items — Mängdförteckning (MF) enligt AMA
-- =============================================================================
create table public.pm_quantity_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  ama_code text,
  -- huvudsektion 'B'/'C'/'D'/'P'/'Y'
  sub_code text,
  -- mer specifik AMA-kod (t.ex. 'CEC.2111')
  description text not null,
  unit text,
  -- 'm³'/'kg'/'st'/'tim'/'klumpsumma'
  quantity numeric,
  unit_price numeric,
  total numeric generated always as (
    case
      when quantity is not null and unit_price is not null
        then quantity * unit_price
      else null
    end
  ) stored,
  discipline_id uuid references public.pm_disciplines(id) on delete set null,
  section text,
  -- läsbar sektionsrubrik
  sort_order int default 0,
  created_at timestamptz default now()
);

create index pm_quantity_items_project_id_idx on public.pm_quantity_items(project_id);
create index pm_quantity_items_discipline_id_idx on public.pm_quantity_items(discipline_id);
create index pm_quantity_items_ama_code_idx on public.pm_quantity_items(ama_code);
alter table public.pm_quantity_items enable row level security;
create policy "pm_quantity_items_select" on public.pm_quantity_items
  for select using (gf_can_access_unit(project_id));
create policy "pm_quantity_items_write" on public.pm_quantity_items
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));
