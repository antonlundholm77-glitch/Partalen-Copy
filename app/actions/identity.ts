"use server";

// Server actions för identitet — invite, role, remove.
//
// All auktorisering sker via RLS (policies definierade i 0002_access.sql).
// Vi kör med användarens auth-cookie → om en användare försöker mutera
// utan rätt roll får vi tillbaka ett 401/403-likt fel från Supabase, som vi
// returnerar till anroparen som { ok: false, error }.
//
// Mejlleverans är **inte** implementerad här (alt. C i identity-mapping §5.2):
// invite skapar bara DB-raden + token. Admin-UI:t visar token-länken som kan
// kopieras in i ett mejl manuellt. Bytet till Resend/Postmark senare påverkar
// endast den här filen.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orgBySlug } from "@/lib/db/orgs";

export type ActionResult<T = Record<string, unknown>> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// Specifik form för invite-actions: token + ISO-utgångsdatum så klienten kan
// auto-kopiera ett färdigt inbjudningsmeddelande direkt vid skapande.
export type InviteCreated = { token: string; expiresAt: string };

// Tre roller på båda nivåer (migration 0016). Legacy-värden (admin, member,
// manager, viewer, larare, deltagare) accepteras för bakåtkompatibilitet
// vid uppdatering av befintliga rader men nya invitations sätts alltid
// med de tre kanoniska värdena.
const ORG_ROLES = ["owner", "user", "visitor", "admin", "member"] as const;
const UNIT_ROLES = [
  "owner",
  "user",
  "visitor",
  "manager",
  "member",
  "viewer",
  "larare",
  "deltagare",
] as const;

type OrgRole = (typeof ORG_ROLES)[number];
type UnitRole = (typeof UNIT_ROLES)[number];

function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}

function isUnitRole(value: string): value is UnitRole {
  return (UNIT_ROLES as readonly string[]).includes(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// 32-tecken hex-token, säker från Node crypto.
function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// -----------------------------------------------------------------------------
// Org-nivå
// -----------------------------------------------------------------------------

export async function inviteToOrg(
  orgSlug: string,
  email: string,
  role: string,
): Promise<ActionResult<InviteCreated>> {
  const trimmed = email.trim().toLowerCase();
  if (!isEmail(trimmed)) return { ok: false, error: "Ogiltig e-postadress." };
  if (!isOrgRole(role)) return { ok: false, error: `Ogiltig roll: ${role}.` };

  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const invitedBy = userRes.user?.id ?? null;
  const token = newInviteToken();

  const res = await supabase
    .from("gf_invitations")
    .insert({
      email: trimmed,
      org_id: org.id,
      project_id: null,
      role,
      token,
      invited_by: invitedBy,
    } as never)
    .select("token, expires_at")
    .single();

  if (res.error) return { ok: false, error: res.error.message };
  const row = res.data as { token: string; expires_at: string };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true, data: { token: row.token, expiresAt: row.expires_at } };
}

export async function updateOrgRole(
  orgSlug: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  if (!isOrgRole(role)) return { ok: false, error: `Ogiltig roll: ${role}.` };

  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const supabase = await createClient();
  const res = await supabase
    .from("gf_memberships")
    .update({ role } as never)
    .eq("org_id", org.id)
    .eq("user_id", userId);

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true };
}

export async function removeOrgMember(
  orgSlug: string,
  userId: string,
): Promise<ActionResult> {
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const supabase = await createClient();
  const res = await supabase
    .from("gf_memberships")
    .delete()
    .eq("org_id", org.id)
    .eq("user_id", userId);

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Enhets-nivå
// -----------------------------------------------------------------------------

export async function inviteToUnit(
  orgSlug: string,
  projectSlug: string,
  email: string,
  role: string,
): Promise<ActionResult<InviteCreated>> {
  const trimmed = email.trim().toLowerCase();
  if (!isEmail(trimmed)) return { ok: false, error: "Ogiltig e-postadress." };
  if (!isUnitRole(role)) return { ok: false, error: `Ogiltig roll: ${role}.` };

  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const supabase = await createClient();
  const projRes = await supabase
    .from("gf_projects")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", projectSlug)
    .maybeSingle();
  const project = projRes.data as { id: string } | null;
  if (!project) return { ok: false, error: `Hittar inte ${projectSlug}.` };

  const { data: userRes } = await supabase.auth.getUser();
  const invitedBy = userRes.user?.id ?? null;
  const token = newInviteToken();

  const res = await supabase
    .from("gf_invitations")
    .insert({
      email: trimmed,
      org_id: org.id,
      project_id: project.id,
      role,
      token,
      invited_by: invitedBy,
    } as never)
    .select("token, expires_at")
    .single();

  if (res.error) return { ok: false, error: res.error.message };
  const row = res.data as { token: string; expires_at: string };
  revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  return { ok: true, data: { token: row.token, expiresAt: row.expires_at } };
}

export async function updateUnitRole(
  orgSlug: string,
  projectSlug: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  if (!isUnitRole(role)) return { ok: false, error: `Ogiltig roll: ${role}.` };

  const supabase = await createClient();
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const projRes = await supabase
    .from("gf_projects")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", projectSlug)
    .maybeSingle();
  const project = projRes.data as { id: string } | null;
  if (!project) return { ok: false, error: `Hittar inte ${projectSlug}.` };

  const res = await supabase
    .from("gf_unit_members")
    .update({ role } as never)
    .eq("project_id", project.id)
    .eq("user_id", userId);

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  return { ok: true };
}

export async function removeUnitMember(
  orgSlug: string,
  projectSlug: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const projRes = await supabase
    .from("gf_projects")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", projectSlug)
    .maybeSingle();
  const project = projRes.data as { id: string } | null;
  if (!project) return { ok: false, error: `Hittar inte ${projectSlug}.` };

  const res = await supabase
    .from("gf_unit_members")
    .delete()
    .eq("project_id", project.id)
    .eq("user_id", userId);

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Inbjudningar — gemensamt
// -----------------------------------------------------------------------------

export async function revokeInvite(
  inviteId: string,
  orgSlug: string,
  projectSlug?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_invitations")
    .update({ status: "revoked" } as never)
    .eq("id", inviteId);

  if (res.error) return { ok: false, error: res.error.message };
  if (projectSlug) revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  else revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Plattformsadministration (plattformsadmin-personal)
// -----------------------------------------------------------------------------

const SYSTEM_ROLES = ["superadmin", "support", "readonly"] as const;
type SystemRole = (typeof SYSTEM_ROLES)[number];
function isSystemRole(value: string): value is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(value);
}

export async function setSystemRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  if (!isSystemRole(role)) return { ok: false, error: `Ogiltig systemroll: ${role}.` };

  const supabase = await createClient();
  // PK är (user_id, role) → upsert. Vi tillåter att en person har flera roller.
  const res = await supabase
    .from("gf_system_roles")
    .upsert({ user_id: userId, role } as never, { onConflict: "user_id,role" });
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/intern/behorighet");
  return { ok: true };
}

export async function removeSystemRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  if (!isSystemRole(role)) return { ok: false, error: `Ogiltig systemroll: ${role}.` };

  const supabase = await createClient();
  const res = await supabase
    .from("gf_system_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/intern/behorighet");
  return { ok: true };
}

// Tar bort en användare helt — cascadar gf_profiles/gf_system_roles/
// gf_memberships/gf_unit_members. Anropar SECURITY DEFINER-funktionen
// gf_admin_delete_user som kollar platform-admin-status server-side.
export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await supabase.rpc(
    "gf_admin_delete_user" as never,
    { target_user: userId } as never,
  );
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/intern/behorighet");
  revalidatePath("/");
  return { ok: true };
}
