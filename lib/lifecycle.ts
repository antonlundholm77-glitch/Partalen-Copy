import type { ProjectPhase, ProjectStatus } from "@/lib/types";

// Projektets livscykel (endast entreprenad — inte kurser).
export const PROJECT_PHASES: { key: ProjectPhase; label: string }[] = [
  { key: "forstudie", label: "Idé" },
  { key: "projektering", label: "Projektering" },
  { key: "upphandling", label: "Upphandling" },
  { key: "anbud", label: "Anbud" },
  { key: "utforande", label: "Utförande" },
  { key: "overlamning", label: "Överlämnande" },
  { key: "forvaltning", label: "Förvaltning" },
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pagaende: "Pågår",
  vilande: "Vilande",
  arkiverat: "Arkiverat",
};

export function phaseLabel(p: ProjectPhase): string {
  return PROJECT_PHASES.find((x) => x.key === p)?.label ?? p;
}

export function phaseIndex(p: ProjectPhase): number {
  return PROJECT_PHASES.findIndex((x) => x.key === p);
}
