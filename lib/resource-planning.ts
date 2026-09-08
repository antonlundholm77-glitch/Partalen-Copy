// Resursplanering (internt, plattformsadmin): data + typer för tidplanevyn
// Kund ▸ Uppdrag ▸ Resurs, med beläggning i timmar/vecka mot 40h kapacitet.
//
// Resurser och allokeringar backas av gf_resources + gf_resource_allocations
// (migration 0020). Page.tsx fetchar och passar till ResourcePlanner via props.
// Skrivvägen går via server actions i app/actions/resource-allocations.ts
// (upsert/delete onBlur). localStorage lagrar bara UI-state (lokalt tillagda
// resurser utan timmar än, samt vy-preferenser). SEED_ALLOCATIONS är behållen
// som dev-fallback för det fall DB inte är åtkomlig.

export const WEEKLY_CAPACITY = 40; // h/vecka per resurs (heltid)

// Tidsupplösningar för tidsaxeln.
export type Granularity = "week" | "month" | "quarter";

// Horisont (antal buckets) som visas per upplösning.
export const HORIZON: Record<Granularity, number> = {
  week: 26, // ~ ett halvår framåt
  month: 12,
  quarter: 6,
};

// Leveransteamet — resurserna som beläggs. role satt = extern/konsult.
// capacity = veckokapacitet i h/v (default WEEKLY_CAPACITY = heltid).
export interface PlanResource {
  id: string;
  name: string;
  role?: string;
  capacity?: number;
}

export const RESOURCE_ROSTER: PlanResource[] = [
  { id: "kent", name: "Kent Karlsson" },
  { id: "clas", name: "Clas Tosser" },
  { id: "camilla", name: "Camilla Sondermann" },
  { id: "anders", name: "Anders Strömberg" },
  { id: "annak", name: "Anna Karlsson", capacity: 32 },
  { id: "annaa", name: "Anna Alavaara", role: "Konsult", capacity: 24 },
];

// Veckokapacitet för en resurs (h/v), med heltid som fallback.
export function capacityOf(id: string): number {
  return RESOURCE_ROSTER.find((r) => r.id === id)?.capacity ?? WEEKLY_CAPACITY;
}

// Ett uppdrag = en enhet (projekt/kurs) under en kund. key = "<kund>/<enhet>".
export interface PlanUppdrag {
  key: string;
  unitId: string;
  name: string;
  meta?: string;
  phase?: string;
  program?: string;
}

export interface PlanCustomerGroup {
  id: string;
  name: string;
  kind: "entreprenad";
  uppdrag: PlanUppdrag[];
}

// Seedad beläggning, uttryckt som veckospann RELATIVT planeringsstarten
// (offset 0 = innevarande ISO-vecka), så demobilden alltid hamnar nära "nu"
// oavsett dagens datum. hours = timmar/vecka på uppdraget.
export interface SeedSpan {
  resourceId: string;
  unitKey: string;
  from: number; // inkl. veckooffset
  to: number; // inkl. veckooffset
  hours: number;
}

// Dev-fallback om DB är otillgänglig — tom så vyn startar utan beläggning.
// Riktiga allokeringar kommer från gf_resource_allocations i prod/dev-DB
// (migration 0020 + framtida server actions).
export const SEED_ALLOCATIONS: SeedSpan[] = [];

export function resourceById(id: string): PlanResource | undefined {
  return RESOURCE_ROSTER.find((r) => r.id === id);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
