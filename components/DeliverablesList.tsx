// DB-driven leverabel-lista. Grupperar per fas, visar discipline + status
// + format. Klickbara rader → /c/<org>/<projekt>/leverabler/<code>.

import Link from "next/link";
import type { PmDeliverableWithJoins, PmPhase } from "@/lib/db/deliverables";

const STATUS_LABEL: Record<string, string> = {
  klar: "Klar",
  pagaende: "Pågående",
  granskning: "Granskning",
  "ej-paborjad": "Ej påbörjad",
};

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  klar: { bg: "#dcfce7", color: "#166534" },
  pagaende: { bg: "#fef3c7", color: "#92400e" },
  granskning: { bg: "#dbeafe", color: "#1e40af" },
  "ej-paborjad": { bg: "#f1f5f9", color: "#64748b" },
};

export default function DeliverablesList({
  basePath,
  phases,
  deliverables,
}: {
  basePath: string;
  phases: PmPhase[];
  deliverables: PmDeliverableWithJoins[];
}) {
  // Gruppera per fas (inkl. "Ingen fas" som fallback)
  const byPhase = new Map<string | null, PmDeliverableWithJoins[]>();
  for (const d of deliverables) {
    const key = d.phase_id;
    if (!byPhase.has(key)) byPhase.set(key, []);
    byPhase.get(key)!.push(d);
  }

  const orderedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-8">
      {orderedPhases.map((phase) => {
        const items = byPhase.get(phase.id) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={phase.id}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                Fas {phase.stage}
              </span>
              <h2 className="text-[15px] font-medium text-ink">{phase.name}</h2>
              {phase.status === "current" && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                  Aktuell
                </span>
              )}
              {phase.status === "completed" && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
                  Klar
                </span>
              )}
              <span className="ml-auto text-[12px] text-ink-3">
                {items.length} leverabler
              </span>
            </div>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
              {items.map((d, idx) => (
                <li
                  key={d.id}
                  className={
                    idx === 0
                      ? "border-t-0"
                      : "border-t border-border"
                  }
                >
                  <Link
                    href={`${basePath}/${d.code}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-secondary/40"
                  >
                    <span className="font-mono text-[11.5px] text-ink-3">{d.code}</span>
                    {d.discipline && (
                      <span
                        className="inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white"
                        style={{ background: d.discipline.color ?? "#64748b" }}
                        title={d.discipline.name}
                      >
                        {d.discipline.code}
                      </span>
                    )}
                    <span className="flex-1 truncate text-[13.5px] font-medium text-ink">
                      {d.name}
                    </span>
                    {d.format && (
                      <span className="hidden font-mono text-[11px] uppercase tracking-wide text-ink-3 sm:inline">
                        {d.format}
                      </span>
                    )}
                    <StatusPill status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Leverabler utan fas — visas sist */}
      {(byPhase.get(null) ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-medium text-ink">Övriga</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
            {(byPhase.get(null) ?? []).map((d, idx) => (
              <li key={d.id} className={idx === 0 ? "" : "border-t border-border"}>
                <Link
                  href={`${basePath}/${d.code}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-secondary/40"
                >
                  <span className="font-mono text-[11.5px] text-ink-3">{d.code}</span>
                  <span className="flex-1 truncate text-[13.5px] font-medium text-ink">
                    {d.name}
                  </span>
                  <StatusPill status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const tone = STATUS_TONE[status] ?? STATUS_TONE["ej-paborjad"];
  return (
    <span
      className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.bg, color: tone.color }}
    >
      {label}
    </span>
  );
}
