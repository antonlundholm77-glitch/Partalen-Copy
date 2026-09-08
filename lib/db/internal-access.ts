// Cross-tenant aggregat för /intern/behorighet. Hämtar allt på en gång
// (orgs + projekt + memberships + unit_members + invitations + profiles +
// system_roles) och bygger upp OrgTreeData. Plattformsadmin krävs via RLS
// (gf_is_platform_admin via plattformsadmin-domänen).

import { createClient } from "@/lib/supabase/server";
import type { OrgTreeData } from "@/components/OrgTree";

type OrgRow = { id: string; name: string; slug: string | null; kind: string };
type ProjectRow = { id: string; org_id: string; name: string; slug: string | null };
type MembershipRow = { user_id: string; org_id: string; role: string };
type UnitMemberRow = { user_id: string; project_id: string; role: string };
type ProfileRow = { user_id: string; email: string | null; full_name: string | null; is_staff?: boolean };
type SystemRoleRow = { user_id: string; role: string };
type InvitationRow = {
  email: string;
  org_id: string;
  project_id: string | null;
  role: string;
  status: string;
};

export interface InternalAccessStats {
  totalUsers: number;
  platformCount: number;
  externalCount: number;
  pendingInvites: number;
}

export interface InternalAccessResult {
  tree: OrgTreeData;
  stats: InternalAccessStats;
}

export async function buildInternalAccessTree(): Promise<InternalAccessResult> {
  const supabase = await createClient();

  const [orgsRes, projectsRes, profilesRes, membershipsRes, unitMembersRes, systemRolesRes, invitationsRes] =
    await Promise.all([
      supabase.from("gf_organizations").select("id, name, slug, kind").order("name"),
      supabase.from("gf_projects").select("id, org_id, name, slug").order("name"),
      supabase.from("gf_profiles").select("user_id, email, full_name"),
      supabase.from("gf_memberships").select("user_id, org_id, role"),
      supabase.from("gf_unit_members").select("user_id, project_id, role"),
      supabase.from("gf_system_roles").select("user_id, role"),
      supabase
        .from("gf_invitations")
        .select("email, org_id, project_id, role, status")
        .eq("status", "pending"),
    ]);

  const orgs = (orgsRes.data ?? []) as OrgRow[];
  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const memberships = (membershipsRes.data ?? []) as MembershipRow[];
  const unitMembers = (unitMembersRes.data ?? []) as UnitMemberRow[];
  const systemRoles = (systemRolesRes.data ?? []) as SystemRoleRow[];
  const invitations = (invitationsRes.data ?? []) as InvitationRow[];

  // Profilkort per user_id
  const profileById = new Map(profiles.map((p) => [p.user_id, p]));

  // Intern personal = email-domän @part-group.example. System-roller läggs på.
  const systemRoleByUser = new Map(systemRoles.map((r) => [r.user_id, r.role]));
  const platformProfiles = profiles.filter((p) =>
    (p.email ?? "").toLowerCase().endsWith("@part-group.example"),
  );
  const platformUsers = platformProfiles.map((p) => ({
    user_id: p.user_id,
    name: p.full_name ?? p.email ?? "(okänd)",
    email: p.email ?? "",
    role: systemRoleByUser.get(p.user_id) ?? "superadmin",
  }));

  // Indexering per org/projekt
  const membershipsByOrg = new Map<string, MembershipRow[]>();
  for (const m of memberships) {
    const arr = membershipsByOrg.get(m.org_id) ?? [];
    arr.push(m);
    membershipsByOrg.set(m.org_id, arr);
  }
  const unitMembersByProject = new Map<string, UnitMemberRow[]>();
  for (const u of unitMembers) {
    const arr = unitMembersByProject.get(u.project_id) ?? [];
    arr.push(u);
    unitMembersByProject.set(u.project_id, arr);
  }
  const orgInvitesByOrg = new Map<string, InvitationRow[]>();
  const unitInvitesByProject = new Map<string, InvitationRow[]>();
  for (const i of invitations) {
    if (i.project_id) {
      const arr = unitInvitesByProject.get(i.project_id) ?? [];
      arr.push(i);
      unitInvitesByProject.set(i.project_id, arr);
    } else {
      const arr = orgInvitesByOrg.get(i.org_id) ?? [];
      arr.push(i);
      orgInvitesByOrg.set(i.org_id, arr);
    }
  }

  const projectsByOrg = new Map<string, ProjectRow[]>();
  for (const p of projects) {
    const arr = projectsByOrg.get(p.org_id) ?? [];
    arr.push(p);
    projectsByOrg.set(p.org_id, arr);
  }

  // Bygg kundträdet
  const customers = orgs.map((org) => {
    const orgMembers = (membershipsByOrg.get(org.id) ?? []).map((m) => {
      const profile = profileById.get(m.user_id);
      return {
        user_id: m.user_id,
        name: profile?.full_name ?? profile?.email ?? "(okänd)",
        email: profile?.email ?? "",
        role: m.role,
      };
    });
    const orgInvites = (orgInvitesByOrg.get(org.id) ?? []).map((i) => ({
      email: i.email,
      role: i.role,
      pending: true,
    }));
    const orgProjects = projectsByOrg.get(org.id) ?? [];
    const kind = "entreprenad" as const;

    return {
      id: org.slug ?? org.id,
      name: org.name,
      tag: "Entreprenad",
      kind,
      users: [...orgMembers, ...orgInvites],
      units: orgProjects.map((p) => {
        const members = (unitMembersByProject.get(p.id) ?? []).map((u) => {
          const profile = profileById.get(u.user_id);
          return {
            user_id: u.user_id,
            name: profile?.full_name ?? profile?.email ?? "(okänd)",
            email: profile?.email ?? "",
            role: u.role,
          };
        });
        const invites = (unitInvitesByProject.get(p.id) ?? []).map((i) => ({
          email: i.email,
          role: i.role,
          pending: true,
        }));
        return {
          id: p.slug ?? p.id,
          name: p.name,
          users: [...members, ...invites],
        };
      }),
    };
  });

  // Stats
  const totalUsers = profiles.length;
  const platformCount = platformProfiles.length;
  const externalCount = totalUsers - platformCount;
  const pendingInvites = invitations.length;

  return {
    tree: { platformUsers, customers },
    stats: { totalUsers, platformCount, externalCount, pendingInvites },
  };
}
