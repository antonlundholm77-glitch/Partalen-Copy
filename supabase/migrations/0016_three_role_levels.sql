-- 0018: Förenklad rollmodell — Ägare / Användare / Besökare på båda nivåer
--
-- Lägg till nya enum-värden på gf_member_role + gf_unit_role och migrera
-- befintliga rader till de tre rollerna. Gamla värden (admin, member,
-- manager, viewer, larare, deltagare) ligger kvar i enumen men används
-- inte längre i koden — de kan dropas i framtida migration.
--
-- Mappning:
--   gf_memberships (kund):
--     admin → owner
--     member → user
--     (nya: visitor)
--
--   gf_unit_members (projekt):
--     manager → owner
--     member → user
--     viewer → visitor
--     larare → owner
--     deltagare → user
--
-- OBS: ALTER TYPE ADD VALUE måste committas innan värdena kan användas
-- i UPDATE. Körs därför som flera separata statements (Supabase MCP
-- delade upp dem i prod).

alter type gf_member_role add value if not exists 'user';
alter type gf_member_role add value if not exists 'visitor';

alter type gf_unit_role add value if not exists 'owner';
alter type gf_unit_role add value if not exists 'user';
alter type gf_unit_role add value if not exists 'visitor';

-- Datamigrering (körs efter ovan har committats)
update gf_memberships set role = 'owner' where role = 'admin';
update gf_memberships set role = 'user' where role = 'member';

update gf_unit_members set role = 'owner' where role = 'manager';
update gf_unit_members set role = 'user' where role = 'member';
update gf_unit_members set role = 'visitor' where role = 'viewer';
update gf_unit_members set role = 'owner' where role = 'larare';
update gf_unit_members set role = 'user' where role = 'deltagare';
