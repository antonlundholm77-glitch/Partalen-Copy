-- ===========================================================================
-- 0008 — Projekt-/org-innehåll (JSONB) för det gemensamma ProjectDoc-schemat
-- ===========================================================================
-- Hybrid relationellt + JSONB: relationella tabeller (gf_projects, gf_tb_entries,
-- gf_mf_rows, gf_documents, medlemskap) behålls. Den rörliga, djupt nästlade
-- projektdatan (ProjectContent + modul/portal-config + uppdrag) lagras som JSONB i
-- gf_project_content, kundprofilen i gf_org_content. content matchar
-- lib/schema/project-doc.ts (zod); schema_version speglar ProjectDoc.schemaVersion.
--
-- VARFÖR separata tabeller (ej kolumn på gf_projects): navigations-/RLS-queries
-- ska inte dra med sig blobben; egen skrivkadens; schema_version bor med datan.
--
-- ÅTKOMST: per enhet via gf_can_access_unit(project_id) för läsning; skrivning
-- begränsad till plattformsadmin / org-admin / enhets-manager (samma OR-modell som
-- gf_unit_members_manage i 0002) så viewer/deltagare inte muterar innehåll.
--
-- OBS: `supabase db push` är blockerat (delat projekt). Denna fil är källa —
-- APPLICERA via Supabase SQL-editor (eller MCP med skrivrätt). Idempotent: kan
-- köras om (if not exists / drop policy if exists / create or replace).
-- ---------------------------------------------------------------------------

-- ── gf_project_content ─────────────────────────────────────────────────────
create table if not exists gf_project_content (
  project_id     uuid primary key references gf_projects (id) on delete cascade,
  content        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

-- ── gf_org_content (kundprofil) ─────────────────────────────────────────────
create table if not exists gf_org_content (
  org_id         uuid primary key references gf_organizations (id) on delete cascade,
  content        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at     timestamptz not null default now()
);

-- updated_at-trigger (återanvänder den generiska funktionen från 0003)
drop trigger if exists gf_project_content_touch_trg on gf_project_content;
create trigger gf_project_content_touch_trg
  before update on gf_project_content
  for each row execute function public.gf_documents_touch();

drop trigger if exists gf_org_content_touch_trg on gf_org_content;
create trigger gf_org_content_touch_trg
  before update on gf_org_content
  for each row execute function public.gf_documents_touch();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table gf_project_content enable row level security;
alter table gf_org_content     enable row level security;

-- Läsning: alla som har tillgång till enheten.
drop policy if exists gf_project_content_read on gf_project_content;
create policy gf_project_content_read on gf_project_content
  for select using (gf_can_access_unit(project_id));

-- Skrivning: plattformsadmin / org-admin / enhets-manager (permissiv "for all";
-- kombineras OR med read-policyn för select, men styr ensam insert/update/delete).
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

-- Org-innehåll: läsning för org-åtkomst, skrivning för plattforms-/org-admin.
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
