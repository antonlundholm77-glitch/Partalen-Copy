// Bygger upp och ner mellan in-memory Schedule och kanoniskt JSON-paket
// (ScheduleEnvelope). Används av export/import-routarna i tidplan-v2.
//
// Protokolldisciplin: ingen host-app-/Supabase-import — bara domäntyper.

import type { Schedule, Task, Dependency, WorkingCalendar } from "./types";

export interface ExportContext {
  customerSlug: string;
  projectSlug: string;
}

/** Konverterar in-memory Schedule → kanoniskt ScheduleEnvelope-paket. */
export function scheduleToEnvelope(
  schedule: Schedule,
  ctx: ExportContext,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    module: "schedule",
    exportedAt: new Date().toISOString().replace(/\.\d+Z$/, ".000Z"),
    context: { customerSlug: ctx.customerSlug, projectSlug: ctx.projectSlug },
    data: {
      schedule: {
        name: schedule.header.name,
        kind: schedule.header.kind,
        projectStartDate:
          schedule.header.projectStartDate ?? earliestStart(schedule.tasks),
        calendarRef: schedule.calendar.ref,
        ...(schedule.header.dataDate ? { dataDate: schedule.header.dataDate } : {}),
      },
      tasks: schedule.tasks.map(taskToEnvelope),
      dependencies: schedule.dependencies.map(depToEnvelope),
      calendars: [calendarToEnvelope(schedule.calendar)],
      baselines: schedule.baselines.map((b) => ({
        name: b.name,
        snapshotAt: b.snapshotAt,
      })),
    },
  };
}

function earliestStart(tasks: Task[]): string {
  const dates = tasks
    .map((t) => t.plannedStart)
    .filter((v): v is string => Boolean(v))
    .sort();
  return dates[0] ?? new Date().toISOString().slice(0, 10);
}

function taskToEnvelope(t: Task): Record<string, unknown> {
  const out: Record<string, unknown> = {
    uid: t.uid,
    name: t.name,
    type: t.type,
  };
  if (t.wbsCode) out.wbsCode = t.wbsCode;
  if (t.parentUid) out.parentUid = t.parentUid;
  if (t.type === "task" || t.type === "milestone") {
    out.durationDays = t.durationDays ?? (t.type === "milestone" ? 0 : 1);
  }
  if (t.constraint) {
    const c: Record<string, unknown> = { type: t.constraint.type };
    if (t.constraint.date) c.date = t.constraint.date;
    out.constraint = c;
  }
  if (t.responsible) out.responsible = t.responsible;
  if (t.disciplineCode) out.disciplineCode = t.disciplineCode;
  if (t.deliverableCode) out.deliverableCode = t.deliverableCode;
  if (t.notes) out.notes = t.notes;
  return out;
}

function depToEnvelope(d: Dependency): Record<string, unknown> {
  return {
    predecessorUid: d.predecessorUid,
    successorUid: d.successorUid,
    type: d.type,
    lag: d.lagDays,
  };
}

function calendarToEnvelope(c: WorkingCalendar): Record<string, unknown> {
  return {
    ref: c.ref,
    name: c.name,
    workingDays: c.workingDays,
    workingHoursPerDay: c.workingHoursPerDay,
    exceptions: c.exceptions.map((e) => ({
      date: e.date,
      type: e.type,
      ...(e.hours !== undefined ? { hours: e.hours } : {}),
      ...(e.label ? { label: e.label } : {}),
    })),
  };
}
