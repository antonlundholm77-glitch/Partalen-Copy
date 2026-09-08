-- ===========================================================================
-- 0011 — gf_admin_delete_user (SECURITY DEFINER)
-- ===========================================================================
-- RLS skyddar auth.users från anon-skrivning. För att kunna städa en
-- användare ur DB via UI:t krävs en SECURITY DEFINER-funktion som verifierar
-- att anroparen är platform-admin och sedan raderar (cascade till gf_profiles,
-- gf_system_roles, gf_memberships, gf_unit_members via FK on delete cascade).
--
-- APPLICERA via Supabase SQL-editor eller MCP. Idempotent (create or replace).
-- ---------------------------------------------------------------------------

create or replace function public.gf_admin_delete_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not gf_is_platform_admin() then
    raise exception 'Endast plattformsadmin får ta bort användare';
  end if;
  if target_user = auth.uid() then
    raise exception 'Du kan inte ta bort dig själv';
  end if;
  delete from auth.users where id = target_user;
end;
$$;

-- Bevilja anrop till anon/authenticated (säkerheten ligger i kontrollerna inne i funktionen).
grant execute on function public.gf_admin_delete_user(uuid) to anon, authenticated;
