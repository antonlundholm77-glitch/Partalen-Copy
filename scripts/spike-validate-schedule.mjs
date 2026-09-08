// Spike: validera ett tidplan-JSON-utdrag mot kanoniskt schema.
//
// Kör: node scripts/spike-validate-schedule.mjs <path-till-json>
//
// Spegel av lib/scheduling/schema.ts — eftersom tsx inte är installerat i
// repot kör vi en .mjs-kopia för spike-användning. När T1 byggs ersätter
// vi den här med tsx-import av den riktiga schema.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

// ============================================================
// Schema (kopia av lib/scheduling/schema.ts)
// ============================================================

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum måste vara ISO 8601 (YYYY-MM-DD)");
const isoDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "Tidstämpel måste vara ISO 8601 UTC");
const slug = z.string().regex(/^[a-z0-9-]+$/, "Slug får bara innehålla a-z, 0-9 och bindestreck");

const TaskType = z.enum(["summary", "task", "milestone"]);
const DependencyType = z.enum(["FS", "SS", "FF", "SF"]);
const ConstraintType = z.enum(["ASAP","ALAP","MSO","MFO","SNET","SNLT","FNET","FNLT"]);
const CalendarExceptionType = z.enum(["holiday","workday","partial"]);
const ScheduleKind = z.enum(["main","tender","what-if","baseline-only"]);

const CONSTRAINTS_REQUIRING_DATE = new Set(["MSO","MFO","SNET","SNLT","FNET","FNLT"]);

const Constraint = z.object({
  type: ConstraintType,
  date: isoDate.optional(),
}).superRefine((val, ctx) => {
  if (CONSTRAINTS_REQUIRING_DATE.has(val.type) && !val.date) {
    ctx.addIssue({ code: "custom", message: `Constraint ${val.type} kräver date-fält`, path: ["date"] });
  }
  if (!CONSTRAINTS_REQUIRING_DATE.has(val.type) && val.date) {
    ctx.addIssue({ code: "custom", message: `Constraint ${val.type} ska inte ha date-fält`, path: ["date"] });
  }
});

const CalendarException = z.object({
  date: isoDate,
  type: CalendarExceptionType,
  hours: z.number().nonnegative().optional(),
  label: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "partial" && val.hours === undefined) {
    ctx.addIssue({ code: "custom", message: "partial-undantag kräver hours-fält", path: ["hours"] });
  }
});

const Calendar = z.object({
  ref: z.string().min(1),
  name: z.string().min(1),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1),
  workingHoursPerDay: z.number().positive(),
  exceptions: z.array(CalendarException).default([]),
});

const Task = z.object({
  uid: z.string().min(1),
  wbsCode: z.string().optional(),
  name: z.string().min(1),
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
    ctx.addIssue({ code: "custom", message: "Milstolpar måste ha durationDays = 0", path: ["durationDays"] });
  }
  if (val.type === "summary" && val.durationDays !== undefined) {
    ctx.addIssue({ code: "custom", message: "Summary-tasks får inte ha durationDays", path: ["durationDays"] });
  }
  if (val.type === "task" && val.durationDays === undefined) {
    ctx.addIssue({ code: "custom", message: "Tasks måste ha durationDays satt", path: ["durationDays"] });
  }
  if (val.parentUid && val.parentUid === val.uid) {
    ctx.addIssue({ code: "custom", message: "Task kan inte vara sin egen parent", path: ["parentUid"] });
  }
});

const Dependency = z.object({
  predecessorUid: z.string().min(1),
  successorUid: z.string().min(1),
  type: DependencyType.default("FS"),
  lag: z.number().int().default(0),
}).superRefine((val, ctx) => {
  if (val.predecessorUid === val.successorUid) {
    ctx.addIssue({ code: "custom", message: "predecessorUid och successorUid får inte vara samma" });
  }
});

const Baseline = z.object({
  name: z.string().min(1),
  snapshotAt: isoDateTime,
});

const ScheduleData = z.object({
  schedule: z.object({
    name: z.string().min(1),
    kind: ScheduleKind,
    projectStartDate: isoDate,
    calendarRef: z.string().min(1),
    dataDate: isoDate.optional(),
  }),
  tasks: z.array(Task).min(1),
  dependencies: z.array(Dependency).default([]),
  calendars: z.array(Calendar).min(1),
  baselines: z.array(Baseline).default([]),
});

const ScheduleEnvelope = z.object({
  schemaVersion: z.literal(1),
  module: z.literal("schedule"),
  exportedAt: isoDateTime,
  context: z.object({
    customerSlug: slug,
    projectSlug: slug,
  }),
  data: ScheduleData,
});

// ============================================================
// Cross-field-validering
// ============================================================

function validateCrossFields(env) {
  const issues = [];
  const { tasks, dependencies, calendars, schedule } = env.data;

  const seenUids = new Set();
  for (const t of tasks) {
    if (seenUids.has(t.uid)) issues.push({ path: `tasks[${t.uid}]`, message: `Duplicerad task-uid: ${t.uid}` });
    seenUids.add(t.uid);
  }

  for (const t of tasks) {
    if (t.parentUid && !seenUids.has(t.parentUid)) {
      issues.push({ path: `tasks[${t.uid}].parentUid`, message: `parentUid ${t.parentUid} pekar på okänd task` });
    }
  }

  for (const t of tasks) {
    let cursor = t.parentUid;
    const visited = new Set([t.uid]);
    while (cursor) {
      if (visited.has(cursor)) {
        issues.push({ path: `tasks[${t.uid}].parentUid`, message: `Cyklisk parent-kedja involverar ${[...visited].join(" → ")} → ${cursor}` });
        break;
      }
      visited.add(cursor);
      cursor = tasks.find((x) => x.uid === cursor)?.parentUid;
    }
  }

  for (const d of dependencies) {
    if (!seenUids.has(d.predecessorUid)) issues.push({ path: `dependencies[${d.predecessorUid}→${d.successorUid}]`, message: `predecessorUid ${d.predecessorUid} pekar på okänd task` });
    if (!seenUids.has(d.successorUid)) issues.push({ path: `dependencies[${d.predecessorUid}→${d.successorUid}]`, message: `successorUid ${d.successorUid} pekar på okänd task` });
  }

  const graph = new Map();
  const inDegree = new Map();
  for (const t of tasks) { graph.set(t.uid, []); inDegree.set(t.uid, 0); }
  for (const d of dependencies) {
    if (seenUids.has(d.predecessorUid) && seenUids.has(d.successorUid)) {
      graph.get(d.predecessorUid).push(d.successorUid);
      inDegree.set(d.successorUid, (inDegree.get(d.successorUid) ?? 0) + 1);
    }
  }
  const queue = [];
  inDegree.forEach((deg, uid) => { if (deg === 0) queue.push(uid); });
  let visited = 0;
  while (queue.length) {
    const uid = queue.shift();
    visited += 1;
    for (const succ of graph.get(uid) ?? []) {
      const next = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }
  if (visited < tasks.length) {
    const stuck = [...inDegree].filter(([, d]) => d > 0).map(([uid]) => uid);
    issues.push({ path: "dependencies", message: `Cykel i beroendegrafen — fastnade på: ${stuck.join(", ")}` });
  }

  if (!calendars.some((c) => c.ref === schedule.calendarRef)) {
    issues.push({ path: "schedule.calendarRef", message: `calendarRef "${schedule.calendarRef}" matchar ingen kalender` });
  }

  const calRefs = new Set();
  for (const c of calendars) {
    if (calRefs.has(c.ref)) issues.push({ path: `calendars[${c.ref}]`, message: `Duplicerad kalender-ref: ${c.ref}` });
    calRefs.add(c.ref);
  }

  return issues;
}

// ============================================================
// Main
// ============================================================

const filePath = process.argv[2];
if (!filePath) {
  console.error("Användning: node scripts/spike-validate-schedule.mjs <path-till-json>");
  process.exit(1);
}

const raw = readFileSync(resolve(filePath), "utf8");
let input;
try {
  input = JSON.parse(raw);
} catch (e) {
  console.error("✗ JSON-parsning misslyckades:", e.message);
  process.exit(1);
}

console.log(`\n📋 Validerar ${filePath}\n`);

const parsed = ScheduleEnvelope.safeParse(input);
if (!parsed.success) {
  console.error("✗ Schema-fel (zod):");
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join(".") || "<root>"}: ${issue.message}`);
  }
  console.log(`\n⚠ Spike-resultat: SCHEMA FAILED — ${parsed.error.issues.length} fel`);
  process.exit(2);
}

console.log("✓ Schema OK (zod)");

const crossFieldIssues = validateCrossFields(parsed.data);
if (crossFieldIssues.length > 0) {
  console.error("\n✗ Cross-field-fel:");
  for (const issue of crossFieldIssues) {
    console.error(`  • ${issue.path}: ${issue.message}`);
  }
  console.log(`\n⚠ Spike-resultat: CROSS-FIELD FAILED — ${crossFieldIssues.length} fel`);
  process.exit(3);
}

console.log("✓ Cross-field-validering OK");

// Sammanfattning
const env = parsed.data;
const taskCount = env.data.tasks.length;
const summaryCount = env.data.tasks.filter((t) => t.type === "summary").length;
const taskOnlyCount = env.data.tasks.filter((t) => t.type === "task").length;
const milestoneCount = env.data.tasks.filter((t) => t.type === "milestone").length;
const depCount = env.data.dependencies.length;
const calCount = env.data.calendars.length;
const baselineCount = env.data.baselines.length;

console.log("\n────────────────────────────────────────");
console.log(`✓ Spike-resultat: VALIDERING OK`);
console.log("────────────────────────────────────────");
console.log(`  Kund/projekt: ${env.context.customerSlug} / ${env.context.projectSlug}`);
console.log(`  Schema-namn:  ${env.data.schedule.name}`);
console.log(`  Projektstart: ${env.data.schedule.projectStartDate}`);
console.log(`  Tasks:        ${taskCount} (${summaryCount} summary, ${taskOnlyCount} task, ${milestoneCount} milestone)`);
console.log(`  Beroenden:    ${depCount}`);
console.log(`  Kalendrar:    ${calCount}`);
console.log(`  Baselines:    ${baselineCount}`);
console.log();
