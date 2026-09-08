import Link from "next/link";
import { customers, unitMembers } from "@/lib/data";
import { phaseLabel, PROJECT_STATUS_LABELS } from "@/lib/lifecycle";
import { buildInternalAccessTree } from "@/lib/db/internal-access";
import { AUTH_ENABLED } from "@/lib/auth";
import { StatCard } from "@/components/ui/stat-card";

export default async function PartGroupOverview() {
  const bolag = customers.filter((c) => c.kind === "entreprenad");
  const projekt = bolag.flatMap((c) => c.units);
  const pagaende = projekt.filter((u) => u.status === "pagaende").length;

  let totalUsers = 0;
  if (AUTH_ENABLED) {
    const result = await buildInternalAccessTree();
    totalUsers = result.stats.totalUsers;
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Part Plattform · administration
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Översikt</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Samlad bild av bolag och projekt.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Bolag"
            value={bolag.length}
            delta="aktiva"
            deltaTone="muted"
          />
          <StatCard
            label="Projekt"
            value={projekt.length}
            delta={`${pagaende} pågående`}
            deltaTone="muted"
          />
          {AUTH_ENABLED && (
            <StatCard
              label="Användare"
              value={totalUsers}
              delta="totalt"
              deltaTone="muted"
            />
          )}
        </div>

        <h2 className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Bolag &amp; projekt
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {bolag.map((c) => (
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
                      {u.status ? (
                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-3">
                          {u.phase && <span>{phaseLabel(u.phase)}</span>}
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.status === "arkiverat" ? "bg-ink-3/50" : "bg-[#5e8553]"
                            }`}
                            title={PROJECT_STATUS_LABELS[u.status]}
                          />
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] text-ink-3">
                          {unitMembers(u.id).length || ""}{" "}
                          {unitMembers(u.id).length ? "med." : ""}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-3 py-1.5 text-[13px] text-ink-2 transition hover:border-border-strong hover:text-ink"
          >
            Administrera plattformen →
          </Link>
        </div>
      </div>
    </div>
  );
}
