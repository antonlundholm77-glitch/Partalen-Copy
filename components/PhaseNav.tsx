import { getUnit } from "@/lib/data";
import { PROJECT_PHASES, phaseIndex, PROJECT_STATUS_LABELS } from "@/lib/lifecycle";
import { LEVEL_THEME } from "@/lib/levels";
import type { UnitKind } from "@/lib/modules";
import type { ProjectStatus } from "@/lib/types";

// Projektfasnavigator under breadcrumben: horisontell livscykel med aktuell fas
// markerad + statusbadge till höger. Endast projekt (entreprenad) — kurser har
// ingen livscykel. Lågmäld, projektpärm-känsla (ingen glossy dashboard).
const STATUS: Record<ProjectStatus, { dot: string; chip: string }> = {
  pagaende: { dot: "bg-success-text", chip: "bg-success-bg text-success-text" },
  vilande: { dot: "bg-warning-text", chip: "bg-warning-bg text-warning-text" },
  arkiverat: { dot: "bg-ink-3", chip: "bg-secondary text-ink-3" },
};

export default function PhaseNav({
  currentCustomerId,
  currentProjectId,
  kind = "entreprenad",
}: {
  currentCustomerId?: string;
  currentProjectId?: string;
  kind?: UnitKind;
}) {
  if (kind !== "entreprenad" || !currentCustomerId || !currentProjectId) return null;
  const unit = getUnit(currentCustomerId, currentProjectId);
  if (!unit?.phase) return null;

  const current = phaseIndex(unit.phase);
  const status = unit.status;

  return (
    <div className={`flex items-center justify-between gap-4 border-b border-border ${LEVEL_THEME.projekt.tint} px-4 py-2`}>
      <ol className="flex min-w-0 flex-wrap items-center gap-y-1 text-[12px]">
        {PROJECT_PHASES.map((p, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={p.key} className="flex items-center">
              {i > 0 && (
                <span aria-hidden className="px-1.5 text-border-strong">
                  —
                </span>
              )}
              <span
                className={
                  active
                    ? "rounded bg-accent-bg px-2 py-0.5 font-medium text-accent-text"
                    : done
                      ? "text-ink-2"
                      : "text-ink-3"
                }
              >
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>

      {status && (
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${STATUS[status].chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS[status].dot}`} />
          {PROJECT_STATUS_LABELS[status]}
        </span>
      )}
    </div>
  );
}
