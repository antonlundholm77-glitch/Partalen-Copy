import { PROJECT_PHASES, phaseIndex } from "@/lib/lifecycle";
import type { ProjectPhase } from "@/lib/types";

// Visar projektets livscykel med aktuell fas markerad. Avklarade faser tonas,
// kommande är dämpade.
export default function LifecycleBar({ phase }: { phase: ProjectPhase }) {
  const current = phaseIndex(phase);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {PROJECT_PHASES.map((p, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <span key={p.key} className="flex items-center gap-1">
            <span
              className={`rounded px-2 py-1 text-[12px] ${
                active
                  ? "bg-accent font-medium text-white"
                  : done
                    ? "bg-accent-bg text-accent-text"
                    : "bg-secondary text-ink-3"
              }`}
            >
              {p.label}
            </span>
            {i < PROJECT_PHASES.length - 1 && (
              <span className="text-ink-3" aria-hidden="true">
                ›
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
