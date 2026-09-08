-- ===========================================================================
-- 0007 — Org/enhets-metadata (kind, unit_noun, meta, has_data, program)
-- ===========================================================================
-- Lägger till de fält som styr header-väljarna, bolagslandningen och
-- enhets-översikten generiskt (utan att koda in enskilda bolag/projekt):
--   gf_organizations.kind              — 'entreprenad'
--   gf_organizations.unit_noun(_plural) — hur enheter benämns för bolaget
--   gf_projects.meta                   — fri metadatatext för enhetskortet
--   gf_projects.has_data               — flagga: har enheten SmartPrep-data
--   gf_projects.program                — fri programtillhörighet (grupperingsfält)
--
-- (Ursprungligen fylldes dessa kolumner samtidigt med en kund-seed —
-- seed-delen är borttagen härifrån, bara schema-delen kvar.)
-- ---------------------------------------------------------------------------

alter table gf_organizations add column if not exists kind             text not null default 'entreprenad';
alter table gf_organizations add column if not exists unit_noun        text not null default 'projekt';
alter table gf_organizations add column if not exists unit_noun_plural text not null default 'Projekt';
alter table gf_organizations
  drop constraint if exists gf_organizations_kind_check;
alter table gf_organizations
  add constraint gf_organizations_kind_check
  check (kind = 'entreprenad');

alter table gf_projects add column if not exists meta     text;
alter table gf_projects add column if not exists has_data boolean not null default false;
alter table gf_projects add column if not exists program  text;  -- fri programtillhörighet (grupperingsfält)
