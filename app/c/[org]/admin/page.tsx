import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import MembersTable from "@/components/MembersTable";
import OrgAdminPanel from "@/components/OrgAdminPanel";
import ProjectAdminPanel from "@/components/ProjectAdminPanel";
import AssignmentAdminPanel from "@/components/AssignmentAdminPanel";
import { getCustomer, orgMembers, unitMembers } from "@/lib/data";
import {
  dbOrgMembers,
  dbOrgInvitations,
  dbUnitMemberCountsByOrgSlug,
} from "@/lib/db/people";
import { orgBySlug, projectsByOrgSlug } from "@/lib/db/orgs";
import { assignmentsByOrgSlug } from "@/lib/db/assignments";
import { AUTH_ENABLED } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { canManageOrg, getAccessContext } from "@/lib/auth/access";

// Kund-administration: medlemmar och enheter.
//
// AUTH_ENABLED=1 + auth → DB-backad (invite/role/remove via actions).
// default          → fixtures (lib/preview-people.ts), read-only.

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function CustomerAdmin({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const customer = getCustomer(org);
  if (!customer) notFound();

  if (AUTH_ENABLED) {
    const orgRow = await orgBySlug(org);
    const [members, invitations, projects, unitCounts, origin, user, canManage, assignments, ctx] =
      await Promise.all([
        dbOrgMembers(org),
        orgRow ? dbOrgInvitations(orgRow.id) : Promise.resolve([]),
        projectsByOrgSlug(org),
        dbUnitMemberCountsByOrgSlug(org),
        siteOrigin(),
        currentUser(),
        canManageOrg(org),
        assignmentsByOrgSlug(org),
        getAccessContext(),
      ]);
    const isPlatformAdmin = ctx?.isPlatformAdmin ?? false;

    const unitNounSingular = orgRow?.unit_noun ?? "projekt";
    const unitNounPlural = orgRow?.unit_noun_plural ?? "Projekt";

    return (
      <AppShell
        currentCustomerId={org}
        showSignOut={AUTH_ENABLED}
      >
        <div className="h-full overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-xl font-medium tracking-tight">
              {customer.name} · Administration
            </h1>
            <p className="text-ink-3 mt-0.5 text-sm">
              Kundadmin · medlemmar och {unitNounPlural.toLowerCase()}
            </p>

            <div className="mt-6">
              <OrgAdminPanel
                orgSlug={org}
                orgName={customer.name}
                senderName={user?.name}
                canManage={canManage}
                members={members.map((m) => ({
                  user_id: m.user_id,
                  name: m.name,
                  email: m.email,
                  role: m.role,
                }))}
                invitations={invitations.map((i) => ({
                  id: i.id,
                  email: i.email,
                  role: i.role,
                  token: i.token,
                  expires_at: i.expires_at,
                  created_at: i.created_at,
                }))}
                inviteBaseUrl={origin}
              />
            </div>

            <div className="mt-8">
              <ProjectAdminPanel
                orgSlug={org}
                unitNounSingular={unitNounSingular}
                unitNounPlural={unitNounPlural}
                projects={projects.map((p) => ({
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  phase: p.phase,
                  status: p.status,
                  meta: p.meta,
                  program: p.program,
                  member_count: unitCounts.get(p.slug) ?? 0,
                }))}
              />
            </div>

            {isPlatformAdmin && (
              <div className="mt-10">
                <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-ink-3">
                  Uppdrag
                </h2>
                <AssignmentAdminPanel
                  orgSlug={org}
                  assignments={assignments}
                />
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // Fixture-fallback (oförändrad).
  const members = orgMembers(org).map((m) => ({
    name: m.person.name,
    email: m.person.email,
    role: m.role,
  }));
  const unitCounts = new Map(customer.units.map((u) => [u.id, unitMembers(u.id).length]));

  return (
    <AppShell
      currentCustomerId={org}
      showSignOut={AUTH_ENABLED}
    >
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-medium tracking-tight">
            {customer.name} · Administration
          </h1>
          <p className="text-ink-3 mt-0.5 text-sm">
            Kundadmin · medlemmar och {customer.unitNounPlural.toLowerCase()}
          </p>

          <h2 className="mb-3 mt-7 text-[13px] font-medium uppercase tracking-wide text-ink-3">
            Organisationsmedlemmar
          </h2>
          <MembersTable rows={members} empty="Inga organisationsmedlemmar än." />

          <h2 className="mb-3 mt-7 text-[13px] font-medium uppercase tracking-wide text-ink-3">
            {customer.unitNounPlural}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customer.units.map((u) => (
              <Link
                key={u.id}
                href={`/c/${org}/${u.id}/behorighet`}
                className="rounded-lg border border-border bg-surface p-4 transition hover:border-border-3"
              >
                <div className="font-medium">{u.name}</div>
                <div className="text-ink-3 mt-0.5 text-xs">
                  {unitCounts.get(u.id) ?? 0} medlemmar · hantera behörighet →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
