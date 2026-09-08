-- 0014: gf_can_access_org tillåter även unit-members
--
-- Tidigare logik tillät bara platform-admin och direkta org-medlemmar (rader
-- i gf_memberships). Konsekvens: en user som bara är gf_unit_member på ett
-- projekt under orgen kunde läsa sitt projekt (via gf_can_access_unit) men
-- INTE läsa orgens rad i gf_organizations.
--
-- Det fick getAccessContext() att returnera accessibleOrgSlugs=[] och
-- scopedOrgSlug=null för unit-only-users → ingen redirect → app/page.tsx
-- föll igenom till plattforms-ytan som visade hela kundlistan.
--
-- Fix: cascade — om du har unit-membership på något projekt under orgen
-- får du också läsa orgens rad.

create or replace function public.gf_can_access_org(target_org uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
