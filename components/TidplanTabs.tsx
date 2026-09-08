// Toggle mellan Timeline (vertikal lista) och Gantt (horisontella staplar)
// för tidplan-vyn. Klient-side state — ingen routing.

"use client";

import { useState } from "react";
import { List, BarChart3 } from "lucide-react";
import type { PmPhase } from "@/lib/db/deliverables";
import PhaseTimeline from "@/components/PhaseTimeline";
import PhaseGantt from "@/components/PhaseGantt";

type View = "timeline" | "gantt";

export default function TidplanTabs({
  phases,
  projectName,
  projectStart,
  defaultView = "gantt",
}: {
  phases: PmPhase[];
  projectName: string;
  projectStart?: string;
  defaultView?: View;
}) {
  const [view, setView] = useState<View>(defaultView);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex items-center gap-1 border-b border-border bg-surface px-6 py-2.5">
        <TabButton
          active={view === "gantt"}
          onClick={() => setView("gantt")}
          icon={BarChart3}
          label="Gantt"
        />
        <TabButton
          active={view === "timeline"}
          onClick={() => setView("timeline")}
          icon={List}
          label="Timeline"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "gantt" ? (
          <PhaseGantt
            phases={phases}
            projectName={projectName}
            projectStart={projectStart}
          />
        ) : (
          <PhaseTimeline phases={phases} projectName={projectName} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12.5px] font-medium transition ${
        active
          ? "bg-ink-1 text-white"
          : "text-ink-2 hover:bg-surface-1"
      }`}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}
