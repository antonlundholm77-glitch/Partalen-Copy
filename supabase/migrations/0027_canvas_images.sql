-- Bildbibliotek för canvas-editorn
-- Alla uppladdade bilder registreras här och kan återanvändas i alla canvases.
-- Storage-sökvägar pekar på canvas-assets-bucketen (skapades i 0026).

create table public.gf_canvas_images (
  id           uuid        primary key default gen_random_uuid(),
  storage_path text        not null unique,
  file_name    text        not null,
  created_by   uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index gf_canvas_images_created_at_idx on public.gf_canvas_images (created_at desc);

alter table public.gf_canvas_images enable row level security;

-- Alla platform admins ser hela biblioteket
create policy "gf_canvas_images_select" on public.gf_canvas_images
  for select using (public.gf_is_platform_admin());

-- Man kan bara lägga till sina egna bilder
create policy "gf_canvas_images_insert" on public.gf_canvas_images
  for insert with check (public.gf_is_platform_admin() and created_by = auth.uid());

-- Alla admins kan ta bort (för framtida bibliotekshantering)
create policy "gf_canvas_images_delete" on public.gf_canvas_images
  for delete using (public.gf_is_platform_admin());
