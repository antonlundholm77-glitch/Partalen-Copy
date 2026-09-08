-- ===========================================================================
-- PROD-SEED — Part Group (operatörens eget bolagsskal)
-- ===========================================================================
-- Körs EFTER prod-bundle.sql i ett nytt prod-Supabase-projekt.
--
-- Lägger Part Group som ett tomt bolagsskal (gf_organizations-rad), så att
-- operatörens egna projekt kan hängas under org-slug 'part-group' precis som
-- vilket annat bolag som helst. INGEN seedad användare — Kent (eller vem som
-- helst på operatörens domän) loggar in första gången via Entra → triggas in
-- i auth.users + gf_profiles via gf_handle_new_user. Plattformsadmin-status
-- avgörs separat, rent domän-baserat, av gf_is_platform_admin() (se
-- 0002_access.sql) — den funktionen kräver ingen rad här; org-raden nedan
-- behövs bara för att kunna skapa bolag/projekt under Part Group i UI:t.
--
-- Idempotent: ON CONFLICT NOTHING.
-- ---------------------------------------------------------------------------

insert into gf_organizations (id, name, slug, kind, unit_noun, unit_noun_plural) values
  ('a2000000-0000-4000-8000-000000000002', 'Part Group',  'part-group', 'entreprenad', 'projekt', 'Projekt')
on conflict (id) do nothing;

-- Verifiera:
--   select slug, name, kind from gf_organizations order by slug;
