import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { INTERNAL_AREAS } from "@/lib/modules";
import { customers, platformPeople, PREVIEW_PEOPLE } from "@/lib/data";
import { phaseLabel, PROJECT_STATUS_LABELS } from "@/lib/lifecycle";
import { buildInternalAccessTree } from "@/lib/db/internal-access";
import { AUTH_ENABLED } from "@/lib/auth";


// Plattformsnivåns översikt: nyckeltal + kund-/projektdashboard + intern yta +
// team & arbetssätt.
// AUTH_ENABLED=1 → räknare och team-widget från DB. Kund-/projektkorten är
// fortfarande fixture-drivna (visar phase/status från fixture-strukturen).
export default async function InternalOverview() {
  const projekt = customers.flatMap((c) => c.units);
  const pagaende = projekt.filter((u) => u.status === "pagaende").length;
  const arkiverat = projekt.filter((u) => u.status === "arkiverat").length;

  // Nyckeltal från DB om AUTH_ENABLED, annars fixtures. Team-widgeten (TEAM
  // längst ned) är kuraterad och hämtas inte från DB — den behåller
  // konsult-flaggor som inte finns på gf_profiles.
  let totalUsers: number;
  let externa: number;
  if (AUTH_ENABLED) {
    const result = await buildInternalAccessTree();
    totalUsers = result.stats.totalUsers;
    externa = result.stats.externalCount;
  } else {
    const fixtureTeam = platformPeople();
    totalUsers = PREVIEW_PEOPLE.length;
    externa = PREVIEW_PEOPLE.length - fixtureTeam.length;
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Intern plattform
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Översikt</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Samlad bild av kunder, projekt och team — navet för det interna arbetet.
        </p>

        {/* Nyckeltal */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Kunder" value={customers.length} deltaTone="muted" />
          <StatCard
            label="Projekt"
            value={projekt.length}
            delta={`${pagaende} pågående · ${arkiverat} arkiverat`}
            deltaTone="muted"
          />
          <StatCard
            label="Användare"
            value={totalUsers}
            delta={`${externa} externa konton`}
            deltaTone="muted"
          />
        </div>

        {/* Kunder & projekt */}
        <SectionHeader>Kunder &amp; projekt</SectionHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {customers.map((c) => {
            return (
              <div key={c.id} className="rounded-lg border border-border bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/c/${c.id}`} className="group min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f5e5d9] text-[12px] font-semibold text-[#8a3f20]">
                        {c.name.charAt(0)}
                      </span>
                      <span className="truncate font-medium group-hover:text-[#b5532a]">
                        {c.name}
                      </span>
                    </div>
                  </Link>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                    Entreprenad
                  </span>
                </div>

                <p className="text-ink-3 mt-2 text-[11px] font-medium uppercase tracking-wide">
                  {c.units.length} {c.unitNounPlural.toLowerCase()}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {c.units.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/c/${c.id}/${u.id}`}
                        className="flex items-center justify-between gap-2 py-1.5 text-[13px] hover:text-[#5e8553]"
                      >
                        <span className="truncate">{u.name}</span>
                        {u.status && (
                          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-3">
                            {u.phase && <span>{phaseLabel(u.phase)}</span>}
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                u.status === "arkiverat" ? "bg-ink-3/50" : "bg-[#5e8553]"
                              }`}
                              title={PROJECT_STATUS_LABELS[u.status]}
                            />
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Intern yta */}
        <SectionHeader>Intern yta</SectionHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INTERNAL_AREAS.map((a) => {
            const live = a.status === "live" && a.segment;
            const body = (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.label}</span>
                  {!live && (
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                      snart
                    </span>
                  )}
                </div>
                <p className="text-ink-2 mt-1 text-[12px] leading-snug">{a.blurb}</p>
              </>
            );
            return live ? (
              <Link
                key={a.key}
                href={`/intern/${a.segment}`}
                className="rounded-lg border border-border bg-panel p-4 transition hover:border-border-strong"
              >
                {body}
              </Link>
            ) : (
              <div key={a.key} className="rounded-lg border border-border bg-panel/60 p-4 opacity-70">
                {body}
              </div>
            );
          })}
        </div>

        {/* Teamet */}
        <SectionHeader>Teamet</SectionHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((p) => {
            const consultant = !!p.role;
            return (
              <div key={p.name} className="flex items-center gap-3 rounded-lg border border-border bg-panel p-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                    consultant ? "bg-[#f5e5d9] text-[#8a3f20]" : "bg-[#eae8d0] text-[#4f4b22]"
                  }`}
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{p.name}</span>
                    {consultant && (
                      <span className="shrink-0 rounded bg-[#f5e5d9] px-1.5 py-0.5 text-[10px] font-medium text-[#8a3f20]">
                        {p.role}
                      </span>
                    )}
                  </div>
                  <div className="text-ink-3 truncate text-[12px]">
                    {consultant ? "Extern" : "Internt"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Så jobbar vi */}
        <SectionHeader>Så jobbar vi</SectionHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((pr) => (
            <div key={pr.title} className="rounded-lg border-l-2 border-l-[#6d6930] border border-border bg-panel p-4">
              <div className="text-[13px] font-medium">{pr.title}</div>
              <p className="text-ink-2 mt-1 text-[12px] leading-snug">{pr.body}</p>
            </div>
          ))}
        </div>

        <p className="text-ink-3 mt-8 text-[11px]">
          Prototypdata · innehållet i sektionerna nedan (team, arbetssätt) är ett utkast att redigera.
        </p>
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

// Leveransteamet (visningsroster). role satt = extern/konsult.
const TEAM: { name: string; role?: string }[] = [
  { name: "Kent Karlsson" },
  { name: "Clas Tosser" },
  { name: "Camilla Sondermann" },
  { name: "Anders Strömberg" },
  { name: "Anna Karlsson" },
  { name: "Anna Alavaara", role: "Konsult" },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "En sanning per projekt",
    body: "TB, mängder och handlingar vävda per AMA-kod — samma underlag för alla.",
  },
  {
    title: "Ärligt tomt",
    body: "Vi visar aldrig fejkdata. Tomt är tomt tills något verkligt finns.",
  },
  {
    title: "Spårbar behörighet",
    body: "RLS per enhet, roller och inbjudningar styr vem som ser vad.",
  },
  {
    title: "Respekt för AMA",
    body: "Vi visar användarens transformation — aldrig upphovsrättsskyddad AMA-text.",
  },
];
