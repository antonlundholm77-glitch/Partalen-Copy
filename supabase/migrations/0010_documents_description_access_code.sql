-- ===========================================================================
-- 0012 — gf_documents: description + access_code (PMCloud-paritet)
-- ===========================================================================
-- Lägger till två frivilliga metadata-kolumner på gf_documents för att möta
-- PMCloud:s DeliverableDocument-typ:
--   description — fri text-beskrivning av dokumentet
--   access_code — klassificeringskod ({TEKNIK}-{B1}-{B2?}-{ROLL?}) som styr
--                 synlighet utöver RLS (filtreras client-side eller via vy).
--
-- Idempotent. Applicera via Supabase SQL-editor eller MCP.
-- ---------------------------------------------------------------------------

alter table gf_documents add column if not exists description text;
alter table gf_documents add column if not exists access_code text;
