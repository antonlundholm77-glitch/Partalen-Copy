-- Canvas whiteboard (Mural/Miro-light)
-- State sparas som JSONB (React Flow-format: { nodes, edges }).
-- project_id är nullable — interna canvases saknar koppling till projekt;
-- när vi lägger till /c/[org]/[id]/canvas pekar project_id på rätt rad.

create table public.gf_canvases (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null default 'Ny canvas',
  state      jsonb       not null default '{"nodes":[],"edges":[]}'::jsonb,
  project_id uuid        references public.gf_projects(id) on delete cascade,
  created_by uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gf_canvases enable row level security;

-- Platform admins har full åtkomst (v1: bara interna canvases)
create policy "canvas_platform_admin_all" on public.gf_canvases
  for all
  using  (public.gf_is_platform_admin())
  with check (public.gf_is_platform_admin());

create or replace function public.gf_canvases_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger gf_canvases_updated_at
  before update on public.gf_canvases
  for each row execute function public.gf_canvases_set_updated_at();

-- Storage bucket för canvas-bilder (upload från editor)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas-assets',
  'canvas-assets',
  false,
  20971520,
  array['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

create policy "canvas_assets_admin_all" on storage.objects
  for all
  using  (bucket_id = 'canvas-assets' and public.gf_is_platform_admin())
  with check (bucket_id = 'canvas-assets' and public.gf_is_platform_admin());
