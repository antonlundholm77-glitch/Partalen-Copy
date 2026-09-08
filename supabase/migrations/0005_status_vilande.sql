-- ===========================================================================
-- 0006 — Lägg statusvärdet 'vilande' till gf_project_status
-- ===========================================================================
-- Matchar TS-typen ProjectStatus (pagaende | vilande | arkiverat). Inget seedat
-- projekt använder 'vilande' än, så detta är schema-paritet inför framtida bruk.
-- (Kör direkt i SQL Editor som övriga migrationer — db push funkar ej här.)
-- ---------------------------------------------------------------------------

alter type gf_project_status add value if not exists 'vilande';
