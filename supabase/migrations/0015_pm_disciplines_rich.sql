-- 0017: Rich data på pm_disciplines för Teknik-vyn (PM Cloud DisciplinesView-paritet).
--
-- Lägger till metadata-fält så varje discipline kan visas som ett kort med
-- status, progress, ansvarigt team, slutdatum, nyckelkomponenter och
-- integrationspunkter — som i PM Clouds DisciplineRow-detaljpanel.

alter table public.pm_disciplines
  add column description text,
  add column status text default 'planering',
  add column progress int default 0,
  add column phase_id uuid references public.pm_phases(id) on delete set null,
  add column key_components text[],
  add column integration_points text[],
  add column responsible_team text,
  add column target_date date,
  add column icon_name text;

create index pm_disciplines_phase_id_idx on public.pm_disciplines(phase_id);
