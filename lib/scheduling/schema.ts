// Kanoniskt JSON-schema för Tidplan-modulen — används av:
//   1. Export (gf_schedules → JSON)
//   2. Import (JSON → gf_schedules, via valideringssteg + diff)
//   3. Operatörs-promptguide (LLM producerar JSON enligt detta)
//
// Schemat är medvetet plattformsneutralt — inga host-app-import.
// Cross-field-regler (cykler, uid-unikhet, refintegritet) ligger i
// validate-funktionen nedan, inte i zod-schemat självt.

import { z } from "zod";

// ---------- Primitiver ----------

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum måste vara ISO 8601 (YYYY-MM-DD)");

const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "Tidstämpel måste vara ISO 8601 UTC");

const slug = z.string().regex(/^[a-z0-9-]+$/, "Slug får bara innehålla a-z, 0-9 och bindestreck");

// ---------- Enums ----------

export const TaskType = z.enum(["summary", "task", "milestone"]);
export type TaskType = z.infer<typeof TaskType>;

export const DependencyType = z.enum(["FS", "SS", "FF", "SF"]);
export type DependencyType = z.infer<typeof DependencyType>;

export const ConstraintType = z.enum([
  "ASAP", "ALAP",
  "MSO", "MFO",
  "SNET", "SNLT",
  "FNET", "FNLT",
]);
export type ConstraintType = z.infer<typeof ConstraintType>;

const CONSTRAINTS_REQUIRING_DATE = new Set([
  "MSO", "MFO", "SNET", "SNLT", "FNET", "FNLT",
]);

export const CalendarExceptionType = z.enum(["holiday", "workday", "partial"]);

export const ScheduleKind = z.enum(["main", "tender", "what-if", "baseline-only"]);

// ---------- Constraint ----------

export const Constraint = z.object({
  type: ConstraintType,
  date: isoDate.optional(),
}).superRefine((val, ctx) => {
  if (CONSTRAINTS_REQUIRING_DATE.has(val.type) && !val.date) {
    ctx.addIssue({
      code: "custom",
      message: `Constraint ${val.type} kräver date-fält`,
      path: ["date"],
    });
  }
  if (!CONSTRAINTS_REQUIRING_DATE.has(val.type) && val.date) {
    ctx.addIssue({
      code: "custom",
      message: `Constraint ${val.type} ska inte ha date-fält`,
      path: ["date"],
    });
  }
});

// ---------- Calendar ----------

export const CalendarException = z.object({
  date: isoDate,
  type: CalendarExceptionType,
  hours: z.number().nonnegative().optional(),
  label: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "partial" && val.hours === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "partial-undantag kräver hours-fält",
      path: ["hours"],
    });
  }
});

export const Calendar = z.object({
  ref: z.string().min(1, "Kalenderns ref får inte vara tom"),
  name: z.string().min(1),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1),
  workingHoursPerDay: z.number().positive(),
  exceptions: z.array(CalendarException).default([]),
});

// ---------- Task ----------

export const Task = z.object({
  uid: z.string().min(1, "Task uid får inte vara tom"),
  wbsCode: z.string().optional(),
  name: z.string().min(1, "Task name får inte vara tom"),
  type: TaskType,
  parentUid: z.string().optional(),
  durationDays: z.number().int().nonnegative().optional(),
  constraint: Constraint.optional(),
  responsible: z.string().optional(),
  disciplineCode: z.string().optional(),
  deliverableCode: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "milestone" && val.durationDays !== 0) {
    ctx.addIssue({
      code: "custom",
      message: "Milstolpar måste ha durationDays = 0",
      path: ["durationDays"],
    });
  }
  if (val.type === "summary" && val.durationDays !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Summary-tasks får inte ha durationDays (beräknas från barn)",
      path: ["durationDays"],
    });
  }
  if (val.type === "task" && val.durationDays === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Tasks måste ha durationDays satt",
      path: ["durationDays"],
    });
  }
  if (val.parentUid && val.parentUid === val.uid) {
    ctx.addIssue({
      code: "custom",
      message: "Task kan inte vara sin egen parent",
      path: ["parentUid"],
    });
  }
});

// ---------- Dependency ----------

export const Dependency = z.object({
  predecessorUid: z.string().min(1),
  successorUid: z.string().min(1),
  type: DependencyType.default("FS"),
  lag: z.number().int().default(0),
}).superRefine((val, ctx) => {
  if (val.predecessorUid === val.successorUid) {
    ctx.addIssue({
      code: "custom",
      message: "predecessorUid och successorUid får inte vara samma",
    });
  }
});

// ---------- Baseline ----------

export const Baseline = z.object({
  name: z.string().min(1),
  snapshotAt: isoDateTime,
});

// ---------- Schedule envelope ----------

export const ScheduleData = z.object({
  schedule: z.object({
    name: z.string().min(1),
    kind: ScheduleKind,
    projectStartDate: isoDate,
    calendarRef: z.string().min(1),
    dataDate: isoDate.optional(),
  }),
  tasks: z.array(Task).min(1, "Schemat måste innehålla minst en task"),
  dependencies: z.array(Dependency).default([]),
  calendars: z.array(Calendar).min(1, "Minst en kalender krävs"),
  baselines: z.array(Baseline).default([]),
});

export const ScheduleEnvelope = z.object({
  schemaVersion: z.literal(1),
  module: z.literal("schedule"),
  exportedAt: isoDateTime,
  context: z.object({
    customerSlug: slug,
    projectSlug: slug,
  }),
  data: ScheduleData,
});

export type ScheduleEnvelope = z.infer<typeof ScheduleEnvelope>;

// ---------- Cross-field-validering ----------

export interface CrossFieldIssue {
  path: string;
  message: string;
}

export function validateCrossFields(env: ScheduleEnvelope): CrossFieldIssue[] {
  const issues: CrossFieldIssue[] = [];
  const { tasks, dependencies, calendars, schedule } = env.data;

  // 1. Unika task-uid
  const seenUids = new Set<string>();
  for (const t of tasks) {
    if (seenUids.has(t.uid)) {
      issues.push({ path: `tasks[${t.uid}]`, message: `Duplicerad task-uid: ${t.uid}` });
    }
    seenUids.add(t.uid);
  }

  // 2. parentUid pekar på existerande task
  for (const t of tasks) {
    if (t.parentUid && !seenUids.has(t.parentUid)) {
      issues.push({
        path: `tasks[${t.uid}].parentUid`,
        message: `parentUid ${t.parentUid} pekar på okänd task`,
      });
    }
  }

  // 3. Inga transitiva cykler i parent-kedjan
  for (const t of tasks) {
    let cursor: string | undefined = t.parentUid;
    const visited = new Set<string>([t.uid]);
    while (cursor) {
      if (visited.has(cursor)) {
        issues.push({
          path: `tasks[${t.uid}].parentUid`,
          message: `Cyklisk parent-kedja involverar ${[...visited].join(" → ")} → ${cursor}`,
        });
        break;
      }
      visited.add(cursor);
      cursor = tasks.find((x) => x.uid === cursor)?.parentUid;
    }
  }

  // 4. Beroenden refererar existerande tasks
  for (const d of dependencies) {
    if (!seenUids.has(d.predecessorUid)) {
      issues.push({
        path: `dependencies[${d.predecessorUid}→${d.successorUid}]`,
        message: `predecessorUid ${d.predecessorUid} pekar på okänd task`,
      });
    }
    if (!seenUids.has(d.successorUid)) {
      issues.push({
        path: `dependencies[${d.predecessorUid}→${d.successorUid}]`,
        message: `successorUid ${d.successorUid} pekar på okänd task`,
      });
    }
  }

  // 5. Inga cykler i dependency-grafen (topologisk sortering)
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const t of tasks) {
    graph.set(t.uid, []);
    inDegree.set(t.uid, 0);
  }
  for (const d of dependencies) {
    if (seenUids.has(d.predecessorUid) && seenUids.has(d.successorUid)) {
      graph.get(d.predecessorUid)!.push(d.successorUid);
      inDegree.set(d.successorUid, (inDegree.get(d.successorUid) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  inDegree.forEach((deg, uid) => { if (deg === 0) queue.push(uid); });
  let visited = 0;
  while (queue.length) {
    const uid = queue.shift()!;
    visited += 1;
    for (const succ of graph.get(uid) ?? []) {
      const next = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }
  if (visited < tasks.length) {
    const stuck = [...inDegree].filter(([, d]) => d > 0).map(([uid]) => uid);
    issues.push({
      path: "dependencies",
      message: `Cykel i beroendegrafen — fastnade på: ${stuck.join(", ")}`,
    });
  }

  // 6. schedule.calendarRef matchar en kalender
  if (!calendars.some((c) => c.ref === schedule.calendarRef)) {
    issues.push({
      path: "schedule.calendarRef",
      message: `calendarRef "${schedule.calendarRef}" matchar ingen kalender i data.calendars`,
    });
  }

  // 7. Inga duplicerade kalender-refs
  const calRefs = new Set<string>();
  for (const c of calendars) {
    if (calRefs.has(c.ref)) {
      issues.push({ path: `calendars[${c.ref}]`, message: `Duplicerad kalender-ref: ${c.ref}` });
    }
    calRefs.add(c.ref);
  }

  return issues;
}

// ---------- Publik API ----------

export interface ValidationResult {
  ok: boolean;
  schemaIssues: { path: string; message: string }[];
  crossFieldIssues: CrossFieldIssue[];
  parsed: ScheduleEnvelope | null;
}

export function validateScheduleJson(input: unknown): ValidationResult {
  const parsed = ScheduleEnvelope.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      schemaIssues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      crossFieldIssues: [],
      parsed: null,
    };
  }
  const crossFieldIssues = validateCrossFields(parsed.data);
  return {
    ok: crossFieldIssues.length === 0,
    schemaIssues: [],
    crossFieldIssues,
    parsed: parsed.data,
  };
}
