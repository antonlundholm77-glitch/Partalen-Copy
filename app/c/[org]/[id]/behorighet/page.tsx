import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MembersTable from "@/components/MembersTable";
import RoleBadge from "@/components/RoleBadge";
import { Button } from "@/components/ui";
import UnitAdminPanel from "@/components/UnitAdminPanel";
import ProjectModulesPanel from "@/components/ProjectModulesPanel";
import { getCustomer, getUnit, unitMembers, unitInvites } from "@/lib/data";
import { projectBySlug } from "@/lib/db/orgs";
import { dbUnitMembers, dbUnitInvitations } from "@/lib/db/people";
import { dbProjectModuleOverrides } from "@/lib/db/project-modules";
import { AUTH_ENABLED } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { canManageProject } from "@/lib/auth/access";


async function siteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

// Enhets-nivå: behörighet — medlemmar och roller.
// AUTH_ENABLED=1 + auth → DB-backad (invite/role/remove via actions).
// default          → fixtures (read-only).
export default async function UnitBehorighet({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const customer = getCustomer(org);
  const unit = getUnit(org, id);
  if (!customer || !unit) notFound();

  const subtitle = "Projektets medlemmar och roller";

  if (AUTH_ENABLED) {
    const project = await projectBySlug(org, id);
    const [members, invitations, overrides, origin, user, canManage] = await Promise.all([
      project ? dbUnitMembers(project.id) : Promise.resolve([]),
      project ? dbUnitInvitations(project.id) : Promise.resolve([]),
      project ? dbProjectModuleOverrides(project.id) : Promise.resolve([]),
      siteOrigin(),
      currentUser(),
      project ? canManageProject(project.id) : Promise.resolve(false),
    ]);

    const overridesMap: Record<string, boolean> = {};
    for (const o of overrides) overridesMap[o.module_id] = o.enabled;

    return (
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-medium tracking-tight">Behörighet & verktyg</h1>
          <p className="text-ink-3 mt-0.5 text-sm">
            {unit.name} · {subtitle}
          </p>

          {!project ? (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              Projektet är inte seedat i DB ännu — bjud in funkar inte förrän
              det finns en rad i <code>gf_projects</code> med slug <code>{id}</code>.
            </div>
          ) : (
            <>
              <div className="mt-6">
                <UnitAdminPanel
                  orgSlug={org}
                  orgName={customer.name}
                  projectSlug={id}
                  projectName={unit.name}
                  senderName={user?.name}
                  unitKind="entreprenad"
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

              {canManage && (
                <div className="mt-10">
                  <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-ink-3">
                    Verktyg
                  </h2>
                  <ProjectModulesPanel
                    orgSlug={org}
                    projectSlug={id}
                    unitKind="entreprenad"
                    overrides={overridesMap}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Fixture-fallback (oförändrad).
  const members = unitMembers(id);
  const invites = unitInvites(id);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-medium tracking-tight">Behörighet</h1>
          <Button size="sm" disabled title="Kräver inkopplad data">
            Bjud in
          </Button>
        </div>
        <p className="text-ink-3 mt-0.5 text-sm">
          {unit.name} · {subtitle}
        </p>

        <h2 className="mb-3 mt-6 text-[13px] font-medium uppercase tracking-wide text-ink-3">
          Medlemmar
        </h2>
        <MembersTable
          rows={members.map((m) => ({ name: m.person.name, email: m.person.email, role: m.role }))}
          empty="Inga medlemmar än."
        />

        {invites.length > 0 && (
          <>
            <h2 className="mb-3 mt-7 text-[13px] font-medium uppercase tracking-wide text-ink-3">
              Väntande inbjudningar
            </h2>
            <div className="grid gap-2">
              {invites.map((i) => (
                <div
                  key={i.email}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-[13px]"
                >
                  <span className="text-ink-2">{i.email}</span>
                  <span className="flex items-center gap-2">
                    <RoleBadge role={i.role} />
                    <span className="text-ink-3 text-xs">väntar</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
