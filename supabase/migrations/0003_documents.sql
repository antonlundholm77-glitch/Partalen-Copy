-- ===========================================================================
-- 0003 — Dokumentbibliotek (Supabase Storage + metadata)
-- ===========================================================================
-- Lean dokumentbibliotek per enhet (gf_projects). En logisk handling
-- (gf_documents) har en eller flera versioner (gf_document_versions); varje
-- version pekar på en fil i Storage-bucketen 'gf-documents'.
--
-- ÅTKOMST: per enhet via gf_can_access_unit(project_id) — samma OR-modell som
-- övriga projektdata (plattformsadmin / org-medlem / enhetsmedlem). Enheterna
-- (gf_projects-rader) skapas av valfritt bolag via UI:t/adminflödet.
--
-- Storage-sökväg: '<project_id>/<document_id>/v<n>-<filnamn>'. Första mappen i
-- objektnyckeln är projektets uuid, som storage-policyn använder för åtkomst.
-- ---------------------------------------------------------------------------

create type gf_document_status as enum ('arbetsmaterial', 'granskning', 'godkand');

create table gf_documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references gf_projects (id) on delete cascade,
  name            text not null,                 -- visningsnamn / filnamn
  phase           text,                          -- fas (metadata, fritext)
  discipline      text,                          -- teknikområde/disciplin (fritext)
  status          gf_document_status not null default 'arbetsmaterial',
  current_version integer not null default 1,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index gf_documents_project_idx on gf_documents (project_id);

create table gf_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references gf_documents (id) on delete cascade,
  project_id   uuid not null references gf_projects (id) on delete cascade, -- denormaliserat för RLS
  version      integer not null,
  storage_path text not null,                    -- nyckel i bucketen 'gf-documents'
  size         bigint,
  mime         text,
  uploaded_by  uuid references auth.users (id) on delete set null,
  uploaded_at  timestamptz not null default now(),
  unique (document_id, version)
);
create index gf_document_versions_doc_idx on gf_document_versions (document_id);

-- updated_at-trigger
create or replace function public.gf_documents_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger gf_documents_touch_trg
  before update on gf_documents
  for each row execute function public.gf_documents_touch();

-- ---------------------------------------------------------------------------
-- RLS — per enhet (gf_can_access_unit), samma modell som gf_tb_entries m.fl.
-- ---------------------------------------------------------------------------
alter table gf_documents          enable row level security;
alter table gf_document_versions  enable row level security;

create policy gf_documents_access on gf_documents
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

create policy gf_document_versions_access on gf_document_versions
  for all using (gf_can_access_unit(project_id)) with check (gf_can_access_unit(project_id));

-- ---------------------------------------------------------------------------
-- Storage-bucket + policies (privat). Åtkomst via projektets uuid = första
-- mappen i objektnyckeln, gf_can_access_unit gäller per enhet.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gf-documents', 'gf-documents', false)
on conflict (id) do nothing;

create policy gf_docs_storage_select on storage.objects
  for select using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

create policy gf_docs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

create policy gf_docs_storage_update on storage.objects
  for update using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );

create policy gf_docs_storage_delete on storage.objects
  for delete using (
    bucket_id = 'gf-documents'
    and gf_can_access_unit(((storage.foldername(name))[1])::uuid)
  );
