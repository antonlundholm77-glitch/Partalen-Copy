-- ===========================================================================
-- 0004 — Slug-kolumner för bolag och projekt
-- ===========================================================================
-- Appen navigerar med slugs (t.ex. 'part-group', 'mitt-projekt'). För att
-- koppla dokument och andra enhets-scopade tabeller mot en läsbar URL slår
-- appen upp slug → uuid och använder uuid:t internt.
--
-- (Ursprungligen infördes dessa kolumner tillsammans med en kund-seed —
-- seed-delen är borttagen härifrån, bara schema-delen kvar.)
-- ---------------------------------------------------------------------------

alter table gf_organizations add column if not exists slug text;
alter table gf_projects      add column if not exists slug text;

create unique index if not exists gf_organizations_slug_idx on gf_organizations (slug);
create unique index if not exists gf_projects_org_slug_idx   on gf_projects (org_id, slug);
