// DB-backade läsningar för identitetslagret (Fas 1, steg 1c+).
// Speglar fixture-funktionerna i lib/preview-people.ts till samma shape så
// att seam-koden i sidor blir enkel: samma fält, olika källa.
//
// Slug → uuid lookup ligger i lib/db/orgs.ts; här hämtas medlemskap.

import { createClient } from "@/lib/supabase/server";
import { orgBySlug, projectsByOrgSlug } from "@/lib/db/orgs";

export interface DbOrgMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface DbUnitMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface DbInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  project_id: string | null;
}

type MembershipRow = { user_id: string; role: string; created_at: string };
type ProfileRow = { user_id: string; email: string | null; full_name: string | null };
type UnitMemberRow = { user_id: string; project_id: string; role: string; created_at: string };
type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  project_id: string | null;
};

async function profilesByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const res = await supabase
    .from("gf_profiles")
    .select("user_id, email, full_name")
    .in("user_id", userIds);
  const rows = (res.data ?? []) as ProfileRow[];
  return new Map(rows.map((p) => [p.user_id, p]));
}

export async function dbOrgMembers(orgSlug: string): Promise<DbOrgMember[]> {
  const org = await orgBySlug(orgSlug);
  if (!org) return [];

  const supabase = await createClient();
  const memRes = await supabase
    .from("gf_memberships")
    .select("user_id, role, created_at")
    .eq("org_id", org.id);
  const memberships = (memRes.data ?? []) as MembershipRow[];
  if (memberships.length === 0) return [];

  const profileById = await profilesByUserIds(memberships.map((m) => m.user_id));

  return memberships.map((m) => {
    const p = profileById.get(m.user_id);
    return {
      user_id: m.user_id,
      name: p?.full_name ?? p?.email ?? "(okänd användare)",
      email: p?.email ?? "",
      role: m.role,
      created_at: m.created_at,
    };
  });
}

export async function dbUnitMemberCountsByOrgSlug(
  orgSlug: string,
): Promise<Map<string, number>> {
  const projects = await projectsByOrgSlug(orgSlug);
  if (projects.length === 0) return new Map();

  const supabase = await createClient();
  const memRes = await supabase
    .from("gf_unit_members")
    .select("project_id")
    .in(
      "project_id",
      projects.map((p) => p.id),
    );
  const members = (memRes.data ?? []) as { project_id: string }[];

  const countsByProjectId = new Map<string, number>();
  for (const m of members) {
    countsByProjectId.set(m.project_id, (countsByProjectId.get(m.project_id) ?? 0) + 1);
  }

  const result = new Map<string, number>();
  for (const p of projects) result.set(p.slug, countsByProjectId.get(p.id) ?? 0);
  return result;
}

export async function dbUnitMembers(projectId: string): Promise<DbUnitMember[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_unit_members")
    .select("user_id, project_id, role, created_at")
    .eq("project_id", projectId);
  const rows = (res.data ?? []) as UnitMemberRow[];
  if (rows.length === 0) return [];

  const profileById = await profilesByUserIds(rows.map((r) => r.user_id));
  return rows.map((r) => {
    const p = profileById.get(r.user_id);
    return {
      user_id: r.user_id,
      name: p?.full_name ?? p?.email ?? "(okänd användare)",
      email: p?.email ?? "",
      role: r.role,
      created_at: r.created_at,
    };
  });
}

export async function dbOrgInvitations(orgId: string): Promise<DbInvitation[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_invitations")
    .select("id, email, role, status, token, expires_at, created_at, project_id")
    .eq("org_id", orgId)
    .is("project_id", null)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return ((res.data ?? []) as InvitationRow[]).map((r) => ({ ...r }));
}

export async function dbUnitInvitations(projectId: string): Promise<DbInvitation[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_invitations")
    .select("id, email, role, status, token, expires_at, created_at, project_id")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return ((res.data ?? []) as InvitationRow[]).map((r) => ({ ...r }));
}
