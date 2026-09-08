// Centralt access-kontroll-helper. Läses av sidor + layout-gater + Sidebar
// så att alla beslut om "syns intern yta?" och "vilka kunder kan jag öppna?"
// kommer från samma källa (RLS + gf_is_platform_admin).
//
// React.cache → samma request slipper duplicerade DB-träffar när både layout
// och page kollar samma profil.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { deriveViewMode, type ViewMode } from "@/lib/auth/view-mode";

export interface AccessContext {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  viewMode: ViewMode;
  // Org-slugs som användaren har tillgång till (via gf_memberships).
  // RLS gör att även gf_unit_members-only-användare ser sin org via cascade.
  accessibleOrgSlugs: string[];
  // Antal direkta org-medlemskap (separerar customer från project-only).
  orgMembershipCount: number;
  // Antal direkta projekt-medlemskap (för project-mode-redirects).
  unitMembershipCount: number;
  // Om project-mode och bara ett projekt — den projektets org+slug för
  // direkt-redirect till `/c/<org>/<project>`.
  scopedOrgSlug: string | null;
  scopedProjectSlug: string | null;
}

export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [platformRes, membershipsRes, unitMembersRes] = await Promise.all([
    supabase.rpc("gf_is_platform_admin" as never),
    supabase.from("gf_memberships").select("org_id").eq("user_id", user.id),
    supabase.from("gf_unit_members").select("project_id").eq("user_id", user.id),
  ]);

  const isPlatformAdmin = platformRes.data === true;
  const memberships = (membershipsRes.data ?? []) as { org_id: string }[];
  const unitMembers = (unitMembersRes.data ?? []) as { project_id: string }[];

  const viewMode = deriveViewMode({
    isPlatformAdmin,
    orgMembershipCount: memberships.length,
    unitMembershipCount: unitMembers.length,
  });

  // Plattformsadmin har RLS-tillgång till alla orgs.
  if (isPlatformAdmin) {
    const allOrgs = await supabase.from("gf_organizations").select("slug").order("name");
    const slugs = ((allOrgs.data ?? []) as { slug: string | null }[])
      .map((r) => r.slug)
      .filter((s): s is string => Boolean(s));
    return {
      userId: user.id,
      email: user.email ?? "",
      isPlatformAdmin: true,
      viewMode,
      accessibleOrgSlugs: slugs,
      orgMembershipCount: memberships.length,
      unitMembershipCount: unitMembers.length,
      scopedOrgSlug: null,
      scopedProjectSlug: null,
    };
  }

  // Icke-admin: union av direkta org-medlemskap + orgs via enhetsmedlemskap.
  const orgIds = new Set<string>();
  memberships.forEach((m) => orgIds.add(m.org_id));

  // Project-mode-redirect: peka project-only-användare till deras första
  // projekt så de aldrig landar på kund-landningen. Om de har flera projekt
  // växlar de via ProjectSwitcher i headern.
  let scopedOrgSlug: string | null = null;
  let scopedProjectSlug: string | null = null;
  let firstProjectOrgId: string | null = null;
  let firstProjectSlug: string | null = null;
  if (unitMembers.length > 0) {
    const projRes = await supabase
      .from("gf_projects")
      .select("id, org_id, slug, name")
      .in(
        "id",
        unitMembers.map((u) => u.project_id),
      )
      .order("name");
    const projects = (projRes.data ?? []) as {
      id: string;
      org_id: string;
      slug: string | null;
      name: string;
    }[];
    projects.forEach((p) => orgIds.add(p.org_id));

    if (viewMode === "project" && projects.length > 0 && projects[0].slug) {
      firstProjectOrgId = projects[0].org_id;
      firstProjectSlug = projects[0].slug;
    }
  }

  let slugs: string[] = [];
  if (orgIds.size > 0) {
    const orgsRes = await supabase
      .from("gf_organizations")
      .select("id, slug")
      .in("id", Array.from(orgIds))
      .order("name");
    const orgs = ((orgsRes.data ?? []) as { id: string; slug: string | null }[])
      .filter((o) => o.slug != null);
    slugs = orgs.map((o) => o.slug as string);

    if (firstProjectOrgId && firstProjectSlug) {
      scopedOrgSlug = orgs.find((o) => o.id === firstProjectOrgId)?.slug ?? null;
      scopedProjectSlug = firstProjectSlug;
    }
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    isPlatformAdmin: false,
    viewMode,
    accessibleOrgSlugs: slugs,
    orgMembershipCount: memberships.length,
    unitMembershipCount: unitMembers.length,
    scopedOrgSlug,
    scopedProjectSlug,
  };
});

// Avgör om aktuell användare får mutera kund-nivån (bjuda in kundmedlemmar,
// ändra org-roller). Sant om plattformsadmin eller org-owner.
// 'admin' behålls för bakåtkompatibilitet med legacy-data — efter migration
// 0018 är bara owner/user/visitor i bruk.
export const canManageOrg = cache(async (orgSlug: string): Promise<boolean> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const platformRes = await supabase.rpc("gf_is_platform_admin" as never);
  if (platformRes.data === true) return true;

  const orgRes = await supabase
    .from("gf_organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  const org = orgRes.data as { id: string } | null;
  if (!org) return false;

  const roleRes = await supabase
    .from("gf_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", org.id)
    .maybeSingle();
  const role = (roleRes.data as { role: string } | null)?.role;
  return role === "owner" || role === "admin";
});

// Hämtar användarens roller för (orgId, projectId) — internal helper, cachad.
const fetchRoles = cache(
  async (
    projectId: string,
  ): Promise<{ orgRole: string | null; unitRole: string | null; isPlatformAdmin: boolean }> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { orgRole: null, unitRole: null, isPlatformAdmin: false };

    const platformRes = await supabase.rpc("gf_is_platform_admin" as never);
    if (platformRes.data === true) {
      return { orgRole: null, unitRole: null, isPlatformAdmin: true };
    }

    const projRes = await supabase
      .from("gf_projects")
      .select("org_id")
      .eq("id", projectId)
      .maybeSingle();
    const project = projRes.data as { org_id: string } | null;
    if (!project) return { orgRole: null, unitRole: null, isPlatformAdmin: false };

    const [orgRoleRes, unitRoleRes] = await Promise.all([
      supabase
        .from("gf_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", project.org_id)
        .maybeSingle(),
      supabase
        .from("gf_unit_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

    return {
      orgRole: (orgRoleRes.data as { role: string } | null)?.role ?? null,
      unitRole: (unitRoleRes.data as { role: string } | null)?.role ?? null,
      isPlatformAdmin: false,
    };
  },
);

// Avgör om aktuell användare får mutera ett specifikt projekt (bjuda in,
// ändra roller, toggla verktyg, redigera platshållare/faser/teknik).
// Sant om plattformsadmin, eller org-owner, eller unit-owner.
// 'admin' + 'manager' behålls för bakåtkompatibilitet med legacy-data.
export const canManageProject = cache(async (projectId: string): Promise<boolean> => {
  const { orgRole, unitRole, isPlatformAdmin } = await fetchRoles(projectId);
  if (isPlatformAdmin) return true;
  return (
    orgRole === "owner" ||
    orgRole === "admin" ||
    unitRole === "owner" ||
    unitRole === "manager"
  );
});

// Avgör om aktuell användare får ladda upp dokument / redigera dokument-
// metadata på projektet. Owner OR User — inte Visitor. Inkluderar legacy
// member/manager/larare/deltagare.
export const canUploadProject = cache(async (projectId: string): Promise<boolean> => {
  const { orgRole, unitRole, isPlatformAdmin } = await fetchRoles(projectId);
  if (isPlatformAdmin) return true;
  const writeRoles = new Set([
    "owner",
    "admin",
    "user",
    "member",
    "manager",
    "larare",
    "deltagare",
  ]);
  return (orgRole !== null && writeRoles.has(orgRole)) ||
    (unitRole !== null && writeRoles.has(unitRole));
});
