-- ===========================================================================
-- 0010 — Per-projekt-verktygslista (gf_project_modules)
-- ===========================================================================
-- En tunn override-tabell: (project_id, module_id) → enabled + config. Saknas
-- rad → defaultläge (modulen är tillgänglig). Rad med enabled=false → modulen
-- är dold för det projektet. Module_id är text utan FK eftersom modul-listan
-- speglas från koden (lib/icons, Sidebar) — vi vill kunna lägga till en modul
-- i UI:t utan migration.
--
-- Skrivpolicy = samma OR-modell som gf_unit_members_manage:
--   plattformsadmin / org-admin / enhets-manager. Viewer/deltagare ser bara.
--
-- APPLICERA via Supabase SQL-editor eller MCP (db push blockerad på delat
-- projekt). Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists gf_project_modules (
  project_id  uuid not null references gf_projects (id) on delete cascade,
  module_id   text not null,
  enabled     boolean not null default true,
  config      jsonb  not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (project_id, module_id)
);

create index if not exists gf_project_modules_project_idx on gf_project_modules (project_id);

-- updated_at-trigger (återanvänder gf_documents_touch från 0003)
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
