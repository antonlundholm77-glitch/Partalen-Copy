-- 0016: Soft-delete för gf_documents (papperskorg-koncept från PM Cloud)
--
-- Lägger till deleted_at + deleted_by. Tre states:
--   deleted_at IS NULL                — aktiv, syns i normal lista
--   deleted_at IS NOT NULL            — i papperskorgen, kan återställas
--                                       eller raderas permanent (storage + rad)
--
-- App-koden filtrerar default på deleted_at IS NULL. Explicit "Visa
-- papperskorg"-läge i UI:t hämtar det omvända.

alter table public.gf_documents
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

create index gf_documents_deleted_at_idx
  on public.gf_documents(deleted_at)
  where deleted_at is not null;
