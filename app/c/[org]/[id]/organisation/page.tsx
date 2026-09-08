import { notFound } from "next/navigation";
import { getCustomer, getUnit, unitMembers, orgMembers } from "@/lib/data";
import { assignment } from "@/lib/assignments";
import { customerProfile } from "@/lib/customer-profiles";
import { Card } from "@/components/ui";
import RoleBadge from "@/components/RoleBadge";
import { projectBySlug } from "@/lib/db/orgs";
import { dbOrgMembers, dbUnitMembers } from "@/lib/db/people";
import { AUTH_ENABLED } from "@/lib/auth";


function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-accent-bg px-2 py-0.5 text-[11px] font-medium text-accent-text">
      {children}
    </span>
  );
}

function Person({
  name,
  email,
  meta,
  badge,
}: {
  name: string;
  email?: string;
  meta?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        {meta && <div className="truncate text-[12px] text-ink-3">{meta}</div>}
        {email && <div className="truncate text-[12px] text-ink-3">{email}</div>}
      </div>
      {badge}
    </Card>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-3">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const customer = getCustomer(org);
  const unit = getUnit(org, id);
  if (!customer || !unit) notFound();

  const a = assignment(org, id);
  const profile = customerProfile(org);

  // Identitets-källa: DB om AUTH_ENABLED, annars fixtures. Behåll samma
  // shape ({ person: { id, name, email }, role }) så renderingen oförändrad.
  let members: { person: { id: string; name: string; email: string }; role: string }[];
  let owner: { person: { id: string; name: string; email: string }; role: string } | undefined;
  if (AUTH_ENABLED) {
    const project = await projectBySlug(org, id);
    const [dbMembers, dbOrg] = await Promise.all([
      project ? dbUnitMembers(project.id) : Promise.resolve([]),
      dbOrgMembers(org),
    ]);
    members = dbMembers.map((m) => ({
      person: { id: m.user_id, name: m.name, email: m.email },
      role: m.role,
    }));
    const ownerRow = dbOrg.find((m) => m.role === "owner");
    owner = ownerRow
      ? {
          person: { id: ownerRow.user_id, name: ownerRow.name, email: ownerRow.email },
          role: ownerRow.role,
        }
      : undefined;
  } else {
    members = unitMembers(id).map((m) => ({
      person: { id: m.person.id, name: m.person.name, email: m.person.email },
      role: m.role,
    }));
    const ownerRow = orgMembers(org).find((m) => m.role === "owner");
    owner = ownerRow
      ? {
          person: { id: ownerRow.person.id, name: ownerRow.person.name, email: ownerRow.person.email },
          role: ownerRow.role,
        }
      : undefined;
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-medium tracking-tight">Organisation</h1>
        <p className="text-ink-3 mt-0.5 text-sm">{unit.name} · projektets parter</p>

        <div className="mt-6 grid gap-6">
          <Group title="Part Group">
            {a?.operator ? (
              <Person name={a.operator} meta="Ansvarig operatör" badge={<Pill>Operatör</Pill>} />
            ) : (
              <p className="text-sm text-ink-3">Ingen operatör tilldelad än.</p>
            )}
          </Group>

          <Group title={`Kund · ${customer.name}`}>
            {profile?.contact && (
              <Person
                name={profile.contact.name}
                email={profile.contact.email}
                meta={profile.contact.role}
              />
            )}
            {owner && owner.person.name !== profile?.contact?.name && (
              <Person name={owner.person.name} email={owner.person.email} badge={<RoleBadge role={owner.role} />} />
            )}
          </Group>

          {members.length > 0 && (
            <Group title="Projektmedlemmar">
              {members.map((mem) => (
                <Person
                  key={mem.person.id}
                  name={mem.person.name}
                  email={mem.person.email}
                  badge={<RoleBadge role={mem.role} />}
                />
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}
