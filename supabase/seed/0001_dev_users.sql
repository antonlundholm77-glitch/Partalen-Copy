-- ===========================================================================
-- DEV-SEED — testanvändare för identity-flödet
-- ===========================================================================
-- Skapar `auth.users` direkt så vi får realistisk data i admin-/behörighet-
-- ytorna utan att vänta på att alla testpersoner faktiskt loggar in via
-- Entra. `gf_handle_new_user`-triggern (0002_access.sql) fyller `gf_profiles`
-- när raden insertas; vi sätter sedan full_name explicit.
--
-- Idempotent: ON CONFLICT NOTHING på alla rader. Kör i Supabase SQL Editor
-- (eller via MCP apply_migration som dev-only).
--
-- OBS: Denna user har ingen lösenords-hash och kan inte logga in via OAuth.
-- För att faktiskt kunna logga in: använd Supabase Admin API eller bjud in
-- via dashboarden. Här handlar det bara om en FK-shell så att systemroll-UI:t
-- visar något.
--
-- Tenant-specifika testanvändare (bolags-/enhetsmedlemmar knutna till namngivna
-- kunder) är borttagna härifrån vid den generiska omstarten — bara det
-- interna systemrolls-exemplet kvar.
--
-- IDs:
--   c0000000-...007  Anna Lund  (internt support — gf_system_roles)
-- ---------------------------------------------------------------------------

-- ── 1. auth.users ─────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('c0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'anna.lund@part-group.example', '', now(),
   '{"provider":"dev-seed","providers":["dev-seed"]}', '{"full_name":"Anna Lund"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- ── 2. gf_profiles — säkerställ full_name (triggern fyller email automatiskt)
-- ── från on_auth_user_created. Om raden redan fanns: uppdatera namnet.
update gf_profiles set full_name = 'Anna Lund'
  where user_id = 'c0000000-0000-4000-8000-000000000007';

-- ── 3. gf_system_roles ────────────────────────────────────────────────────
insert into gf_system_roles (user_id, role) values
  ('c0000000-0000-4000-8000-000000000007', 'support')
on conflict (user_id, role) do nothing;
