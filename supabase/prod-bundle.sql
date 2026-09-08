-- ===========================================================================
-- Part Plattform — prod-bundle (komplett schema, ingen kund-/projektseed)
-- ===========================================================================
-- Klistra in detta i Supabase SQL Editor för ett FRÄSCHT prod-projekt. Filen
-- är en konsolidering av HELA supabase/migrations/ (0001–0027) efter den
-- generiska omstarten — bara DDL (tabeller, typer, funktioner, RLS-policies,
-- index, triggers, extensions) och generisk referens-/konfigurationsdata
-- (svensk standardkalender, dokumentkategorier, Part Groups eget
-- leveransteam). INGEN namngiven kund- eller projektseed finns kvar någonstans
-- i denna fil eller i migrationerna den är byggd från.
--
-- Idempotent: kan köras om utan att skada befintlig data.
-- Efter att denna körts: kör supabase/seed/0001_dev_users.sql (dev, valfritt)
-- och supabase/seed/0002_prod_customers.sql (Part Groups eget bolagsskal).
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ===========================================================================
-- DEL 1 — Kärnschema (från 0001_init.sql + 0004_slug_columns.sql +
--         0005_status_vilande.sql)
-- ===========================================================================

create table if not exists gf_organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

do $$ begin
  create type gf_member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

create table if not exists gf_memberships (
  user_id     uuid not null references auth.users (id) on delete cascade,
  org_id      uuid not null references gf_organizations (id) on delete cascade,
  role        gf_member_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (user_id, org_id)
);

create or replace function public.gf_is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from gf_memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create table if not exists gf_ama_codes (
  code         text primary key,
  parent_code  text references gf_ama_codes (code) on delete cascade,
  title        text not null,
  sort         integer not null default 0
);
create index if not exists gf_ama_codes_parent_idx on gf_ama_codes (parent_code);

do $$ begin
  create type gf_project_status as enum ('pagaende', 'arkiverat');
exception when duplicate_object then null; end $$;

-- Lägg på 'vilande' om saknas (från 0005_status_vilande.sql).
alter type gf_project_status add value if not exists 'vilande';

do $$ begin
  create type gf_project_phase as enum (
    'forstudie', 'projektering', 'upphandling', 'anbud',
    'utforande', 'overlamning', 'forvaltning'
  );
exception when duplicate_object then null; end $$;

create table if not exists gf_projects (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references gf_organizations (id) on delete cascade,
  name           text not null,
  ama_edition    text,
  contract_form  text,
  phase          gf_project_phase not null default 'forstudie',
  status         gf_project_status not null default 'pagaende',
  created_at     timestamptz not null default now()
);
create index if not exists gf_projects_org_idx on gf_projects (org_id);

create table if not exists gf_tb_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references gf_projects (id) on delete cascade,
  ama_code    text not null references gf_ama_codes (code),
  text        text not null,
  unique (project_id, ama_code)
);
create index if not exists gf_tb_entries_project_idx on gf_tb_entries (project_id);

create table if not exists gf_mf_rows (
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
create index if not exists gf_mf_rows_project_idx on gf_mf_rows (project_id);
create index if not exists gf_mf_rows_code_idx on gf_mf_rows (project_id, ama_code);

create table if not exists gf_ama_checklists (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references gf_projects (id) on delete cascade,
  ama_code    text not null references gf_ama_codes (code),
  items       jsonb not null default '[]'::jsonb,
  unique (project_id, ama_code)
);
create index if not exists gf_ama_checklists_project_idx on gf_ama_checklists (project_id);

-- Slug-kolumner (från 0004_slug_columns.sql)
alter table gf_organizations add column if not exists slug text;
alter table gf_projects      add column if not exists slug text;
create unique index if not exists gf_organizations_slug_idx on gf_organizations (slug);
create unique index if not exists gf_projects_org_slug_idx   on gf_projects (org_id, slug);

-- ===========================================================================
-- DEL 2 — Access-modell (från 0002_access.sql)
-- ===========================================================================

create table if not exists gf_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create or replace function public.gf_handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into gf_profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists gf_on_auth_user_created on auth.users;
create trigger gf_on_auth_user_created
  after insert on auth.users
  for each row execute function public.gf_handle_new_user();

do $$ begin
  create type gf_system_role as enum ('superadmin', 'support', 'readonly');
exception when duplicate_object then null; end $$;

create table if not exists gf_system_roles (
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     gf_system_role not null,
  primary key (user_id, role)
);

do $$ begin
  create type gf_unit_role as enum ('manager', 'member', 'viewer', 'larare', 'deltagare');
exception when duplicate_object then null; end $$;

create table if not exists gf_unit_members (
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references gf_projects (id) on delete cascade,
  role        gf_unit_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);
create index if not exists gf_unit_members_project_idx on gf_unit_members (project_id);

do $$ begin
  create type gf_invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists gf_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  org_id      uuid not null references gf_organizations (id) on delete cascade,
  project_id  uuid references gf_projects (id) on delete cascade,
  role        text not null,
  token       text not null unique,
  invited_by  uuid references auth.users (id),
  status      gf_invite_status not null default 'pending',
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);
create index if not exists gf_invitations_email_idx on gf_invitations (lower(email));
create index if not exists gf_invitations_org_idx on gf_invitations (org_id);

create or replace function public.gf_is_platform_admin()
returns boolean language sql stable
as $$
  -- TODO: byt till Part Groups riktiga domän innan produktionslansering.
  select lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) = 'part-group.example';
$$;

create or replace function public.gf_is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from gf_memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.gf_is_unit_member(target_project uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from gf_unit_members u
    where u.project_id = target_project and u.user_id = auth.uid()
  );
$$;

create or replace function public.gf_is_unit_manager(target_project uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from gf_unit_members u
    where u.project_id = target_project and u.user_id = auth.uid()
      and u.role in ('manager', 'larare')
  );
$$;
-- OBS: denna funktion redefinieras i DEL 15 (0017_role_based_rls.sql) för att
-- även inkludera rollen 'owner' — den enum-etiketten läggs till i DEL 14
-- (0016_three_role_levels.sql). Ordningen måste hållas: en enum-etikett kan
-- inte refereras i en funktionskropp innan den finns i typen.

create or replace function public.gf_can_access_org(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select
    gf_is_platform_admin()
    or gf_is_org_member(target_org)
    or exists (
      select 1
      from gf_unit_members um
      join gf_projects p on p.id = um.project_id
      where um.user_id = auth.uid() and p.org_id = target_org
    );
$$;

create or replace function public.gf_can_access_unit(target_project uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select
    gf_is_platform_admin()
    or gf_is_org_member((select org_id from gf_projects p where p.id = target_project))
    or gf_is_unit_member(target_project);
$$;

-- RLS — OR-modellen
alter table gf_organizations  enable row level security;
alter table gf_memberships    enable row level security;
alter table gf_projects       enable row level security;
alter table gf_tb_entries     enable row level security;
alter table gf_mf_rows        enable row level security;
alter table gf_ama_checklists enable row level security;
alter table gf_profiles       enable row level security;
alter table gf_system_roles   enable row level security;
alter table gf_unit_members   enable row level security;
alter table gf_invitations    enable row level security;
alter table gf_ama_codes      enable row level security;

drop policy if exists org_select on gf_organizations;
drop policy if exists org_access on gf_organizations;
drop policy if exists org_admin_all on gf_organizations;
create policy org_access on gf_organizations
  for select using (gf_can_access_org(id));
create policy org_admin_all on gf_organizations
  for all using (gf_is_platform_admin()) with check (gf_is_platform_admin());

drop policy if exists membership_select on gf_memberships;
drop policy if exists membership_manage on gf_memberships;
create policy membership_select on gf_memberships
  for select using (user_id = auth.uid() or gf_is_org_admin(org_id) or gf_is_platform_admin());
create policy membership_manage on gf_memberships
  for all using (gf_is_platform_admin() or gf_is_org_admin(org_id))
  with check (gf_is_platform_admin() or gf_is_org_admin(org_id));

drop policy if exists projects_all on gf_projects;
drop policy if exists projects_access on gf_projects;
create policy projects_access on gf_projects
  for all using (gf_can_access_unit(id)) with check (gf_can_access_unit(id));

drop policy if exists tb_all on gf_tb_entries;
drop policy if exists tb_access on gf_tb_entries;
create policy tb_access on gf_tb_entries
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy if exists mf_all on gf_mf_rows;
drop policy if exists mf_access on gf_mf_rows;
create policy mf_access on gf_mf_rows
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy if exists checklists_all on gf_ama_checklists;
drop policy if exists checklists_access on gf_ama_checklists;
create policy checklists_access on gf_ama_checklists
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy if exists ama_codes_select on gf_ama_codes;
create policy ama_codes_select on gf_ama_codes
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_select on gf_profiles;
create policy profiles_select on gf_profiles
  for select using (user_id = auth.uid() or gf_is_platform_admin());

drop policy if exists system_roles_select on gf_system_roles;
drop policy if exists system_roles_admin on gf_system_roles;
create policy system_roles_select on gf_system_roles
  for select using (user_id = auth.uid() or gf_is_platform_admin());
create policy system_roles_admin on gf_system_roles
  for all using (gf_is_platform_admin()) with check (gf_is_platform_admin());

drop policy if exists unit_members_select on gf_unit_members;
drop policy if exists unit_members_manage on gf_unit_members;
create policy unit_members_select on gf_unit_members
  for select using (user_id = auth.uid() or gf_can_access_unit(project_id));
create policy unit_members_manage on gf_unit_members
  for all using (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  ) with check (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  );

drop policy if exists invitations_manage on gf_invitations;
create policy invitations_manage on gf_invitations
  for all using (
    gf_is_platform_admin()
    or gf_is_org_admin(org_id)
    or (project_id is not null and gf_is_unit_manager(project_id))
    or invited_by = auth.uid()
  ) with check (
    gf_is_platform_admin()
    or gf_is_org_admin(org_id)
    or (project_id is not null and gf_is_unit_manager(project_id))
    or invited_by = auth.uid()
  );

-- gf_accept_invitation: slutgiltig signatur (returns table, från
-- 0011_accept_invitation_returns_slugs.sql — se DEL 9).

-- ===========================================================================
-- DEL 3 — Dokumentbibliotek (från 0003_documents.sql)
-- ===========================================================================

do $$ begin
  create type gf_document_status as enum ('arbetsmaterial', 'granskning', 'godkand');
exception when duplicate_object then null; end $$;

create table if not exists gf_documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references gf_projects (id) on delete cascade,
  name            text not null,
  phase           text,
  discipline      text,
  status          gf_document_status not null default 'arbetsmaterial',
  current_version integer not null default 1,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists gf_documents_project_idx on gf_documents (project_id);

create table if not exists gf_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references gf_documents (id) on delete cascade,
  project_id   uuid not null references gf_projects (id) on delete cascade,
  version      integer not null,
  storage_path text not null,
  size         bigint,
  mime         text,
  uploaded_by  uuid references auth.users (id) on delete set null,
  uploaded_at  timestamptz not null default now(),
  unique (document_id, version)
);
create index if not exists gf_document_versions_doc_idx on gf_document_versions (document_id);

create or replace function public.gf_documents_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists gf_documents_touch_trg on gf_documents;
create trigger gf_documents_touch_trg
  before update on gf_documents
  for each row execute function public.gf_documents_touch();

alter table gf_documents          enable row level security;
alter table gf_document_versions  enable row level security;

-- Policyerna nedan är den ursprungliga "for all"-varianten. De ersätts av
-- rollstyrda select/insert/update/delete-policies i DEL 15
-- (0017_role_based_rls.sql), som droppar "gf_documents_access" innan den
-- skapar de nya.
drop policy if exists gf_documents_access on gf_documents;
create policy gf_documents_access on gf_documents
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy if exists gf_document_versions_access on gf_document_versions;
create policy gf_document_versions_access on gf_document_versions
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

insert into storage.buckets (id, name, public)
values ('gf-documents', 'gf-documents', false)
on conflict (id) do nothing;

drop policy if exists gf_docs_storage_select on storage.objects;
create policy gf_docs_storage_select on storage.objects
  for select using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists gf_docs_storage_insert on storage.objects;
create policy gf_docs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists gf_docs_storage_update on storage.objects;
create policy gf_docs_storage_update on storage.objects
  for update using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists gf_docs_storage_delete on storage.objects;
create policy gf_docs_storage_delete on storage.objects
  for delete using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

-- ===========================================================================
-- DEL 4 — ProjectDoc / kundprofil (från 0006_project_content.sql)
-- ===========================================================================

create table if not exists gf_project_content (
  project_id     uuid primary key references gf_projects (id) on delete cascade,
  content        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

create table if not exists gf_org_content (
  org_id         uuid primary key references gf_organizations (id) on delete cascade,
  content        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

drop trigger if exists gf_project_content_touch_trg on gf_project_content;
create trigger gf_project_content_touch_trg
  before update on gf_project_content
  for each row execute function public.gf_documents_touch();

drop trigger if exists gf_org_content_touch_trg on gf_org_content;
create trigger gf_org_content_touch_trg
  before update on gf_org_content
  for each row execute function public.gf_documents_touch();

alter table gf_project_content enable row level security;
alter table gf_org_content     enable row level security;

drop policy if exists gf_project_content_read on gf_project_content;
create policy gf_project_content_read on gf_project_content
  for select using (gf_can_access_unit(project_id));

drop policy if exists gf_project_content_write on gf_project_content;
create policy gf_project_content_write on gf_project_content
  for all using (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  ) with check (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  );

drop policy if exists gf_org_content_read on gf_org_content;
create policy gf_org_content_read on gf_org_content
  for select using (gf_can_access_org(org_id));

drop policy if exists gf_org_content_write on gf_org_content;
create policy gf_org_content_write on gf_org_content
  for all using (
    gf_is_platform_admin() or gf_is_org_admin(org_id)
  ) with check (
    gf_is_platform_admin() or gf_is_org_admin(org_id)
  );

-- ===========================================================================
-- DEL 5 — Org/enhets-metadata (från 0007_orgs_units_metadata.sql)
-- ===========================================================================

alter table gf_organizations add column if not exists kind             text not null default 'entreprenad';
alter table gf_organizations add column if not exists unit_noun        text not null default 'projekt';
alter table gf_organizations add column if not exists unit_noun_plural text not null default 'Projekt';
alter table gf_organizations drop constraint if exists gf_organizations_kind_check;
alter table gf_organizations
  add constraint gf_organizations_kind_check
  check (kind = 'entreprenad');

alter table gf_projects add column if not exists meta     text;
alter table gf_projects add column if not exists has_data boolean not null default false;
alter table gf_projects add column if not exists program  text;

-- ===========================================================================
-- DEL 6 — Per-projekt-verktygslista (från 0008_project_modules.sql)
-- ===========================================================================

create table if not exists gf_project_modules (
  project_id  uuid not null references gf_projects (id) on delete cascade,
  module_id   text not null,
  enabled     boolean not null default true,
  config      jsonb  not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (project_id, module_id)
);
create index if not exists gf_project_modules_project_idx on gf_project_modules (project_id);

drop trigger if exists gf_project_modules_touch_trg on gf_project_modules;
create trigger gf_project_modules_touch_trg
  before update on gf_project_modules
  for each row execute function public.gf_documents_touch();

alter table gf_project_modules enable row level security;

drop policy if exists gf_project_modules_read on gf_project_modules;
create policy gf_project_modules_read on gf_project_modules
  for select using (gf_can_access_unit(project_id));

drop policy if exists gf_project_modules_write on gf_project_modules;
create policy gf_project_modules_write on gf_project_modules
  for all using (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  ) with check (
    gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects p where p.id = project_id))
    or gf_is_unit_manager(project_id)
  );

-- ===========================================================================
-- DEL 7 — Admin RPC: delete user (från 0009_admin_delete_user.sql)
-- ===========================================================================

create or replace function public.gf_admin_delete_user(target_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not gf_is_platform_admin() then
    raise exception 'Endast plattformsadmin får ta bort användare';
  end if;
  if target_user = auth.uid() then
    raise exception 'Du kan inte ta bort dig själv';
  end if;
  delete from auth.users where id = target_user;
end;
$$;

grant execute on function public.gf_admin_delete_user(uuid) to anon, authenticated;

-- ===========================================================================
-- DEL 8 — gf_documents: description + access_code
--         (från 0010_documents_description_access_code.sql)
-- ===========================================================================

alter table gf_documents add column if not exists description text;
alter table gf_documents add column if not exists access_code text;

-- ===========================================================================
-- DEL 9 — gf_accept_invitation returnerar org_slug + project_slug
--         (från 0011_accept_invitation_returns_slugs.sql)
-- ===========================================================================

drop function if exists public.gf_accept_invitation(text);

create or replace function public.gf_accept_invitation(invite_token text)
returns table(org_slug text, project_slug text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inv gf_invitations;
  v_org_slug text;
  v_project_slug text;
begin
  select * into inv from gf_invitations
  where token = invite_token and status = 'pending' and expires_at > now();

  if inv is null then
    raise exception 'Ogiltig eller utgången inbjudan';
  end if;

  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Inbjudan gäller en annan e-post';
  end if;

  if inv.project_id is not null then
    insert into gf_unit_members (user_id, project_id, role)
    values (auth.uid(), inv.project_id, inv.role::gf_unit_role)
    on conflict (user_id, project_id) do update set role = excluded.role;

    select p.slug into v_project_slug
    from gf_projects p where p.id = inv.project_id;
  else
    insert into gf_memberships (user_id, org_id, role)
    values (auth.uid(), inv.org_id, inv.role::gf_member_role)
    on conflict (user_id, org_id) do update set role = excluded.role;
    v_project_slug := null;
  end if;

  select o.slug into v_org_slug
  from gf_organizations o where o.id = inv.org_id;

  update gf_invitations set status = 'accepted' where id = inv.id;

  org_slug := v_org_slug;
  project_slug := v_project_slug;
  return next;
end;
$$;

grant execute on function public.gf_accept_invitation(text) to authenticated;

-- ===========================================================================
-- DEL 10 — gf_can_access_org tillåter även unit-members
--          (från 0012_can_access_org_includes_unit_members.sql)
-- ===========================================================================
-- (Redan den slutgiltiga definitionen i DEL 2 ovan — funktionen är definierad
-- där i sin färdiga form för att undvika dubblettdefinitioner i denna bundle.)

-- ===========================================================================
-- DEL 11 — Leverabel-modellen (från 0013_pm_deliverables.sql)
-- ===========================================================================

create table if not exists public.pm_disciplines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  code text not null,
  name text not null,
  color text,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (project_id, code)
);

create index if not exists pm_disciplines_project_id_idx on public.pm_disciplines(project_id);

alter table public.pm_disciplines enable row level security;

drop policy if exists "pm_disciplines_access" on public.pm_disciplines;
create policy "pm_disciplines_access" on public.pm_disciplines
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

create table if not exists public.pm_phases (
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

create index if not exists pm_phases_project_id_idx on public.pm_phases(project_id);

alter table public.pm_phases enable row level security;

drop policy if exists "pm_phases_access" on public.pm_phases;
create policy "pm_phases_access" on public.pm_phases
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

create table if not exists public.pm_deliverables (
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

create index if not exists pm_deliverables_project_id_idx on public.pm_deliverables(project_id);
create index if not exists pm_deliverables_phase_id_idx on public.pm_deliverables(phase_id);
create index if not exists pm_deliverables_discipline_id_idx on public.pm_deliverables(discipline_id);

alter table public.pm_deliverables enable row level security;

drop policy if exists "pm_deliverables_access" on public.pm_deliverables;
create policy "pm_deliverables_access" on public.pm_deliverables
  for all
  using (gf_can_access_unit(project_id))
  with check (gf_can_access_unit(project_id));

alter table public.gf_documents
  add column if not exists deliverable_id uuid references public.pm_deliverables(id) on delete set null;

create index if not exists gf_documents_deliverable_id_idx on public.gf_documents(deliverable_id);

-- ===========================================================================
-- DEL 12 — Soft-delete för gf_documents (från 0014_documents_soft_delete.sql)
-- ===========================================================================

alter table public.gf_documents
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists gf_documents_deleted_at_idx
  on public.gf_documents(deleted_at)
  where deleted_at is not null;

-- ===========================================================================
-- DEL 13 — Rich data på pm_disciplines (från 0015_pm_disciplines_rich.sql)
-- ===========================================================================

alter table public.pm_disciplines
  add column if not exists description text,
  add column if not exists status text default 'planering',
  add column if not exists progress int default 0,
  add column if not exists phase_id uuid references public.pm_phases(id) on delete set null,
  add column if not exists key_components text[],
  add column if not exists integration_points text[],
  add column if not exists responsible_team text,
  add column if not exists target_date date,
  add column if not exists icon_name text;

create index if not exists pm_disciplines_phase_id_idx on public.pm_disciplines(phase_id);

-- ===========================================================================
-- DEL 14 — Förenklad rollmodell: Ägare / Användare / Besökare
--          (från 0016_three_role_levels.sql)
-- ===========================================================================
-- OBS: ALTER TYPE ADD VALUE måste committas innan värdena kan användas i
-- UPDATE — vid en engångskörning i SQL Editor sker det per statement.

alter type gf_member_role add value if not exists 'user';
alter type gf_member_role add value if not exists 'visitor';

alter type gf_unit_role add value if not exists 'owner';
alter type gf_unit_role add value if not exists 'user';
alter type gf_unit_role add value if not exists 'visitor';

-- Datamigrering av ev. redan seedade rader (no-op på ett fräscht projekt).
update gf_memberships set role = 'owner' where role = 'admin';
update gf_memberships set role = 'user' where role = 'member';

update gf_unit_members set role = 'owner' where role = 'manager';
update gf_unit_members set role = 'user' where role = 'member';
update gf_unit_members set role = 'visitor' where role = 'viewer';
update gf_unit_members set role = 'owner' where role = 'larare';
update gf_unit_members set role = 'user' where role = 'deltagare';

-- ===========================================================================
-- DEL 15 — RLS-policies för 3-nivå-rollerna (från 0017_role_based_rls.sql)
-- ===========================================================================

-- gf_is_unit_manager: slutgiltig definition — inkluderar nu 'owner' (enum-
-- etiketten lades till i DEL 14 ovan; se not i DEL 2).
create or replace function public.gf_is_unit_manager(target_project uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from gf_unit_members u
    where u.project_id = target_project and u.user_id = auth.uid()
      and u.role in ('owner', 'manager', 'larare')
  );
$$;

create or replace function public.gf_can_manage_unit(target_project uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select gf_is_platform_admin()
    or gf_is_org_admin((select org_id from gf_projects where id = target_project))
    or gf_is_unit_manager(target_project);
$$;

create or replace function public.gf_can_upload_unit(target_project uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select gf_is_platform_admin()
    or exists (
      select 1 from gf_unit_members u
      where u.project_id = target_project and u.user_id = auth.uid()
        and u.role <> 'visitor'
    )
    or exists (
      select 1 from gf_memberships m
      join gf_projects p on p.org_id = m.org_id
      where p.id = target_project and m.user_id = auth.uid()
        and m.role <> 'visitor'
    );
$$;

drop policy if exists "gf_documents_access" on public.gf_documents;

drop policy if exists "gf_documents_select" on public.gf_documents;
create policy "gf_documents_select" on public.gf_documents
  for select
  using (gf_can_access_unit(project_id));

drop policy if exists "gf_documents_insert" on public.gf_documents;
create policy "gf_documents_insert" on public.gf_documents
  for insert
  with check (gf_can_upload_unit(project_id));

drop policy if exists "gf_documents_update" on public.gf_documents;
create policy "gf_documents_update" on public.gf_documents
  for update
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

drop policy if exists "gf_documents_delete" on public.gf_documents;
create policy "gf_documents_delete" on public.gf_documents
  for delete
  using (gf_can_manage_unit(project_id));

drop policy if exists "gf_document_versions_access" on public.gf_document_versions;

drop policy if exists "gf_document_versions_select" on public.gf_document_versions;
create policy "gf_document_versions_select" on public.gf_document_versions
  for select
  using (gf_can_access_unit(project_id));

drop policy if exists "gf_document_versions_write" on public.gf_document_versions;
create policy "gf_document_versions_write" on public.gf_document_versions
  for all
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

drop policy if exists "pm_deliverables_access" on public.pm_deliverables;
drop policy if exists "pm_deliverables_select" on public.pm_deliverables;
create policy "pm_deliverables_select" on public.pm_deliverables
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_deliverables_write" on public.pm_deliverables;
create policy "pm_deliverables_write" on public.pm_deliverables
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));

drop policy if exists "pm_phases_access" on public.pm_phases;
drop policy if exists "pm_phases_select" on public.pm_phases;
create policy "pm_phases_select" on public.pm_phases
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_phases_write" on public.pm_phases;
create policy "pm_phases_write" on public.pm_phases
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));

drop policy if exists "pm_disciplines_access" on public.pm_disciplines;
drop policy if exists "pm_disciplines_select" on public.pm_disciplines;
create policy "pm_disciplines_select" on public.pm_disciplines
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_disciplines_write" on public.pm_disciplines;
create policy "pm_disciplines_write" on public.pm_disciplines
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));

-- ===========================================================================
-- DEL 16 — Utökad projektdatamodell (från 0018_pm_project_extras.sql)
-- ===========================================================================
-- Generiskt schema för anläggnings-/entreprenadprojekt: intressenter,
-- restriktioner, viten/bonus, kontraktsavvikelser, mängdförteckning.

create table if not exists public.pm_stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  category text not null,
  name text not null,
  organization text,
  role text,
  email text,
  phone text,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists pm_stakeholders_project_id_idx on public.pm_stakeholders(project_id);
alter table public.pm_stakeholders enable row level security;
drop policy if exists "pm_stakeholders_select" on public.pm_stakeholders;
create policy "pm_stakeholders_select" on public.pm_stakeholders
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_stakeholders_write" on public.pm_stakeholders;
create policy "pm_stakeholders_write" on public.pm_stakeholders
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

create table if not exists public.pm_restrictions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  category text not null,
  title text not null,
  description text,
  period text,
  severity text default 'info',
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists pm_restrictions_project_id_idx on public.pm_restrictions(project_id);
alter table public.pm_restrictions enable row level security;
drop policy if exists "pm_restrictions_select" on public.pm_restrictions;
create policy "pm_restrictions_select" on public.pm_restrictions
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_restrictions_write" on public.pm_restrictions;
create policy "pm_restrictions_write" on public.pm_restrictions
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

create table if not exists public.pm_penalties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  kind text not null,
  category text,
  title text not null,
  description text,
  amount numeric,
  unit text,
  cap numeric,
  conditions text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists pm_penalties_project_id_idx on public.pm_penalties(project_id);
alter table public.pm_penalties enable row level security;
drop policy if exists "pm_penalties_select" on public.pm_penalties;
create policy "pm_penalties_select" on public.pm_penalties
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_penalties_write" on public.pm_penalties;
create policy "pm_penalties_write" on public.pm_penalties
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

create table if not exists public.pm_contract_deviations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  section text,
  title text not null,
  original_text text,
  modified_text text,
  reason text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists pm_contract_deviations_project_id_idx on public.pm_contract_deviations(project_id);
alter table public.pm_contract_deviations enable row level security;
drop policy if exists "pm_contract_deviations_select" on public.pm_contract_deviations;
create policy "pm_contract_deviations_select" on public.pm_contract_deviations
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_contract_deviations_write" on public.pm_contract_deviations;
create policy "pm_contract_deviations_write" on public.pm_contract_deviations
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

create table if not exists public.pm_quantity_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  ama_code text,
  sub_code text,
  description text not null,
  unit text,
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
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists pm_quantity_items_project_id_idx on public.pm_quantity_items(project_id);
create index if not exists pm_quantity_items_discipline_id_idx on public.pm_quantity_items(discipline_id);
create index if not exists pm_quantity_items_ama_code_idx on public.pm_quantity_items(ama_code);
alter table public.pm_quantity_items enable row level security;
drop policy if exists "pm_quantity_items_select" on public.pm_quantity_items;
create policy "pm_quantity_items_select" on public.pm_quantity_items
  for select using (gf_can_access_unit(project_id));
drop policy if exists "pm_quantity_items_write" on public.pm_quantity_items;
create policy "pm_quantity_items_write" on public.pm_quantity_items
  for all using (gf_can_manage_unit(project_id)) with check (gf_can_manage_unit(project_id));

-- ===========================================================================
-- DEL 17 — Tidplanmodulen (från 0019_schedules.sql)
-- ===========================================================================

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

create table if not exists public.gf_calendars (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.gf_organizations(id) on delete cascade,
  ref text not null,
  name text not null,
  description text,
  working_days int[] not null default '{1,2,3,4,5}',
  working_hours_per_day numeric not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gf_calendars_ref_per_customer
  on public.gf_calendars (coalesce(customer_id::text, '__system__'), ref);
create index if not exists gf_calendars_customer_id_idx on public.gf_calendars(customer_id);

alter table public.gf_calendars enable row level security;

drop policy if exists "gf_calendars_select" on public.gf_calendars;
create policy "gf_calendars_select" on public.gf_calendars
  for select
  using (customer_id is null or gf_is_org_member(customer_id));

drop policy if exists "gf_calendars_insert" on public.gf_calendars;
create policy "gf_calendars_insert" on public.gf_calendars
  for insert
  with check (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  );

drop policy if exists "gf_calendars_update" on public.gf_calendars;
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

drop policy if exists "gf_calendars_delete" on public.gf_calendars;
create policy "gf_calendars_delete" on public.gf_calendars
  for delete
  using (
    (customer_id is null and gf_is_platform_admin())
    or (customer_id is not null and gf_is_org_admin(customer_id))
  );

create table if not exists public.gf_calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.gf_calendars(id) on delete cascade,
  date date not null,
  type gf_calendar_exception_type not null,
  hours numeric,
  label text
);

create unique index if not exists gf_calendar_exceptions_unique on public.gf_calendar_exceptions(calendar_id, date);
create index if not exists gf_calendar_exceptions_calendar_id_idx on public.gf_calendar_exceptions(calendar_id);

alter table public.gf_calendar_exceptions enable row level security;

drop policy if exists "gf_calendar_exceptions_select" on public.gf_calendar_exceptions;
create policy "gf_calendar_exceptions_select" on public.gf_calendar_exceptions
  for select
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and (c.customer_id is null or gf_is_org_member(c.customer_id))
  ));

drop policy if exists "gf_calendar_exceptions_insert" on public.gf_calendar_exceptions;
create policy "gf_calendar_exceptions_insert" on public.gf_calendar_exceptions
  for insert
  with check (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

drop policy if exists "gf_calendar_exceptions_update" on public.gf_calendar_exceptions;
create policy "gf_calendar_exceptions_update" on public.gf_calendar_exceptions
  for update
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

drop policy if exists "gf_calendar_exceptions_delete" on public.gf_calendar_exceptions;
create policy "gf_calendar_exceptions_delete" on public.gf_calendar_exceptions
  for delete
  using (exists (
    select 1 from public.gf_calendars c
    where c.id = calendar_id
      and ((c.customer_id is null and gf_is_platform_admin())
        or (c.customer_id is not null and gf_is_org_admin(c.customer_id)))
  ));

create table if not exists public.gf_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.gf_projects(id) on delete cascade,
  name text not null,
  kind gf_schedule_kind not null default 'main',
  status gf_schedule_status not null default 'draft',
  calendar_id uuid references public.gf_calendars(id) on delete restrict,
  project_start_date date,
  data_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists gf_schedules_project_id_idx on public.gf_schedules(project_id);

alter table public.gf_schedules enable row level security;

drop policy if exists "gf_schedules_select" on public.gf_schedules;
create policy "gf_schedules_select" on public.gf_schedules
  for select using (gf_can_access_unit(project_id));

drop policy if exists "gf_schedules_insert" on public.gf_schedules;
create policy "gf_schedules_insert" on public.gf_schedules
  for insert with check (gf_can_upload_unit(project_id));

drop policy if exists "gf_schedules_update" on public.gf_schedules;
create policy "gf_schedules_update" on public.gf_schedules
  for update
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

drop policy if exists "gf_schedules_delete" on public.gf_schedules;
create policy "gf_schedules_delete" on public.gf_schedules
  for delete using (gf_can_manage_unit(project_id));

create table if not exists public.gf_tasks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.gf_schedules(id) on delete cascade,
  parent_id uuid references public.gf_tasks(id) on delete cascade,
  external_uid text,
  wbs_code text,
  name text not null,
  type gf_task_type not null default 'task',
  planned_start date,
  planned_end date,
  planned_duration_days int,
  baseline_start date,
  baseline_end date,
  actual_start date,
  actual_end date,
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  constraint_type gf_constraint_type not null default 'ASAP',
  constraint_date date,
  computed_early_start date,
  computed_early_finish date,
  computed_late_start date,
  computed_late_finish date,
  total_float_days int,
  free_float_days int,
  is_critical boolean not null default false,
  sort_order int not null default 0,
  discipline_id uuid references public.pm_disciplines(id) on delete set null,
  deliverable_id uuid references public.pm_deliverables(id) on delete set null,
  responsible text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gf_tasks_schedule_id_idx on public.gf_tasks(schedule_id);
create index if not exists gf_tasks_parent_id_idx on public.gf_tasks(parent_id);
create index if not exists gf_tasks_critical_idx on public.gf_tasks(schedule_id, is_critical) where is_critical;
create unique index if not exists gf_tasks_external_uid_per_schedule
  on public.gf_tasks(schedule_id, external_uid) where external_uid is not null;

alter table public.gf_tasks enable row level security;

drop policy if exists "gf_tasks_select" on public.gf_tasks;
create policy "gf_tasks_select" on public.gf_tasks
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

drop policy if exists "gf_tasks_insert" on public.gf_tasks;
create policy "gf_tasks_insert" on public.gf_tasks
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

drop policy if exists "gf_tasks_update" on public.gf_tasks;
create policy "gf_tasks_update" on public.gf_tasks
  for update
  using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

drop policy if exists "gf_tasks_delete" on public.gf_tasks;
create policy "gf_tasks_delete" on public.gf_tasks
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

create table if not exists public.gf_task_dependencies (
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

create index if not exists gf_task_dependencies_schedule_id_idx on public.gf_task_dependencies(schedule_id);
create index if not exists gf_task_dependencies_predecessor_idx on public.gf_task_dependencies(predecessor_id);
create index if not exists gf_task_dependencies_successor_idx on public.gf_task_dependencies(successor_id);

alter table public.gf_task_dependencies enable row level security;

drop policy if exists "gf_task_dependencies_select" on public.gf_task_dependencies;
create policy "gf_task_dependencies_select" on public.gf_task_dependencies
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

drop policy if exists "gf_task_dependencies_insert" on public.gf_task_dependencies;
create policy "gf_task_dependencies_insert" on public.gf_task_dependencies
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

drop policy if exists "gf_task_dependencies_update" on public.gf_task_dependencies;
create policy "gf_task_dependencies_update" on public.gf_task_dependencies
  for update
  using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

drop policy if exists "gf_task_dependencies_delete" on public.gf_task_dependencies;
create policy "gf_task_dependencies_delete" on public.gf_task_dependencies
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

create table if not exists public.gf_schedule_baselines (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.gf_schedules(id) on delete cascade,
  name text not null,
  snapshot_at timestamptz not null default now(),
  snapshot_data jsonb not null,
  created_by uuid references auth.users(id)
);

create index if not exists gf_schedule_baselines_schedule_id_idx on public.gf_schedule_baselines(schedule_id);

alter table public.gf_schedule_baselines enable row level security;

drop policy if exists "gf_schedule_baselines_select" on public.gf_schedule_baselines;
create policy "gf_schedule_baselines_select" on public.gf_schedule_baselines
  for select using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_access_unit(s.project_id)
  ));

drop policy if exists "gf_schedule_baselines_insert" on public.gf_schedule_baselines;
create policy "gf_schedule_baselines_insert" on public.gf_schedule_baselines
  for insert with check (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_upload_unit(s.project_id)
  ));

drop policy if exists "gf_schedule_baselines_delete" on public.gf_schedule_baselines;
create policy "gf_schedule_baselines_delete" on public.gf_schedule_baselines
  for delete using (exists (
    select 1 from public.gf_schedules s
    where s.id = schedule_id and gf_can_manage_unit(s.project_id)
  ));

create or replace function public.gf_schedules_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists gf_schedules_updated_at on public.gf_schedules;
create trigger gf_schedules_updated_at before update on public.gf_schedules
  for each row execute function public.gf_schedules_set_updated_at();

drop trigger if exists gf_tasks_updated_at on public.gf_tasks;
create trigger gf_tasks_updated_at before update on public.gf_tasks
  for each row execute function public.gf_schedules_set_updated_at();

drop trigger if exists gf_calendars_updated_at on public.gf_calendars;
create trigger gf_calendars_updated_at before update on public.gf_calendars
  for each row execute function public.gf_schedules_set_updated_at();

-- Generisk referensdata: svensk standardkalender (customer_id = NULL →
-- system-global, används av vilket bolag/projekt som helst).
insert into public.gf_calendars (id, customer_id, ref, name, description, working_days, working_hours_per_day)
values (
  '10000000-0000-0000-0000-000000000001',
  null,
  'se-standard',
  'Svensk arbetskalender (standard)',
  'Mån–fre, 8h per dag, svenska helgdagar 2026–2028.',
  '{1,2,3,4,5}',
  8
)
on conflict (id) do nothing;

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
  ('10000000-0000-0000-0000-000000000001', '2028-12-31', 'holiday', 'Nyårsafton')
on conflict (calendar_id, date) do nothing;

-- ===========================================================================
-- DEL 18 — Resursplanering (från 0020_resource_planning.sql)
-- ===========================================================================
-- gf_resources speglar Part Groups eget leveransteam (RESOURCE_ROSTER i
-- lib/resource-planning.ts) — inte kunddata, utan operatörens egen personal.
-- Allokeringarna lämnas tomma.

create table if not exists public.gf_resources (
  id text primary key,
  name text not null,
  role text,
  capacity_hours_per_week numeric not null default 40,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gf_resources_active_idx on public.gf_resources(active, sort_order);

alter table public.gf_resources enable row level security;

drop policy if exists "gf_resources_select" on public.gf_resources;
create policy "gf_resources_select" on public.gf_resources
  for select using (gf_is_platform_admin());

drop policy if exists "gf_resources_write" on public.gf_resources;
create policy "gf_resources_write" on public.gf_resources
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create table if not exists public.gf_resource_allocations (
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

create index if not exists gf_resource_allocations_resource_idx
  on public.gf_resource_allocations(resource_id);
create index if not exists gf_resource_allocations_project_idx
  on public.gf_resource_allocations(project_id);
create index if not exists gf_resource_allocations_week_idx
  on public.gf_resource_allocations(iso_year, iso_week);

alter table public.gf_resource_allocations enable row level security;

drop policy if exists "gf_resource_allocations_select" on public.gf_resource_allocations;
create policy "gf_resource_allocations_select" on public.gf_resource_allocations
  for select using (gf_is_platform_admin());

drop policy if exists "gf_resource_allocations_write" on public.gf_resource_allocations;
create policy "gf_resource_allocations_write" on public.gf_resource_allocations
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_resources_updated_at on public.gf_resources;
create trigger gf_resources_updated_at before update on public.gf_resources
  for each row execute function public.gf_schedules_set_updated_at();

drop trigger if exists gf_resource_allocations_updated_at on public.gf_resource_allocations;
create trigger gf_resource_allocations_updated_at before update on public.gf_resource_allocations
  for each row execute function public.gf_schedules_set_updated_at();

insert into public.gf_resources (id, name, role, capacity_hours_per_week, sort_order) values
  ('kent',    'Kent Karlsson',       null,      40, 1),
  ('clas',    'Clas Tosser',         null,      40, 2),
  ('camilla', 'Camilla Sondermann',  null,      40, 3),
  ('anders',  'Anders Strömberg',    null,      40, 4),
  ('annak',   'Anna Karlsson',       null,      32, 5),
  ('annaa',   'Anna Alavaara',       'Konsult', 24, 6)
on conflict (id) do nothing;

-- ===========================================================================
-- DEL 19 — Tidrapportering (från 0021_time_reporting.sql)
-- ===========================================================================

alter table public.gf_resources
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists employment_type text not null default 'employee'
    check (employment_type in ('employee','consultant'));

update public.gf_resources
  set employment_type = 'consultant'
  where role = 'Konsult';

update public.gf_resources r
  set user_id = p.user_id
  from public.gf_profiles p
  where lower(p.full_name) = lower(r.name)
    and r.user_id is null;

create index if not exists gf_resources_user_id_idx on public.gf_resources(user_id);

create table if not exists public.gf_time_entries (
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

create index if not exists gf_time_entries_user_date_idx
  on public.gf_time_entries(user_id, entry_date);
create index if not exists gf_time_entries_project_date_idx
  on public.gf_time_entries(project_id, entry_date);

alter table public.gf_time_entries enable row level security;

-- Policyerna nedan är den ursprungliga (öppnare) varianten. DEL 20
-- (0022_time_reporting_platform_admin_only.sql) stänger åtkomsten till
-- plattformsadmin och skriver om samtliga fyra.
drop policy if exists "gf_time_entries_select" on public.gf_time_entries;
create policy "gf_time_entries_select" on public.gf_time_entries
  for select using (user_id = auth.uid() or gf_is_platform_admin());

drop policy if exists "gf_time_entries_insert" on public.gf_time_entries;
create policy "gf_time_entries_insert" on public.gf_time_entries
  for insert with check (user_id = auth.uid() or gf_is_platform_admin());

drop policy if exists "gf_time_entries_update" on public.gf_time_entries;
create policy "gf_time_entries_update" on public.gf_time_entries
  for update
  using (user_id = auth.uid() or gf_is_platform_admin())
  with check (user_id = auth.uid() or gf_is_platform_admin());

drop policy if exists "gf_time_entries_delete" on public.gf_time_entries;
create policy "gf_time_entries_delete" on public.gf_time_entries
  for delete using (user_id = auth.uid() or gf_is_platform_admin());

drop trigger if exists gf_time_entries_updated_at on public.gf_time_entries;
create trigger gf_time_entries_updated_at before update on public.gf_time_entries
  for each row execute function public.gf_schedules_set_updated_at();

-- ===========================================================================
-- DEL 20 — Tidrapportering: stäng åtkomsten till plattformsadmin
--          (från 0022_time_reporting_platform_admin_only.sql)
-- ===========================================================================

drop policy if exists "gf_time_entries_select" on public.gf_time_entries;
drop policy if exists "gf_time_entries_insert" on public.gf_time_entries;
drop policy if exists "gf_time_entries_update" on public.gf_time_entries;
drop policy if exists "gf_time_entries_delete" on public.gf_time_entries;

create policy "gf_time_entries_select" on public.gf_time_entries
  for select using (gf_is_platform_admin());

create policy "gf_time_entries_insert" on public.gf_time_entries
  for insert with check (gf_is_platform_admin() and user_id = auth.uid());

create policy "gf_time_entries_update" on public.gf_time_entries
  for update
  using (gf_is_platform_admin() and user_id = auth.uid())
  with check (gf_is_platform_admin() and user_id = auth.uid());

create policy "gf_time_entries_delete" on public.gf_time_entries
  for delete using (gf_is_platform_admin() and user_id = auth.uid());

-- ===========================================================================
-- DEL 21 — Internt bibliotek (från 0023_internal_library.sql)
-- ===========================================================================
-- Internt dokumentbibliotek, skilt från gf_documents (projekt-scopad). Bara
-- plattformsadmin når det.

create table if not exists public.gf_doc_categories (
  id text primary key,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_doc_categories enable row level security;

drop policy if exists "gf_doc_categories_read" on public.gf_doc_categories;
create policy "gf_doc_categories_read" on public.gf_doc_categories
  for select using (gf_is_platform_admin());

drop policy if exists "gf_doc_categories_write" on public.gf_doc_categories;
create policy "gf_doc_categories_write" on public.gf_doc_categories
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_doc_categories_updated_at on public.gf_doc_categories;
create trigger gf_doc_categories_updated_at before update on public.gf_doc_categories
  for each row execute function public.gf_schedules_set_updated_at();

create table if not exists public.gf_doc_statuses (
  id text primary key,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_doc_statuses enable row level security;

drop policy if exists "gf_doc_statuses_read" on public.gf_doc_statuses;
create policy "gf_doc_statuses_read" on public.gf_doc_statuses
  for select using (gf_is_platform_admin());

drop policy if exists "gf_doc_statuses_write" on public.gf_doc_statuses;
create policy "gf_doc_statuses_write" on public.gf_doc_statuses
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_doc_statuses_updated_at on public.gf_doc_statuses;
create trigger gf_doc_statuses_updated_at before update on public.gf_doc_statuses
  for each row execute function public.gf_schedules_set_updated_at();

create table if not exists public.gf_library_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id text references public.gf_doc_categories(id) on delete set null,
  status_id text references public.gf_doc_statuses(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  tags text[] not null default '{}',
  storage_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists gf_library_documents_category_idx
  on public.gf_library_documents(category_id);
create index if not exists gf_library_documents_status_idx
  on public.gf_library_documents(status_id);
create index if not exists gf_library_documents_owner_idx
  on public.gf_library_documents(owner_user_id);
create index if not exists gf_library_documents_tags_idx
  on public.gf_library_documents using gin(tags);

alter table public.gf_library_documents enable row level security;

drop policy if exists "gf_library_documents_read" on public.gf_library_documents;
create policy "gf_library_documents_read" on public.gf_library_documents
  for select using (gf_is_platform_admin());

drop policy if exists "gf_library_documents_write" on public.gf_library_documents;
create policy "gf_library_documents_write" on public.gf_library_documents
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_library_documents_updated_at on public.gf_library_documents;
create trigger gf_library_documents_updated_at before update on public.gf_library_documents
  for each row execute function public.gf_schedules_set_updated_at();

insert into storage.buckets (id, name, public)
values ('gf-library-docs', 'gf-library-docs', false)
on conflict (id) do nothing;

drop policy if exists "gf_library_docs_storage_select" on storage.objects;
create policy "gf_library_docs_storage_select" on storage.objects
  for select using (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

drop policy if exists "gf_library_docs_storage_insert" on storage.objects;
create policy "gf_library_docs_storage_insert" on storage.objects
  for insert with check (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

drop policy if exists "gf_library_docs_storage_update" on storage.objects;
create policy "gf_library_docs_storage_update" on storage.objects
  for update
  using (bucket_id = 'gf-library-docs' and gf_is_platform_admin())
  with check (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

drop policy if exists "gf_library_docs_storage_delete" on storage.objects;
create policy "gf_library_docs_storage_delete" on storage.objects
  for delete using (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

-- Generisk referensdata: standardkategorier/-statusar (admin kan ändra sedan).
insert into public.gf_doc_categories (id, label, sort_order) values
  ('mall',         'Mall',          1),
  ('policy',       'Policy',        2),
  ('kontrakt',     'Kontrakt',      3),
  ('rapport',      'Rapport',       4),
  ('presentation', 'Presentation',  5),
  ('annat',        'Annat',         99)
on conflict (id) do nothing;

insert into public.gf_doc_statuses (id, label, sort_order, is_terminal) values
  ('utkast',     'Utkast',     1, false),
  ('aktiv',      'Aktiv',      2, false),
  ('arkiverad',  'Arkiverad',  3, true)
on conflict (id) do nothing;

-- ===========================================================================
-- DEL 22 — Team-profiler (från 0024_team_profiles.sql)
-- ===========================================================================

alter table public.gf_resources
  add column if not exists title text,
  add column if not exists bio text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists avatar_path text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists start_year int;

create index if not exists gf_resources_skills_idx on public.gf_resources using gin(skills);

create table if not exists public.gf_team_education (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  institution text not null,
  degree text,
  year_from int,
  year_to int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gf_team_education_resource_idx
  on public.gf_team_education(resource_id, sort_order);

alter table public.gf_team_education enable row level security;

drop policy if exists "gf_team_education_read" on public.gf_team_education;
create policy "gf_team_education_read" on public.gf_team_education
  for select using (gf_is_platform_admin());

drop policy if exists "gf_team_education_write" on public.gf_team_education;
create policy "gf_team_education_write" on public.gf_team_education
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_team_education_updated_at on public.gf_team_education;
create trigger gf_team_education_updated_at before update on public.gf_team_education
  for each row execute function public.gf_schedules_set_updated_at();

create table if not exists public.gf_team_certifications (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  name text not null,
  issuer text,
  issued_year int,
  expires_year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gf_team_certifications_resource_idx
  on public.gf_team_certifications(resource_id, sort_order);

alter table public.gf_team_certifications enable row level security;

drop policy if exists "gf_team_certifications_read" on public.gf_team_certifications;
create policy "gf_team_certifications_read" on public.gf_team_certifications
  for select using (gf_is_platform_admin());

drop policy if exists "gf_team_certifications_write" on public.gf_team_certifications;
create policy "gf_team_certifications_write" on public.gf_team_certifications
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_team_certifications_updated_at on public.gf_team_certifications;
create trigger gf_team_certifications_updated_at before update on public.gf_team_certifications
  for each row execute function public.gf_schedules_set_updated_at();

create table if not exists public.gf_team_experiences (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references public.gf_resources(id) on delete cascade,
  project_id uuid references public.gf_projects(id) on delete set null,
  external_project_name text,
  external_client_name text,
  role text,
  description text,
  year_from int,
  year_to int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_id is not null or external_project_name is not null)
);

create index if not exists gf_team_experiences_resource_idx
  on public.gf_team_experiences(resource_id, sort_order);
create index if not exists gf_team_experiences_project_idx
  on public.gf_team_experiences(project_id);

alter table public.gf_team_experiences enable row level security;

drop policy if exists "gf_team_experiences_read" on public.gf_team_experiences;
create policy "gf_team_experiences_read" on public.gf_team_experiences
  for select using (gf_is_platform_admin());

drop policy if exists "gf_team_experiences_write" on public.gf_team_experiences;
create policy "gf_team_experiences_write" on public.gf_team_experiences
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop trigger if exists gf_team_experiences_updated_at on public.gf_team_experiences;
create trigger gf_team_experiences_updated_at before update on public.gf_team_experiences
  for each row execute function public.gf_schedules_set_updated_at();

insert into storage.buckets (id, name, public)
values ('gf-team-avatars', 'gf-team-avatars', false)
on conflict (id) do nothing;

drop policy if exists "gf_team_avatars_storage_select" on storage.objects;
create policy "gf_team_avatars_storage_select" on storage.objects
  for select using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

drop policy if exists "gf_team_avatars_storage_insert" on storage.objects;
create policy "gf_team_avatars_storage_insert" on storage.objects
  for insert with check (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

drop policy if exists "gf_team_avatars_storage_update" on storage.objects;
create policy "gf_team_avatars_storage_update" on storage.objects
  for update
  using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin())
  with check (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

drop policy if exists "gf_team_avatars_storage_delete" on storage.objects;
create policy "gf_team_avatars_storage_delete" on storage.objects
  for delete using (bucket_id = 'gf-team-avatars' and gf_is_platform_admin());

-- Backfill — rimliga starttitlar/-språk för de 6 grundresurserna (kan ändras
-- direkt i UI:t efteråt).
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


-- ===========================================================================
-- DEL 23 — Uppdrag per bolag (från 0025_assignments.sql)
-- ===========================================================================

create table if not exists gf_assignments (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references gf_organizations(id) on delete cascade,
  title       text        not null,
  description text,
  operator    text,
  status      text        not null default 'draft'
                check (status in ('draft', 'active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table gf_projects
  add column if not exists assignment_id uuid
    references gf_assignments(id) on delete set null;

alter table gf_assignments enable row level security;

drop policy if exists "platform admin manages assignments" on gf_assignments;
create policy "platform admin manages assignments"
  on gf_assignments for all
  using  (gf_is_platform_admin())
  with check (gf_is_platform_admin());

drop policy if exists "org members read assignments" on gf_assignments;
create policy "org members read assignments"
  on gf_assignments for select
  using (
    exists (
      select 1 from gf_memberships m
       where m.org_id = gf_assignments.org_id
         and m.user_id = auth.uid()
    )
    or
    exists (
      select 1 from gf_unit_members um
      join gf_projects p on p.id = um.project_id
       where p.org_id = gf_assignments.org_id
         and um.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- DEL 24 — Canvas whiteboard (från 0026_canvases.sql)
-- ===========================================================================

create table if not exists public.gf_canvases (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null default 'Ny canvas',
  state      jsonb       not null default '{"nodes":[],"edges":[]}'::jsonb,
  project_id uuid        references public.gf_projects(id) on delete cascade,
  created_by uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_canvases enable row level security;

drop policy if exists "canvas_platform_admin_all" on public.gf_canvases;
create policy "canvas_platform_admin_all" on public.gf_canvases
  for all
  using  (public.gf_is_platform_admin())
  with check (public.gf_is_platform_admin());

create or replace function public.gf_canvases_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists gf_canvases_updated_at on public.gf_canvases;
create trigger gf_canvases_updated_at
  before update on public.gf_canvases
  for each row execute function public.gf_canvases_set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas-assets',
  'canvas-assets',
  false,
  20971520,
  array['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "canvas_assets_admin_all" on storage.objects;
create policy "canvas_assets_admin_all" on storage.objects
  for all
  using  (bucket_id = 'canvas-assets' and public.gf_is_platform_admin())
  with check (bucket_id = 'canvas-assets' and public.gf_is_platform_admin());

-- ===========================================================================
-- DEL 25 — Canvas-bildbibliotek (från 0027_canvas_images.sql)
-- ===========================================================================

create table if not exists public.gf_canvas_images (
  id           uuid        primary key default gen_random_uuid(),
  storage_path text        not null unique,
  file_name    text        not null,
  created_by   uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists gf_canvas_images_created_at_idx on public.gf_canvas_images (created_at desc);

alter table public.gf_canvas_images enable row level security;

drop policy if exists "gf_canvas_images_select" on public.gf_canvas_images;
create policy "gf_canvas_images_select" on public.gf_canvas_images
  for select using (public.gf_is_platform_admin());

drop policy if exists "gf_canvas_images_insert" on public.gf_canvas_images;
create policy "gf_canvas_images_insert" on public.gf_canvas_images
  for insert with check (public.gf_is_platform_admin() and created_by = auth.uid());

drop policy if exists "gf_canvas_images_delete" on public.gf_canvas_images;
create policy "gf_canvas_images_delete" on public.gf_canvas_images
  for delete using (public.gf_is_platform_admin());

-- ===========================================================================
-- KLART
-- ===========================================================================
-- Verifiera:
--   select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'gf_%';
--   select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'pm_%';
--
-- Nästa steg:
--   supabase/seed/0002_prod_customers.sql   — Part Groups eget bolagsskal
--   supabase/seed/0001_dev_users.sql        — dev-only, valfritt
