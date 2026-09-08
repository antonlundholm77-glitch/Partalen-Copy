-- ===========================================================================
-- 0023 — Internt bibliotek: dokumenthantering på plattformsnivå
-- ===========================================================================
-- Ett internt bibliotek under /intern/bibliotek — mallar, policyer, kontrakt,
-- rapporter, presentationer som inte hör till ett specifikt kundprojekt.
-- Helt skild från gf_documents (projekt-scopad). Bara plattformsadmin
-- (gf_is_platform_admin) når den.
--
-- Dynamisk metadata: kategorier och statusar lagras i lookup-tabeller och
-- kan administreras via UI:n. Taggar är fri text-array på dokumentet med
-- autocomplete från befintliga.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- gf_doc_categories — kategori-katalog (dynamisk)
-- =============================================================================
create table public.gf_doc_categories (
  id text primary key,                                -- 'mall', 'policy', ...
  label text not null,                                -- 'Mall', 'Policy', ...
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_doc_categories enable row level security;

create policy "gf_doc_categories_read" on public.gf_doc_categories
  for select using (gf_is_platform_admin());

create policy "gf_doc_categories_write" on public.gf_doc_categories
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_doc_categories_updated_at before update on public.gf_doc_categories
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- gf_doc_statuses — status-katalog (dynamisk)
-- =============================================================================
create table public.gf_doc_statuses (
  id text primary key,                                -- 'utkast', 'aktiv', 'arkiverad'
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  is_terminal boolean not null default false,         -- arkiverad räknas som terminal
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_doc_statuses enable row level security;

create policy "gf_doc_statuses_read" on public.gf_doc_statuses
  for select using (gf_is_platform_admin());

create policy "gf_doc_statuses_write" on public.gf_doc_statuses
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_doc_statuses_updated_at before update on public.gf_doc_statuses
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- gf_library_documents — själva dokumenten
-- =============================================================================
create table public.gf_library_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id text references public.gf_doc_categories(id) on delete set null,
  status_id text references public.gf_doc_statuses(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  tags text[] not null default '{}',
  -- Storage
  storage_path text,                                  -- '<uuid>/<filename>' i gf-library-docs
  file_name text,
  file_size bigint,
  mime_type text,
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index gf_library_documents_category_idx
  on public.gf_library_documents(category_id);
create index gf_library_documents_status_idx
  on public.gf_library_documents(status_id);
create index gf_library_documents_owner_idx
  on public.gf_library_documents(owner_user_id);
create index gf_library_documents_tags_idx
  on public.gf_library_documents using gin(tags);

alter table public.gf_library_documents enable row level security;

create policy "gf_library_documents_read" on public.gf_library_documents
  for select using (gf_is_platform_admin());

create policy "gf_library_documents_write" on public.gf_library_documents
  for all
  using (gf_is_platform_admin())
  with check (gf_is_platform_admin());

create trigger gf_library_documents_updated_at before update on public.gf_library_documents
  for each row execute function public.gf_schedules_set_updated_at();

-- =============================================================================
-- Storage-bucket gf-library-docs (privat, platform-admin-only)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('gf-library-docs', 'gf-library-docs', false)
on conflict (id) do nothing;

create policy "gf_library_docs_storage_select" on storage.objects
  for select using (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

create policy "gf_library_docs_storage_insert" on storage.objects
  for insert with check (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

create policy "gf_library_docs_storage_update" on storage.objects
  for update
  using (bucket_id = 'gf-library-docs' and gf_is_platform_admin())
  with check (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

create policy "gf_library_docs_storage_delete" on storage.objects
  for delete using (bucket_id = 'gf-library-docs' and gf_is_platform_admin());

-- =============================================================================
-- Seed — defaults för kategorier och statusar (admin kan ändra efteråt)
-- =============================================================================
insert into public.gf_doc_categories (id, label, sort_order) values
  ('mall',         'Mall',          1),
  ('policy',       'Policy',        2),
  ('kontrakt',     'Kontrakt',      3),
  ('rapport',      'Rapport',       4),
  ('presentation', 'Presentation',  5),
  ('annat',        'Annat',         99)
on conflict (id) do nothing;

insert into public.gf_doc_statuses (id, label, sort_order, is_terminal) values
  ('utkast',     'Utkast',     1, false),
  ('aktiv',      'Aktiv',      2, false),
  ('arkiverad',  'Arkiverad',  3, true)
on conflict (id) do nothing;
