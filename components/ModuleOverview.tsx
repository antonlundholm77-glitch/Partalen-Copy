import Link from "next/link";
import {
  modulesFor,
  moduleHref,
  type UnitKind,
  type NavItem,
  type ResolvedGroup,
} from "@/lib/modules";
import type { ProjectPhase, ProjectStatus } from "@/lib/types";
import { moduleIcon } from "@/lib/icons";

// Launchpad: enhetens verktyg som kort. Live-moduler länkar, övriga är dämpade.
// Livscykel + status visas i PhaseNav (under breadcrumben), inte här.
export default function ModuleOverview({
  basePath,
  projectName,
  meta,
  kind = "entreprenad",
  portalKeys = [],
  groups,
  purpose,
  disabledModuleKeys,
  embedded = false,
}: {
  basePath: string;
  projectName: string;
  meta?: string;
  kind?: UnitKind;
  phase?: ProjectPhase;
  status?: ProjectStatus;
  // Modulnycklar som denna enhet visar via inbäddad portal — räknas som live
  // även om modulregistret har status "soon".
  portalKeys?: string[];
  // Kurerad enhet: gruppera korten per sektion istället för kundtypens standard.
  groups?: ResolvedGroup[];
  purpose?: string;
  // Modulnycklar som är explicit avstängda för projektet (gf_project_modules).
  disabledModuleKeys?: string[];
  // När en parent (t.ex. custom hero) sköter scrollen — släpp egen wrapper.
  embedded?: boolean;
}) {
  const disabledSet = new Set(disabledModuleKeys ?? []);
  function Cards({ items }: { items: NavItem[] }) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((m) => {
          const href = moduleHref(basePath, m.segment);
          const live = m.status === "live" || portalKeys.includes(m.key);
          const I = moduleIcon(m.key);
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${
                    live ? "bg-accent-bg text-accent" : "bg-secondary text-ink-3"
                  }`}
                >
                  <I size={18} strokeWidth={1.75} />
                </span>
                {!live && (
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                    kommer snart
                  </span>
                )}
              </div>
              <div className="mt-3 font-medium">{m.label}</div>
              <p className="text-ink-2 mt-0.5 text-[13px] leading-snug">{m.blurb}</p>
            </>
          );
          return live ? (
            <Link
              key={m.key}
              href={href}
              className="rounded-lg border border-border bg-panel p-4 transition hover:border-border-strong"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={m.key}
              className="cursor-default rounded-lg border border-border bg-panel/60 p-4 opacity-70"
            >
              {inner}
            </div>
          );
        })}
      </div>
    );
  }

  const outerClass = embedded
    ? "px-8 py-8"
    : "h-full overflow-y-auto px-8 py-8";

  return (
    <div className={outerClass}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-medium tracking-tight">{projectName}</h1>
        {meta && <p className="text-ink-3 mt-0.5 text-sm">{meta}</p>}
        {purpose && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{purpose}</p>
        )}

        {groups ? (
          groups.map((g) => {
            const items = g.items
              .filter((m) => m.segment !== null) // hoppa Översikt-kortet (denna sida)
              .filter((m) => !disabledSet.has(m.key));
            if (items.length === 0) return null;
            return (
              <div key={g.section}>
                <h2 className="mb-3 mt-7 text-[13px] font-medium uppercase tracking-wide text-ink-3">
                  {g.section}
                </h2>
                <Cards items={items} />
              </div>
            );
          })
        ) : (
          <>
            <h2 className="mb-3 mt-7 text-[13px] font-medium uppercase tracking-wide text-ink-3">
              Moduler
            </h2>
            <Cards items={modulesFor(kind).filter((m) => !disabledSet.has(m.key))} />
          </>
        )}
      </div>
    </div>
  );
}
