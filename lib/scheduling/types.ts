// Domäntyper för Tidplan-modulen.
//
// Protokolldisciplin regel 1: dessa typer är källan. Schema.ts härleder från
// dem via z.infer; ds-lagret implementerar mot dem; cpm/calendar arbetar mot
// dem. Inga host-app-/Supabase-specifika importer här.
//
// Naming: camelCase i typerna (matchar JSON-schemat), snake_case i DB-lagret
// (matchar gf_*-tabellerna). Konverteringen sker i ds/supabase.ts.

// ---------- Enums (samma som schema.ts) ----------

export type TaskType = "summary" | "task" | "milestone";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export type ConstraintType =
  | "ASAP" | "ALAP"
  | "MSO" | "MFO"
  | "SNET" | "SNLT"
  | "FNET" | "FNLT";

export type ScheduleKind = "main" | "tender" | "what-if" | "baseline-only";

export type ScheduleStatus = "draft" | "active" | "archived";

export type CalendarExceptionType = "holiday" | "workday" | "partial";

// ---------- Constraint ----------

export interface Constraint {
  type: ConstraintType;
  date?: string;  // ISO YYYY-MM-DD, krävs för MSO/MFO/SNET/SNLT/FNET/FNLT
}

// ---------- Calendar ----------

export interface CalendarException {
  date: string;
  type: CalendarExceptionType;
  hours?: number;
  label?: string;
}

export interface WorkingCalendar {
  id?: string;          // uuid i DB
  ref: string;          // mänskligt läsbar ("se-standard")
  customerId?: string;  // null = system-global
  name: string;
  description?: string;
  workingDays: number[];          // ISO weekday, 1=mån
  workingHoursPerDay: number;
  exceptions: CalendarException[];
}

// ---------- Task ----------

export interface Task {
  id?: string;
  uid: string;                    // i JSON-formatet: stabil identifierare för round-trip
  externalUid?: string;           // alias vid round-trip mot MSP — samma som uid
  parentUid?: string;             // pekar på Task.uid, inte id
  wbsCode?: string;
  name: string;
  type: TaskType;
  // planerat
  plannedStart?: string;
  plannedEnd?: string;
  durationDays?: number;
  // baseline (frusen)
  baselineStart?: string;
  baselineEnd?: string;
  // faktisk
  actualStart?: string;
  actualEnd?: string;
  percentComplete: number;
  // constraint
  constraint?: Constraint;
  // CPM-cache
  computedEarlyStart?: string;
  computedEarlyFinish?: string;
  computedLateStart?: string;
  computedLateFinish?: string;
  totalFloatDays?: number;
  freeFloatDays?: number;
  isCritical: boolean;
  // meta
  sortOrder: number;
  disciplineId?: string;
  disciplineCode?: string;        // alternativ till disciplineId vid JSON-import
  deliverableCode?: string;       // resolveras till deliverable_id i ds-lagret
  responsible?: string;
  notes?: string;
}

// ---------- Dependency ----------

export interface Dependency {
  id?: string;
  predecessorUid: string;         // pekar på Task.uid
  successorUid: string;
  type: DependencyType;
  lagDays: number;                // kan vara negativ
}

// ---------- Schedule ----------

export interface ScheduleHeader {
  id?: string;
  projectId: string;
  name: string;
  kind: ScheduleKind;
  status: ScheduleStatus;
  calendarRef: string;            // refererar WorkingCalendar.ref
  projectStartDate?: string;
  dataDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Baseline {
  id?: string;
  name: string;
  snapshotAt: string;
  snapshotData?: unknown;         // jsonb i DB; ds-lagret hanterar serialisering
}

// ---------- Komplett tidplan (för in-memory-arbete) ----------

export interface Schedule {
  header: ScheduleHeader;
  tasks: Task[];
  dependencies: Dependency[];
  calendar: WorkingCalendar;
  baselines: Baseline[];
}

// ---------- Hjälpare ----------

export const CONSTRAINTS_REQUIRING_DATE: ReadonlySet<ConstraintType> = new Set([
  "MSO", "MFO", "SNET", "SNLT", "FNET", "FNLT",
]);

export function constraintNeedsDate(type: ConstraintType): boolean {
  return CONSTRAINTS_REQUIRING_DATE.has(type);
}
