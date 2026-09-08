import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import RoleBadge from "@/components/RoleBadge";
import {
  customers,
  orgMembers,
  unitMembers,
  orgInvites,
  unitInvites,
} from "@/lib/data";
import { customerProfile } from "@/lib/customer-profiles";
import { assignment } from "@/lib/assignments";
import type { PreviewUnit } from "@/lib/preview-projects";
import ProjectDocAdmin from "@/components/ProjectDocAdmin";

// Internt: Kunder & avtal — admin-dashboard över hela kundbeståndet.
// Oliv-tema (interna nivån). Statisk testdata.
export default function InternalCustomers() {
  const base = "/c";

  const projectDocUnits = customers.flatMap((c) =>
    c.units.map((u) => ({ org: c.id, orgName: c.name, unitId: u.id, unitName: u.name })),
  );

  const projekt = customers.flatMap((c) => c.units).length;

  const memberSet = new Set<string>();
  let pendingTotal = 0;
  customers.forEach((c) => {
    orgMembers(c.id).forEach((m) => memberSet.add(m.person.id));
    c.units.forEach((u) => unitMembers(u.id).forEach((m) => memberSet.add(m.person.id)));
    pendingTotal += orgInvites(c.id).length + c.units.reduce((n, u) => n + unitInvites(u.id).length, 0);
  });

  const rows = customers.map((c) => {
    const members = new Set<string>();
    orgMembers(c.id).forEach((m) => members.add(m.person.id));
    c.units.forEach((u) => unitMembers(u.id).forEach((m) => members.add(m.person.id)));
    const invites = orgInvites(c.id).length + c.units.reduce((n, u) => n + unitInvites(u.id).length, 0);
    return {
      c,
      members: members.size,
      invites,
      contracts: detectContracts(c.units),
      contact: customerProfile(c.id)?.contact,
    };
  });

  const pending = customers.flatMap((c) => [
    ...orgInvites(c.id).map((i) => ({ ...i, custName: c.name, scope: "Kundnivå" })),
    ...c.units.flatMap((u) => unitInvites(u.id).map((i) => ({ ...i, custName: c.name, scope: u.name }))),
  ]);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Internt · plattformsadministration
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Kunder &amp; avtal</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Hela kundbeståndet — enheter, medlemmar, avtalsformer och väntande inbjudningar.
        </p>

        {/* Nyckeltal */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Kunder" value={customers.length} deltaTone="muted" />
          <StatCard label="Projekt" value={projekt} deltaTone="muted" />
          <StatCard label="Medlemmar" value={memberSet.size} delta="över alla kunder" deltaTone="muted" />
          <StatCard
            label="Inbjudningar"
            value={pendingTotal}
            delta={pendingTotal ? "väntar på svar" : "inga väntande"}
            deltaTone={pendingTotal ? "warn" : "muted"}
          />
        </div>

        {/* Kundtabell */}
        <SectionHeader>Kunder</SectionHeader>
        <div className="overflow-x-auto rounded-lg border border-border bg-panel">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-medium">Kund</th>
                <th className="px-3 py-2 font-medium">Typ</th>
                <th className="px-3 py-2 font-medium">Enheter</th>
                <th className="px-3 py-2 font-medium">Medlemmar</th>
                <th className="px-3 py-2 font-medium">Avtalsform</th>
                <th className="px-3 py-2 font-medium">Inbjudn.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, members, invites, contracts, contact }) => {
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-3 py-2">
                      <Link href={`${base}/${c.id}`} className="group flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#eae8d0] text-[11px] font-semibold text-[#4f4b22]">
                          {c.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink group-hover:text-[#6d6930]">
                            {c.name}
                          </span>
                          {contact && (
                            <span className="block truncate text-[11px] text-ink-3">{contact.name}</span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                        Entreprenad
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-2">
                      {c.units.length} {c.unitNounPlural.toLowerCase()}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{members}</td>
                    <td className="px-3 py-2">
                      {contracts.length ? (
                        <span className="flex flex-wrap gap-1">
                          {contracts.map((f) => (
                            <span key={f} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
                              {f}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-ink-3">–</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {invites ? (
                        <span className="rounded bg-warning-bg px-1.5 py-0.5 text-[11px] font-medium text-warning-text">
                          {invites}
                        </span>
                      ) : (
                        <span className="text-ink-3">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Link href={`${base}/${c.id}/admin`} className="text-[12px] text-ink-2 hover:text-ink">
                        Administration →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Uppdrag — vad är vårt uppdrag per projekt/kurs */}
        <SectionHeader>Uppdrag</SectionHeader>
        <div className="overflow-x-auto rounded-lg border border-border bg-panel">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-medium">Kund</th>
                <th className="px-3 py-2 font-medium">Uppdrag</th>
                <th className="px-3 py-2 font-medium">Beskrivning</th>
                <th className="px-3 py-2 font-medium">Operatör</th>
              </tr>
            </thead>
            <tbody>
              {customers.flatMap((c) =>
                c.units.map((u) => {
                  const a = assignment(c.id, u.id);
                  return (
                    <tr key={`${c.id}/${u.id}`} className="border-b border-border align-top last:border-0 hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <span className="block font-medium text-ink">{c.name}</span>
                        <span className="block text-[11px] text-ink-3">{u.name}</span>
                      </td>
                      <td className="px-3 py-2 text-ink">{a?.uppdrag ?? <span className="text-ink-3">—</span>}</td>
                      <td className="max-w-[320px] px-3 py-2 text-ink-2">
                        {a?.beskrivning ?? <span className="text-ink-3">ej angivet</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                        {a?.operator ?? <span className="text-ink-3">—</span>}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>

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
                      <td className="px-3 py-2 text-ink-2">{i.custName}</td>
                      <td className="px-3 py-2 text-ink-3">{i.scope}</td>
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

        <ProjectDocAdmin units={projectDocUnits} />
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
      {children}
    </h2>
  );
}

// Avtalsformer härledda ur enheternas metadata (AB 04 / ABT 06).
function detectContracts(units: PreviewUnit[]): string[] {
  const set = new Set<string>();
  units.forEach((u) => {
    const m = u.meta ?? "";
    if (m.includes("ABT 06")) set.add("ABT 06");
    if (m.includes("AB 04")) set.add("AB 04");
  });
  return [...set];
}
