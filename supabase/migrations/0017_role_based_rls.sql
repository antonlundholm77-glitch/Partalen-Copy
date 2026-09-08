-- 0019: RLS-policies följer 3-nivå-rollerna (owner / user / visitor)
--
-- Före 0019 hade gf_documents + pm_*-tabeller en *-policy som tillät alla
-- operationer för alla med gf_can_access_unit. Det betyder att en Besökare
-- teoretiskt kunde INSERT/UPDATE/DELETE dokument och leverabler via direkt
-- API-anrop (UI-gating var enda skyddet).
--
-- Efter 0019:
--   - SELECT: alla med project-access (oförändrat)
--   - INSERT/UPDATE av dokument: owner eller user (visitor blockas)
--   - DELETE av dokument: bara owner
--   - INSERT/UPDATE/DELETE av leverabler/faser/discipliner: bara owner
--
-- Plus: gf_is_unit_manager utökas att inkludera nya 'owner'-värdet.

-- =============================================================================
-- Helpers
-- =============================================================================

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

-- Owner-level: får ändra struktur (leverabler/faser/discipliner) +
-- radera dokument + bjuda in + toggla verktyg.
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

-- User-level: får ladda upp dokument + redigera dokument-metadata.
-- Bara Besökare blockas. Plattformsadmin har bypass.
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

-- =============================================================================
-- gf_documents — split policies
-- =============================================================================

drop policy if exists "gf_documents_access" on public.gf_documents;

create policy "gf_documents_select" on public.gf_documents
  for select
  using (gf_can_access_unit(project_id));

create policy "gf_documents_insert" on public.gf_documents
  for insert
  with check (gf_can_upload_unit(project_id));

create policy "gf_documents_update" on public.gf_documents
  for update
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

create policy "gf_documents_delete" on public.gf_documents
  for delete
  using (gf_can_manage_unit(project_id));

-- =============================================================================
-- gf_document_versions — split policies
-- =============================================================================

drop policy if exists "gf_document_versions_access" on public.gf_document_versions;

create policy "gf_document_versions_select" on public.gf_document_versions
  for select
  using (gf_can_access_unit(project_id));

create policy "gf_document_versions_write" on public.gf_document_versions
  for all
  using (gf_can_upload_unit(project_id))
  with check (gf_can_upload_unit(project_id));

-- =============================================================================
-- pm_deliverables, pm_phases, pm_disciplines — split policies
-- (struktur-ändringar kräver Ägare)
-- =============================================================================

drop policy if exists "pm_deliverables_access" on public.pm_deliverables;
create policy "pm_deliverables_select" on public.pm_deliverables
  for select using (gf_can_access_unit(project_id));
create policy "pm_deliverables_write" on public.pm_deliverables
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));

drop policy if exists "pm_phases_access" on public.pm_phases;
create policy "pm_phases_select" on public.pm_phases
  for select using (gf_can_access_unit(project_id));
create policy "pm_phases_write" on public.pm_phases
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));

drop policy if exists "pm_disciplines_access" on public.pm_disciplines;
create policy "pm_disciplines_select" on public.pm_disciplines
  for select using (gf_can_access_unit(project_id));
create policy "pm_disciplines_write" on public.pm_disciplines
  for all
  using (gf_can_manage_unit(project_id))
  with check (gf_can_manage_unit(project_id));
