import { StatCard } from "@/components/ui/stat-card";
import RoleBadge from "@/components/RoleBadge";
import OrgTree, { type OrgTreeData } from "@/components/OrgTree";
import {
  customers,
  platformPeople,
  PREVIEW_PEOPLE,
  orgMembers,
  orgInvites,
  unitMembers,
  unitInvites,
} from "@/lib/data";
import { buildInternalAccessTree } from "@/lib/db/internal-access";
import { AUTH_ENABLED } from "@/lib/auth";


// Internt: Användare & behörighet — admin-dashboard. Nyckeltal +
// systemroller + hierarkin (OrgTree) + behörighetsmodell. Oliv-tema.
// AUTH_ENABLED=1 → källan är gf_* via lib/db/internal-access; annars fixtures.
export default async function InternalAccess() {
  let data: OrgTreeData;
  let stats: {
    totalUsers: number;
    platformCount: number;
    externalCount: number;
    pendingInvites: number;
  };
  let platform: { name: string; email: string; systemRole?: string }[];

  if (AUTH_ENABLED) {
    const result = await buildInternalAccessTree();
    data = result.tree;
    stats = result.stats;
    platform = result.tree.platformUsers.map((u) => ({
      name: u.name ?? u.email,
      email: u.email,
      systemRole: u.role,
    }));
  } else {
    const platformFixture = platformPeople();
    const externa = PREVIEW_PEOPLE.length - platformFixture.length;
    const pendingTotal = customers.reduce(
      (n, c) =>
        n + orgInvites(c.id).length + c.units.reduce((m, u) => m + unitInvites(u.id).length, 0),
      0,
    );
    stats = {
      totalUsers: PREVIEW_PEOPLE.length,
      platformCount: platformFixture.length,
      externalCount: externa,
      pendingInvites: pendingTotal,
    };
    platform = platformFixture.map((p) => ({
      name: p.name,
      email: p.email,
      systemRole: p.systemRole,
    }));
    data = {
      platformUsers: platformFixture.map((p) => ({
        name: p.name,
        email: p.email,
        role: p.systemRole ?? "readonly",
      })),
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        tag: "Entreprenad",
        users: [
          ...orgMembers(c.id).map((m) => ({ name: m.person.name, email: m.person.email, role: m.role })),
          ...orgInvites(c.id).map((i) => ({ email: i.email, role: i.role, pending: true })),
        ],
        units: c.units.map((u) => ({
          id: u.id,
          name: u.name,
          users: [
            ...unitMembers(u.id).map((m) => ({ name: m.person.name, email: m.person.email, role: m.role })),
            ...unitInvites(u.id).map((i) => ({ email: i.email, role: i.role, pending: true })),
          ],
        })),
      })),
    };
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Internt · plattformsadministration
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Användare &amp; behörighet</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Vem har åtkomst till vad — systemroller, kundmedlemmar och enhetsmedlemmar per nivå.
        </p>

        {/* Nyckeltal */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Användare"
            value={stats.totalUsers}
            delta={AUTH_ENABLED ? "i DB" : "exempelkonton"}
            deltaTone="muted"
          />
          <StatCard
            label="Intern personal"
            value={stats.platformCount}
            delta="@partgroup.se"
            deltaTone="muted"
          />
          <StatCard
            label="Externa konton"
            value={stats.externalCount}
            delta="kund-/enhetsmedlemmar"
            deltaTone="muted"
          />
          <StatCard
            label="Inbjudningar"
            value={stats.pendingInvites}
            delta={stats.pendingInvites ? "väntar på svar" : "inga väntande"}
            deltaTone={stats.pendingInvites ? "warn" : "muted"}
          />
        </div>

        {/* Systemroller */}
        <SectionHeader>Systemroller (internt)</SectionHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platform.map((p) => (
            <div key={p.email} className="flex items-center gap-3 rounded-lg border border-border bg-panel p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eae8d0] text-[13px] font-semibold text-[#4f4b22]">
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-ink-3 truncate text-[12px]">{p.email}</div>
              </div>
              <RoleBadge role={p.systemRole ?? "superadmin"} />
            </div>
          ))}
        </div>

        {/* Hierarki */}
        <SectionHeader>Åtkomst per nivå</SectionHeader>
        <OrgTree data={data} canManage={AUTH_ENABLED} />
        <p className="text-ink-3 mt-3 text-[12px] leading-relaxed">
          Plattformsadmin styrs av domänen <strong className="text-ink-2">@partgroup.se</strong>.
          Kundmedlemmar ser hela kunden; enhetsmedlemmar (inkl. externa) ser bara sin enhet.
        </p>

        {/* Behörighetsmodell */}
        <SectionHeader>Behörighetsmodell</SectionHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ROLE_TIERS.map((t) => (
            <div key={t.title} className={`rounded-lg border border-border border-l-2 bg-panel p-4 ${t.bar}`}>
              <div className="text-[13px] font-medium">{t.title}</div>
              <p className="text-ink-2 mt-1 text-[12px] leading-snug">{t.body}</p>
            </div>
          ))}
        </div>
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

const ROLE_TIERS: { title: string; body: string; bar: string }[] = [
  {
    title: "Systemroller",
    body: "Superadmin & Support — intern personal, styrs av domänen @partgroup.se. Full insyn.",
    bar: "border-l-[#6d6930]",
  },
  {
    title: "Kundroller",
    body: "Ägare, Admin & Medlem — per kund. Ser hela kundens enheter. Delegeras av kundadmin.",
    bar: "border-l-[#b5532a]",
  },
  {
    title: "Enhetsroller",
    body: "Projektledare/Medlem/Läsare (projekt) och Lärare/Deltagare (kurs) — per enhet, även externa.",
    bar: "border-l-[#5e8553]",
  },
];
