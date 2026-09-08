-- 0028: gf_is_platform_admin — byt platshållardomän mot Part Groups riktiga domän
--
-- 0002 satte 'part-group.example' som platshållare (se TODO-kommentar där).
-- Nu när plattformen körs mot ett riktigt Supabase-projekt (Partalen_copy)
-- måste kontrollen matcha Part Groups faktiska e-postdomän för att någon
-- överhuvudtaget ska kunna bli plattformsadmin.

create or replace function public.gf_is_platform_admin()
returns boolean
language sql
stable
as $$
  select lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) = 'partgroup.se';
$$;
