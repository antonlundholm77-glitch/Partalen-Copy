// Uppdrag per enhet (projekt/kurs) — det viktigaste: vad är VÅRT
// uppdrag i varje projekt. Visas i "Kunder & avtal".
//
// Redigerbart utkast: härlett ur appens data (faser, beställare, studieplaner).
// Operatör = ansvarig operatör. Justera fritt.

export interface ProjectAssignment {
  uppdrag: string; // kort uppdragstitel
  beskrivning: string; // vad vi gör
  operator: string; // ansvarig operatör
}

// Nyckel: "<org>/<enhet>".
export const ASSIGNMENTS: Record<string, ProjectAssignment> = {};

export function assignment(org: string, unitId: string): ProjectAssignment | undefined {
  return ASSIGNMENTS[`${org}/${unitId}`];
}
