-- Plattformens access-modell (Fas A) — prefixad med gf_.
-- Systemroller (domändrivet + gf_system_roles) · enhetsroller (gf_unit_members) ·
-- inbjudningar. RLS → OR-modellen gf_can_access_*. Se docs/access-control.md.

-- ===========================================================================
-- Profiler — spegel av auth.users
-- ===========================================================================
create table gf_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create or replace function public.gf_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger gf_on_auth_user_created
  after insert on auth.users
  for each row execute function public.gf_handle_new_user();

-- ===========================================================================
-- Systemroller — hanteras helt av plattformsadmin
-- ===========================================================================
create type gf_system_role as enum ('superadmin', 'support', 'readonly');

create table gf_system_roles (
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     gf_system_role not null,
  primary key (user_id, role)
);

-- ===========================================================================
-- Enhetsmedlemmar — projekt (manager/member/viewer) eller kurs (larare/deltagare)
-- ===========================================================================
create type gf_unit_role as enum ('manager', 'member', 'viewer', 'larare', 'deltagare');

create table gf_unit_members (
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references gf_projects (id) on delete cascade,
  role        gf_unit_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);
create index gf_unit_members_project_idx on gf_unit_members (project_id);

-- ===========================================================================
-- Inbjudningar
-- ===========================================================================
create type gf_invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table gf_invitations (
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
create index gf_invitations_email_idx on gf_invitations (lower(email));
create index gf_invitations_org_idx on gf_invitations (org_id);

-- ===========================================================================
-- Hjälpfunktioner
-- ===========================================================================
create or replace function public.gf_is_platform_admin()
returns boolean
language sql
stable
as $$
  -- TODO: byt till Part Groups riktiga domän innan produktionslansering.
  select lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) = 'part-group.example';
$$;

create or replace function public.gf_is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gf_memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.gf_is_unit_member(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gf_unit_members u
    where u.project_id = target_project and u.user_id = auth.uid()
  );
$$;

create or replace function public.gf_is_unit_manager(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gf_unit_members u
    where u.project_id = target_project and u.user_id = auth.uid()
      and u.role in ('manager', 'larare')
  );
$$;

create or replace function public.gf_can_access_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select gf_is_platform_admin() or gf_is_org_member(target_org);
$$;

create or replace function public.gf_can_access_unit(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    gf_is_platform_admin()
    or gf_is_org_member((select org_id from gf_projects p where p.id = target_project))
    or gf_is_unit_member(target_project);
$$;

-- ===========================================================================
-- RLS — uppdatera 0001-policyerna till OR-modellen
-- ===========================================================================
drop policy org_select on gf_organizations;
create policy org_access on gf_organizations
  for select using (gf_can_access_org(id));
create policy org_admin_all on gf_organizations
  for all using (gf_is_platform_admin()) with check (gf_is_platform_admin());

drop policy membership_select on gf_memberships;
create policy membership_select on gf_memberships
  for select using (user_id = auth.uid() or gf_is_org_admin(org_id) or gf_is_platform_admin());
create policy membership_manage on gf_memberships
  for all using (gf_is_platform_admin() or gf_is_org_admin(org_id))
  with check (gf_is_platform_admin() or gf_is_org_admin(org_id));

drop policy projects_all on gf_projects;
create policy projects_access on gf_projects
  for all using (gf_can_access_unit(id)) with check (gf_can_access_unit(id));

drop policy tb_all on gf_tb_entries;
create policy tb_access on gf_tb_entries
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy mf_all on gf_mf_rows;
create policy mf_access on gf_mf_rows
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

drop policy checklists_all on gf_ama_checklists;
create policy checklists_access on gf_ama_checklists
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

-- ===========================================================================
-- RLS — nya tabeller
-- ===========================================================================
alter table gf_profiles      enable row level security;
alter table gf_system_roles  enable row level security;
alter table gf_unit_members  enable row level security;
alter table gf_invitations   enable row level security;

create policy profiles_select on gf_profiles
  for select using (user_id = auth.uid() or gf_is_platform_admin());

create policy system_roles_select on gf_system_roles
  for select using (user_id = auth.uid() or gf_is_platform_admin());
create policy system_roles_admin on gf_system_roles
  for all using (gf_is_platform_admin()) with check (gf_is_platform_admin());

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

-- ===========================================================================
-- Acceptera inbjudan (SECURITY DEFINER)
-- ===========================================================================
create or replace function public.gf_accept_invitation(invite_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv gf_invitations;
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
  else
    insert into gf_memberships (user_id, org_id, role)
    values (auth.uid(), inv.org_id, inv.role::gf_member_role)
    on conflict (user_id, org_id) do update set role = excluded.role;
  end if;

  update gf_invitations set status = 'accepted' where id = inv.id;
end;
$$;
