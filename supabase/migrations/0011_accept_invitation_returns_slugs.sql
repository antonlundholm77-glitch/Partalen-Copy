-- 0013: gf_accept_invitation returnerar org_slug + project_slug
--
-- Bakgrund: Den inviterade användaren får inte läsa gf_invitations via RLS
-- (policy tillåter bara invited_by / org-admin / unit-manager). Tidigare
-- läste invite-page sin egen SELECT efter RPC för att veta vart att redirecta
-- — den failade tyst och vi hamnade på `/` istället för projektet.
--
-- Fix: ändra signatur från void → returns table(org_slug, project_slug). RPC
-- kör SECURITY DEFINER så den kan läsa orgs/projects oberoende av RLS.

drop function if exists public.gf_accept_invitation(text);

create or replace function public.gf_accept_invitation(invite_token text)
returns table(org_slug text, project_slug text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inv gf_invitations;
  v_org_slug text;
  v_project_slug text;
begin
  select * into inv from gf_invitations
  where token = invite_token and status = 'pending' and expires_at > now();

  if inv is null then
    raise exception 'Ogiltig eller utgången inbjudan';
  end if;

  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Inbjudan gäller en annan e-post';
  end if;

  if inv.project_id is not null then
    insert into gf_unit_members (user_id, project_id, role)
    values (auth.uid(), inv.project_id, inv.role::gf_unit_role)
    on conflict (user_id, project_id) do update set role = excluded.role;

    select p.slug into v_project_slug
    from gf_projects p where p.id = inv.project_id;
  else
    insert into gf_memberships (user_id, org_id, role)
    values (auth.uid(), inv.org_id, inv.role::gf_member_role)
    on conflict (user_id, org_id) do update set role = excluded.role;
    v_project_slug := null;
  end if;

  select o.slug into v_org_slug
  from gf_organizations o where o.id = inv.org_id;

  update gf_invitations set status = 'accepted' where id = inv.id;

  org_slug := v_org_slug;
  project_slug := v_project_slug;
  return next;
end;
$$;

grant execute on function public.gf_accept_invitation(text) to authenticated;
