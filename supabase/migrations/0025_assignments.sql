-- ===========================================================================
-- 0025 — gf_assignments: uppdrag per kund
-- ===========================================================================
-- Skapar tabellen gf_assignments och lägger till nullable FK assignment_id
-- på gf_projects.
--
-- Relation: gf_organizations (1) ──< gf_assignments (1) ──< gf_projects (N)
-- ---------------------------------------------------------------------------

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

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table gf_assignments enable row level security;

-- Plattformsadmin: full access
create policy "platform admin manages assignments"
  on gf_assignments for all
  using  (gf_is_platform_admin())
  with check (gf_is_platform_admin());

-- Org-ägare/användare: läsaccess till sin orgs uppdrag (via org-membership
-- eller via enhetsmembership → projekt → org)
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
