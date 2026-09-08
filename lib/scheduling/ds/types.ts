// ScheduleDataSource — kontraktet för Tidplan-modulens datalager.
//
// Protokolldisciplin regel 6: cross-app-instansierbarhet. Den här fillen
// definierar vilka operationer modulen behöver av sin host. Den här appens
// implementation ligger i ./supabase.ts. En framtida annan app (Anbudsverktyg,
// kund-portal) implementerar samma interface mot sin egen backend.
//
// Inga importer av @/lib/supabase här. Inga importer av Next.js. Endast
// domäntyper från ../types.

import type {
  Schedule,
  ScheduleHeader,
  Task,
  Dependency,
  WorkingCalendar,
  Baseline,
} from "../types";

// ---------- Hämta-operationer ----------

export interface ScheduleListItem {
  id: string;
  name: string;
  kind: string;
  status: string;
  updatedAt: string;
}

// ---------- Skapa/uppdatera-operationer ----------

export interface CreateScheduleInput {
  projectId: string;
  name: string;
  kind?: ScheduleHeader["kind"];
  calendarRef: string;
  projectStartDate?: string;
}

export interface CreateTaskInput {
  scheduleId: string;
  uid: string;
  parentUid?: string;
  wbsCode?: string;
  name: string;
  type: Task["type"];
  durationDays?: number;
  constraintType?: Task["constraint"] extends infer C
    ? C extends { type: infer T } ? T : never
    : never;
  constraintDate?: string;
  responsible?: string;
  disciplineId?: string;
  deliverableId?: string;
  sortOrder?: number;
  notes?: string;
}

export interface CreateDependencyInput {
  scheduleId: string;
  predecessorUid: string;
  successorUid: string;
  type: Dependency["type"];
  lagDays?: number;
}

export interface UpdateTaskPatch {
  name?: string;
  wbsCode?: string;
  durationDays?: number;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  percentComplete?: number;
  constraintType?: Task["constraint"] extends infer C
    ? C extends { type: infer T } ? T : never
    : never;
  constraintDate?: string | null;  // null = töm
  responsible?: string;
  disciplineId?: string | null;
  deliverableId?: string | null;
  notes?: string;
  sortOrder?: number;
}

// ---------- CPM-cachning ----------

export interface CpmTaskUpdate {
  taskId: string;
  computedEarlyStart: string | null;
  computedEarlyFinish: string | null;
  computedLateStart: string | null;
  computedLateFinish: string | null;
  totalFloatDays: number | null;
  freeFloatDays: number | null;
  isCritical: boolean;
}

// ---------- Det fulla kontraktet ----------

export interface ScheduleDataSource {
  // --- Schedule-nivå ---
  listSchedules(projectId: string): Promise<ScheduleListItem[]>;
  loadSchedule(scheduleId: string): Promise<Schedule | null>;
  createSchedule(input: CreateScheduleInput): Promise<ScheduleHeader>;
  archiveSchedule(scheduleId: string): Promise<void>;

  // --- Task-nivå ---
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(taskId: string, patch: UpdateTaskPatch): Promise<Task>;
  removeTask(taskId: string): Promise<void>;
  bulkInsertTasks(scheduleId: string, tasks: CreateTaskInput[]): Promise<Task[]>;

  // --- Dependencies ---
  createDependency(input: CreateDependencyInput): Promise<Dependency>;
  removeDependency(dependencyId: string): Promise<void>;
  bulkInsertDependencies(scheduleId: string, deps: CreateDependencyInput[]): Promise<Dependency[]>;

  // --- Calendar (oftast read-only) ---
  loadCalendarByRef(ref: string, customerId?: string): Promise<WorkingCalendar | null>;
  listCalendars(customerId?: string): Promise<WorkingCalendar[]>;

  // --- Baselines ---
  saveBaseline(scheduleId: string, name: string): Promise<Baseline>;
  listBaselines(scheduleId: string): Promise<Baseline[]>;

  // --- CPM-cache ---
  applyCpmResults(scheduleId: string, updates: CpmTaskUpdate[]): Promise<void>;
}
