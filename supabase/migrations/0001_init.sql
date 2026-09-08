-- SmartPrep — initialt schema
-- Alla objekt prefixas med gf_ för att samexistera med andra appar i samma
-- Supabase-projekt (delat public-schema). Multi-tenant (org-baserat) med RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table gf_organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create type gf_member_role as enum ('owner', 'admin', 'member');

create table gf_memberships (
  user_id     uuid not null references auth.users (id) on delete cascade,
  org_id      uuid not null references gf_organizations (id) on delete cascade,
  role        gf_member_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (user_id, org_id)
);

create or replace function public.gf_is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gf_memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Delad referens: AMA-kodträd
-- ---------------------------------------------------------------------------
create table gf_ama_codes (
  code         text primary key,
  parent_code  text references gf_ama_codes (code) on delete cascade,
  title        text not null,
  sort         integer not null default 0
);
create index gf_ama_codes_parent_idx on gf_ama_codes (parent_code);

-- ---------------------------------------------------------------------------
-- Projektdata (org-scopat)
-- ---------------------------------------------------------------------------
create type gf_project_status as enum ('pagaende', 'arkiverat');

-- Livscykel — gäller endast projekt (entreprenad), inte kurser.
create type gf_project_phase as enum (
  'forstudie', 'projektering', 'upphandling', 'anbud',
  'utforande', 'overlamning', 'forvaltning'
);

create table gf_projects (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references gf_organizations (id) on delete cascade,
  name           text not null,
  ama_edition    text,
  contract_form  text,
  phase          gf_project_phase not null default 'forstudie',
  status         gf_project_status not null default 'pagaende',
  created_at     timestamptz not null default now()
);
create index gf_projects_org_idx on gf_projects (org_id);

create table gf_tb_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references gf_projects (id) on delete cascade,
  ama_code    text not null references gf_ama_codes (code),
  text        text not null,
  unique (project_id, ama_code)
);
create index gf_tb_entries_project_idx on gf_tb_entries (project_id);

create table gf_mf_rows (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references gf_projects (id) on delete cascade,
  ama_code     text not null references gf_ama_codes (code),
  description  text not null,
  unit         text,
  quantity     numeric,
  unit_price   numeric,
  amount       numeric,
  sort         integer not null default 0
);
create index gf_mf_rows_project_idx on gf_mf_rows (project_id);
create index gf_mf_rows_code_idx on gf_mf_rows (project_id, ama_code);

create table gf_ama_checklists (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references gf_projects (id) on delete cascade,
  ama_code    text not null references gf_ama_codes (code),
  items       jsonb not null default '[]'::jsonb,
  unique (project_id, ama_code)
);
create index gf_ama_checklists_project_idx on gf_ama_checklists (project_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table gf_organizations  enable row level security;
alter table gf_memberships    enable row level security;
alter table gf_ama_codes      enable row level security;
alter table gf_projects       enable row level security;
alter table gf_tb_entries     enable row level security;
alter table gf_mf_rows        enable row level security;
alter table gf_ama_checklists enable row level security;

create policy org_select on gf_organizations
  for select using (gf_is_org_member(id));

create policy membership_select on gf_memberships
  for select using (user_id = auth.uid());

create policy ama_codes_select on gf_ama_codes
  for select using (auth.role() = 'authenticated');

create policy projects_all on gf_projects
  for all using (gf_is_org_member(org_id)) with check (gf_is_org_member(org_id));

create policy tb_all on gf_tb_entries
  for all using (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  ) with check (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  );

create policy mf_all on gf_mf_rows
  for all using (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  ) with check (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  );

create policy checklists_all on gf_ama_checklists
  for all using (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  ) with check (
    gf_is_org_member((select org_id from gf_projects p where p.id = project_id))
  );
