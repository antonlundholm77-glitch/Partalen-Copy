-- ===========================================================================
-- 0022 — Tidrapportering: stäng åtkomsten till plattformsadmin
-- ===========================================================================
-- Migration 0021 öppnade gf_time_entries för alla inloggade (user_id =
-- auth.uid() OR gf_is_platform_admin()). UI-vyn ligger under /intern/* som är
-- platform-admin-only, men en extern användare skulle kunna skriva sin egen
-- tid via direkt API-anrop. Den här migrationen lägger till krav på
-- gf_is_platform_admin() på alla operationer.
--
-- Effekt:
--   • SELECT: plattformsadmin ser allas rader (behövs för fas 2-avstämning).
--   • INSERT/UPDATE/DELETE: plattformsadmin OCH user_id = auth.uid() —
--     du måste vara intern personal och du kan bara skriva mot dig själv.
-- ---------------------------------------------------------------------------

drop policy if exists "gf_time_entries_select" on public.gf_time_entries;
drop policy if exists "gf_time_entries_insert" on public.gf_time_entries;
drop policy if exists "gf_time_entries_update" on public.gf_time_entries;
drop policy if exists "gf_time_entries_delete" on public.gf_time_entries;

create policy "gf_time_entries_select" on public.gf_time_entries
  for select using (gf_is_platform_admin());

create policy "gf_time_entries_insert" on public.gf_time_entries
  for insert with check (gf_is_platform_admin() and user_id = auth.uid());

create policy "gf_time_entries_update" on public.gf_time_entries
  for update
  using (gf_is_platform_admin() and user_id = auth.uid())
  with check (gf_is_platform_admin() and user_id = auth.uid());

create policy "gf_time_entries_delete" on public.gf_time_entries
  for delete using (gf_is_platform_admin() and user_id = auth.uid());
