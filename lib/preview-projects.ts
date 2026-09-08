// Preview-data för Part-plattformen.
// Bolag (organisation) ▸ Projekt (enhet) ▸ Modul.
// Datan är minimal — den verkliga datan hämtas från Supabase.

import type { ProjectPhase, ProjectStatus } from "@/lib/types";

export type CustomerKind = "entreprenad";

export interface ModuleGroup {
  section: string;
  keys: string[];
}

export interface PreviewUnit {
  id: string;
  name: string;
  meta: string;
  hasData: boolean;
  program?: string;
  edition?: string | null;
  phase?: ProjectPhase;
  status?: ProjectStatus;
  portal?: { src: string; sections: Record<string, string> };
  moduleGroups?: ModuleGroup[];
}

export interface PreviewCustomer {
  id: string;
  name: string;
  kind: CustomerKind;
  unitNoun: string;
  unitNounPlural: string;
  units: PreviewUnit[];
}

export const PREVIEW_CUSTOMERS: PreviewCustomer[] = [
  {
    id: "part-group",
    name: "Part Group",
    kind: "entreprenad",
    unitNoun: "projekt",
    unitNounPlural: "Projekt",
    units: [
      {
        id: "partalen",
        name: "PARTALEN — Pontonen Mjölkudden",
        edition: null,
        meta: "Hotellprojekt Mjölkudden Luleå · Hus A/L/B/C",
        hasData: true,
        phase: "projektering",
        status: "pagaende",
        moduleGroups: [
          {
            section: "Projekt",
            keys: ["oversikt", "process", "leverabler", "teknik", "dokument"],
          },
        ],
      },
    ],
  },
];

export function getCustomer(id: string): PreviewCustomer | undefined {
  return PREVIEW_CUSTOMERS.find((c) => c.id === id);
}

export function getUnit(
  customerId: string,
  unitId: string,
): PreviewUnit | undefined {
  return getCustomer(customerId)?.units.find((u) => u.id === unitId);
}
