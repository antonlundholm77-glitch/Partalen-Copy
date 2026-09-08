// Tidplansvy: pm_phases som vertikal timeline med completion_date och
// key_activities per fas. Statisk vy — redigering sker via ProcessView.

import { Circle, CheckCircle2, Clock } from "lucide-react";
import type { PmPhase } from "@/lib/db/deliverables";

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function statusBadge(status: string): { label: string; cls: string; Icon: typeof Circle } {
  switch (status) {
    case "completed":
      return {
        label: "Avslutad",
        cls: "bg-green-50 text-green-700 border-green-200",
        Icon: CheckCircle2,
      };
    case "in-progress":
      return {
        label: "Pågående",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
        Icon: Clock,
      };
    default:
      return {
        label: "Kommande",
        cls: "bg-slate-50 text-slate-600 border-slate-200",
        Icon: Circle,
      };
  }
}

export default function PhaseTimeline({
  phases,
  projectName,
}: {
  phases: PmPhase[];
  projectName: string;
}) {
  const firstDate = phases.find((p) => p.completion_date)?.completion_date ?? null;
  const lastDate = [...phases].reverse().find((p) => p.completion_date)?.completion_date ?? null;

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="border-b border-border bg-surface px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
          Tidplan · Etappstruktur
        </p>
        <h1 className="mt-1 text-2xl font-medium text-ink-1">{projectName}</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-[13px]">
          <span className="text-ink-3">
            Etapper: <span className="font-medium text-ink-1">{phases.length}</span>
          </span>
          {firstDate && (
            <span className="text-ink-3">
              Första avslut: <span className="font-medium text-ink-1">{formatDate(firstDate)}</span>
            </span>
          )}
          {lastDate && (
            <span className="text-ink-3">
              Slutbesiktning: <span className="font-medium text-ink-1">{formatDate(lastDate)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <ol className="relative space-y-3">
          {/* Vertikal linje */}
          <div
            aria-hidden
            className="absolute left-[19px] top-2 bottom-2 w-px bg-border"
          />

          {phases.map((p) => {
            const { label, cls, Icon } = statusBadge(p.status);
            return (
              <li
                key={p.id}
                className="relative flex gap-4 rounded-lg border border-border bg-white p-4 shadow-sm"
              >
                <span
                  className="z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white"
                  aria-hidden
                >
                  <Icon size={18} strokeWidth={2} className="text-ink-2" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      Etapp {p.stage}
                    </span>
                    <h3 className="text-[15px] font-semibold text-ink-1">{p.name}</h3>
                    <span
                      className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
                    >
                      {label}
                    </span>
                  </div>

                  {p.description && (
                    <p className="mt-1.5 text-[13px] text-ink-2">{p.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[12px] text-ink-3">
                    <span>
                      Avslut:{" "}
                      <span className="font-medium text-ink-1">{formatDate(p.completion_date)}</span>
                    </span>
                    <span>
                      Framsteg: <span className="font-medium text-ink-1">{p.progress ?? 0}%</span>
                    </span>
                  </div>

                  {p.key_activities && p.key_activities.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[13px]">
                      {p.key_activities.map((act, idx) => (
                        <li key={idx} className="flex gap-2 text-ink-2">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
