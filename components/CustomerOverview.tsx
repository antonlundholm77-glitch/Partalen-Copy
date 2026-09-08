import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import RoleBadge from "@/components/RoleBadge";
import {
  getCustomer,
  orgMembers,
  unitMembers,
  orgInvites,
  unitInvites,
} from "@/lib/data";
import { phaseLabel, PROJECT_PHASES, PROJECT_STATUS_LABELS } from "@/lib/lifecycle";
import { customerProfile } from "@/lib/customer-profiles";
import type { PreviewUnit } from "@/lib/preview-projects";
import { orgBySlug, projectsByOrgSlug } from "@/lib/db/orgs";
import {
  dbOrgMembers,
  dbOrgInvitations,
  dbUnitMembers,
  dbUnitInvitations,
} from "@/lib/db/people";
import { AUTH_ENABLED } from "@/lib/auth";


// Gemensam shape som CustomerOverview-koden använder för rendering. Både
// fixture- och DB-pathen mappas till denna.
interface OvMember {
  person: { id: string; name: string; email: string };
  role: string;
}
interface OvInvite {
  email: string;
  role: string;
  scope: string;
}

// Kund-nivåns översikt: nyckeltal + enheter (projekt/kurser) + kundmedlemmar +
// väntande inbjudningar. Terrakotta-tema (kund-nivån). Källa = DB om
// AUTH_ENABLED=1, annars fixtures (lib/preview-people.ts).
export default async function CustomerOverview({ org }: { org: string }) {
  const customer = getCustomer(org);
  if (!customer) return null;
  const noun = customer.unitNounPlural;
  const units = customer.units;
  const profile = customerProfile(org);

  // Fas-fördelning (endast projekt) — faser med minst ett projekt.
  const phaseDist = PROJECT_PHASES.map((p) => ({
    label: p.label,
    n: units.filter((u) => u.phase === p.key).length,
  })).filter((p) => p.n > 0);

  const pagaende = units.filter((u) => u.status === "pagaende").length;
  const arkiverat = units.filter((u) => u.status === "arkiverat").length;

  // ── Identitets-källa (DB eller fixtures) ─────────────────────────────────
  let members: OvMember[];
  let pending: OvInvite[];
  let unitMembersByUnitId: Map<string, OvMember[]>;

  if (AUTH_ENABLED) {
    const orgRow = await orgBySlug(org);
    const dbProjects = orgRow ? await projectsByOrgSlug(org) : [];
    // Mappa projekt-slug ↔ id för fixture-units-loopen nedan
    const projectIdBySlug = new Map(dbProjects.map((p) => [p.slug, p.id]));

    const [dbMembers, dbOrgInvites, unitMemberLists, unitInviteLists] = await Promise.all([
      dbOrgMembers(org),
      orgRow ? dbOrgInvitations(orgRow.id) : Promise.resolve([]),
      Promise.all(
        units.map(async (u) => {
          const pid = projectIdBySlug.get(u.id);
          return pid ? dbUnitMembers(pid) : [];
        }),
      ),
      Promise.all(
        units.map(async (u) => {
          const pid = projectIdBySlug.get(u.id);
          return pid ? dbUnitInvitations(pid) : [];
        }),
      ),
    ]);

    members = dbMembers.map((m) => ({
      person: { id: m.user_id, name: m.name, email: m.email },
      role: m.role,
    }));

    unitMembersByUnitId = new Map(
      units.map((u, idx) => [
        u.id,
        unitMemberLists[idx].map((m) => ({
          person: { id: m.user_id, name: m.name, email: m.email },
          role: m.role,
        })),
      ]),
    );

    pending = [
      ...dbOrgInvites.map((i) => ({ email: i.email, role: i.role, scope: "Kundnivå" })),
      ...units.flatMap((u, idx) =>
        unitInviteLists[idx].map((i) => ({
          email: i.email,
          role: i.role,
          scope: u.name,
        })),
      ),
    ];
  } else {
    members = orgMembers(org).map((m) => ({
      person: { id: m.person.id, name: m.person.name, email: m.person.email },
      role: m.role,
    }));
    unitMembersByUnitId = new Map(
      units.map((u) => [
        u.id,
        unitMembers(u.id).map((m) => ({
          person: { id: m.person.id, name: m.person.name, email: m.person.email },
          role: m.role,
        })),
      ]),
    );
    pending = [
      ...orgInvites(org).map((i) => ({ email: i.email, role: i.role, scope: "Kundnivå" })),
      ...units.flatMap((u) =>
        unitInvites(u.id).map((i) => ({ email: i.email, role: i.role, scope: u.name })),
      ),
    ];
  }

  // Distinkt personräknare över hela kunden (kund + enhet)
  const people = new Map<string, true>();
  members.forEach((m) => people.set(m.person.id, true));
  unitMembersByUnitId.forEach((list) => list.forEach((m) => people.set(m.person.id, true)));
  const memberCount = people.size;

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b5532a]">
          Kund · Entreprenad
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">{customer.name}</h1>
        <p className="text-ink-2 mt-1 text-sm">
          {profile?.tagline ?? "Entreprenadkund — projekt, team och handlingar."}
        </p>

        {/* Nyckeltal */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={noun}
            value={units.length}
            delta={`${pagaende} pågående · ${arkiverat} arkiverat`}
            deltaTone="muted"
          />
          <StatCard label="Medlemmar" value={memberCount} delta={`${members.length} på kundnivå`} deltaTone="muted" />
          <StatCard
            label="Inbjudningar"
            value={pending.length}
            delta={pending.length ? "väntar på svar" : "inga väntande"}
            deltaTone={pending.length ? "warn" : "muted"}
          />
          <StatCard label="Pågående" value={pagaende} delta={`av ${units.length} projekt`} deltaTone="muted" />
        </div>

        {/* Fas-fördelning (projekt) */}
        {phaseDist.length > 0 && (
          <>
            <SectionHeader>Fas-fördelning</SectionHeader>
            <div className="rounded-lg border border-border bg-panel p-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                {phaseDist.map((p, i) => (
                  <div
                    key={p.label}
                    title={`${p.label}: ${p.n}`}
                    style={{ width: `${(p.n / units.length) * 100}%`, backgroundColor: greenTone(i, phaseDist.length) }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
                {phaseDist.map((p, i) => (
                  <span key={p.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: greenTone(i, phaseDist.length) }} />
                    {p.label} <span className="text-ink-3">· {p.n}</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* I fokus */}
        {profile?.highlights?.length ? (
          <>
            <SectionHeader>I fokus</SectionHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {profile.highlights.map((h) => (
                <div key={h.title} className="rounded-lg border border-border border-l-2 border-l-[#b5532a] bg-panel p-4">
                  <div className="text-[13px] font-medium">{h.title}</div>
                  <p className="text-ink-2 mt-1 text-[12px] leading-snug">{h.body}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* Enheter — grupperade per program när enheter har programtillhörighet */}
        <SectionHeader>{noun}</SectionHeader>
        {units.length === 0 ? (
          <Empty>Inga {noun.toLowerCase()} för den här kunden än.</Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {groupByProgram(units).map((group) => (
              <div key={group.program ?? "__none"}>
                {group.program && (
                  <h3 className="mb-2 text-[12px] font-semibold tracking-tight text-ink-2">
                    Program · {group.program}
                  </h3>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {group.units.map((u) => {
                    const mcount = unitMembersByUnitId.get(u.id)?.length ?? 0;
                    return (
                      <Link
                        key={u.id}
                        href={`/c/${org}/${u.id}`}
                        className="group rounded-lg border border-border bg-panel p-4 transition hover:border-border-strong"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium group-hover:text-[#b5532a]">{u.name}</span>
                          {u.status && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                u.status === "arkiverat"
                                  ? "bg-secondary text-ink-3"
                                  : "bg-success-bg text-success-text"
                              }`}
                            >
                              {PROJECT_STATUS_LABELS[u.status]}
                            </span>
                          )}
                        </div>
                        <p className="text-ink-3 mt-0.5 text-[12px] leading-snug">{u.meta}</p>
                        <div className="text-ink-3 mt-3 flex items-center gap-2 text-[11px]">
                          {u.phase && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">
                              {phaseLabel(u.phase)}
                            </span>
                          )}
                          <span>{mcount} medlemmar</span>
                          <span className={u.hasData ? "text-[#5e8553]" : "text-ink-3"}>
                            · {u.hasData ? "data" : "tomt"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kundmedlemmar */}
        <div className="mt-9 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b5532a]">
            Kundmedlemmar
          </h2>
          <Link href={`/c/${org}/admin`} className="text-[12px] text-ink-2 hover:text-ink">
            Administration →
          </Link>
        </div>
        {members.length === 0 ? (
          <Empty>Inga kundmedlemmar än.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m.person.id} className="flex items-center gap-3 rounded-lg border border-border bg-panel p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5e5d9] text-[13px] font-semibold text-[#8a3f20]">
                  {initials(m.person.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.person.name}</div>
                  <div className="text-ink-3 truncate text-[12px]">{m.person.email}</div>
                </div>
                <RoleBadge role={m.role} />
              </div>
            ))}
          </div>
        )}

        {/* Om kunden */}
        {profile && (profile.about || profile.contact) && (
          <>
            <SectionHeader>Om kunden</SectionHeader>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {profile.about && (
                <p className="rounded-lg border border-border bg-panel p-4 text-[13px] leading-relaxed text-ink-2 md:col-span-2">
                  {profile.about}
                </p>
              )}
              {profile.contact && (
                <div className="rounded-lg border border-border bg-panel p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Kontakt</div>
                  <div className="mt-1 font-medium">{profile.contact.name}</div>
                  <div className="text-ink-3 text-[12px]">{profile.contact.role}</div>
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="mt-1 block text-[12px] text-[#b5532a] hover:underline"
                  >
                    {profile.contact.email}
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {/* Väntande inbjudningar */}
        {pending.length > 0 && (
          <>
            <SectionHeader>Väntande inbjudningar</SectionHeader>
            <div className="overflow-hidden rounded-lg border border-border bg-panel">
              <table className="w-full text-[13px]">
                <tbody>
                  {pending.map((i, idx) => (
                    <tr key={`${i.email}-${idx}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium text-ink">{i.email}</td>
                      <td className="px-3 py-2 text-ink-2">{i.scope}</td>
                      <td className="px-3 py-2 text-right">
                        <RoleBadge role={i.role} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b5532a]">
      {children}
    </h2>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-ink-2">
      {children}
    </div>
  );
}

// Gruppera enheter per program i första-förekomst-ordning. Enheter utan program
// hamnar i en ledande grupp utan rubrik, så befintliga (oprogrammerade) kunder
// renderas exakt som förut.
function groupByProgram(
  units: PreviewUnit[],
): { program?: string; units: PreviewUnit[] }[] {
  const groups: { program?: string; units: PreviewUnit[] }[] = [];
  const byProgram = new Map<string, { program?: string; units: PreviewUnit[] }>();
  for (const u of units) {
    const key = u.program ?? "__none";
    let g = byProgram.get(key);
    if (!g) {
      g = { program: u.program, units: [] };
      byProgram.set(key, g);
      groups.push(g);
    }
    g.units.push(u);
  }
  return groups;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// Projekt-grön (#5e8553) i opacitetssteg för fas-fördelningens segment.
function greenTone(i: number, len: number): string {
  const t = len <= 1 ? 1 : i / (len - 1);
  return `rgba(94, 133, 83, ${(0.45 + 0.55 * t).toFixed(2)})`;
}
