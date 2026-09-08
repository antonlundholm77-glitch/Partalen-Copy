// Den här appens implementation av ScheduleDataSource — den enda fil i
// lib/scheduling/ som får importera @/lib/supabase. Andra hosts implementerar
// samma interface mot sin egen backend. (Protokolldisciplin regel 6.)
//
// Konvention: alla rad-objekt mappas mellan snake_case (DB) och camelCase
// (domäntyper) i denna fil. Övriga lager arbetar bara mot camelCase-typerna.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Protokoll-avvikelse (regel 7): Database-typen i @/lib/types är manuellt
// curated och täcker inte alla nya tabeller med rätt Insert/Update-shape.
// Vi castar runt detta tills `supabase gen types typescript --linked` körs
// och Database-typen autogenereras. RLS skyddar runtime; zod-validerar input.
// Borttagen vid första auto-typgenerering.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

import type {
  Schedule,
  ScheduleHeader,
  Task,
  Dependency,
  WorkingCalendar,
  CalendarException,
  Baseline,
  TaskType,
  DependencyType,
  ConstraintType,
  ScheduleKind,
  ScheduleStatus,
} from "../types";
import type {
  ScheduleDataSource,
  ScheduleListItem,
  CreateScheduleInput,
  CreateTaskInput,
  CreateDependencyInput,
  UpdateTaskPatch,
  CpmTaskUpdate,
} from "./types";

// =============================================================================
// Row-typer (rådata från Supabase, snake_case)
// =============================================================================

interface ScheduleRow {
  id: string;
  project_id: string;
  name: string;
  kind: ScheduleKind;
  status: ScheduleStatus;
  calendar_id: string | null;
  project_start_date: string | null;
  data_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface TaskRow {
  id: string;
  schedule_id: string;
  parent_id: string | null;
  external_uid: string | null;
  wbs_code: string | null;
  name: string;
  type: TaskType;
  planned_start: string | null;
  planned_end: string | null;
  planned_duration_days: number | null;
  baseline_start: string | null;
  baseline_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  percent_complete: number;
  constraint_type: ConstraintType;
  constraint_date: string | null;
  computed_early_start: string | null;
  computed_early_finish: string | null;
  computed_late_start: string | null;
  computed_late_finish: string | null;
  total_float_days: number | null;
  free_float_days: number | null;
  is_critical: boolean;
  sort_order: number;
  discipline_id: string | null;
  deliverable_id: string | null;
  responsible: string | null;
  notes: string | null;
}

interface DependencyRow {
  id: string;
  schedule_id: string;
  predecessor_id: string;
  successor_id: string;
  type: DependencyType;
  lag_days: number;
}

interface CalendarRow {
  id: string;
  customer_id: string | null;
  ref: string;
  name: string;
  description: string | null;
  working_days: number[];
  working_hours_per_day: number;
}

interface CalendarExceptionRow {
  id: string;
  calendar_id: string;
  date: string;
  type: "holiday" | "workday" | "partial";
  hours: number | null;
  label: string | null;
}

interface BaselineRow {
  id: string;
  schedule_id: string;
  name: string;
  snapshot_at: string;
  snapshot_data: unknown;
  created_by: string | null;
}

// =============================================================================
// Mappers (snake_case → camelCase)
// =============================================================================

function mapScheduleHeader(row: ScheduleRow, calendarRef: string): ScheduleHeader {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    calendarRef,
    projectStartDate: row.project_start_date ?? undefined,
    dataDate: row.data_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
  };
}

function mapTask(row: TaskRow, parentUidByDbId: Map<string, string>): Task {
  const uid = row.external_uid ?? row.id;
  const constraint =
    row.constraint_type === "ASAP" || row.constraint_type === "ALAP"
      ? row.constraint_type
        ? { type: row.constraint_type }
        : undefined
      : { type: row.constraint_type, date: row.constraint_date ?? undefined };

  return {
    id: row.id,
    uid,
    externalUid: row.external_uid ?? undefined,
    parentUid: row.parent_id ? parentUidByDbId.get(row.parent_id) : undefined,
    wbsCode: row.wbs_code ?? undefined,
    name: row.name,
    type: row.type,
    plannedStart: row.planned_start ?? undefined,
    plannedEnd: row.planned_end ?? undefined,
    durationDays: row.planned_duration_days ?? undefined,
    baselineStart: row.baseline_start ?? undefined,
    baselineEnd: row.baseline_end ?? undefined,
    actualStart: row.actual_start ?? undefined,
    actualEnd: row.actual_end ?? undefined,
    percentComplete: row.percent_complete,
    constraint,
    computedEarlyStart: row.computed_early_start ?? undefined,
    computedEarlyFinish: row.computed_early_finish ?? undefined,
    computedLateStart: row.computed_late_start ?? undefined,
    computedLateFinish: row.computed_late_finish ?? undefined,
    totalFloatDays: row.total_float_days ?? undefined,
    freeFloatDays: row.free_float_days ?? undefined,
    isCritical: row.is_critical,
    sortOrder: row.sort_order,
    disciplineId: row.discipline_id ?? undefined,
    responsible: row.responsible ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapDependency(row: DependencyRow, uidByDbId: Map<string, string>): Dependency {
  return {
    id: row.id,
    predecessorUid: uidByDbId.get(row.predecessor_id) ?? row.predecessor_id,
    successorUid: uidByDbId.get(row.successor_id) ?? row.successor_id,
    type: row.type,
    lagDays: row.lag_days,
  };
}

function mapCalendar(row: CalendarRow, exceptions: CalendarException[]): WorkingCalendar {
  return {
    id: row.id,
    ref: row.ref,
    customerId: row.customer_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    workingDays: row.working_days,
    workingHoursPerDay: Number(row.working_hours_per_day),
    exceptions,
  };
}

function mapBaseline(row: BaselineRow): Baseline {
  return {
    id: row.id,
    name: row.name,
    snapshotAt: row.snapshot_at,
    snapshotData: row.snapshot_data,
  };
}

// =============================================================================
// Implementation
// =============================================================================

class SupabaseScheduleDataSource implements ScheduleDataSource {
  // -------- listSchedules --------
  async listSchedules(projectId: string): Promise<ScheduleListItem[]> {
    const supabase = (await createClient()) as AnySupabase;
    const { data, error } = await supabase
      .from("gf_schedules")
      .select("id, name, kind, status, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`listSchedules: ${error.message}`);
    return ((data ?? []) as Array<{ id: string; name: string; kind: string; status: string; updated_at: string }>).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      status: r.status,
      updatedAt: r.updated_at,
    }));
  }

  // -------- loadSchedule --------
  async loadSchedule(scheduleId: string): Promise<Schedule | null> {
    const supabase = (await createClient()) as AnySupabase;

    const { data: schedRow, error: schedErr } = await supabase
      .from("gf_schedules")
      .select("*")
      .eq("id", scheduleId)
      .maybeSingle();
    if (schedErr) throw new Error(`loadSchedule: ${schedErr.message}`);
    if (!schedRow) return null;
    const schedule = schedRow as ScheduleRow;

    // Tasks + deps + calendar parallellt
    const [tasksRes, depsRes, calRes, baseRes] = await Promise.all([
      supabase
        .from("gf_tasks")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("sort_order"),
      supabase
        .from("gf_task_dependencies")
        .select("*")
        .eq("schedule_id", scheduleId),
      schedule.calendar_id
        ? loadCalendarById(supabase, schedule.calendar_id)
        : Promise.resolve(null),
      supabase
        .from("gf_schedule_baselines")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("snapshot_at", { ascending: false }),
    ]);
    if (tasksRes.error) throw new Error(`loadSchedule.tasks: ${tasksRes.error.message}`);
    if (depsRes.error) throw new Error(`loadSchedule.deps: ${depsRes.error.message}`);
    if (baseRes.error) throw new Error(`loadSchedule.baselines: ${baseRes.error.message}`);

    const taskRows = (tasksRes.data ?? []) as TaskRow[];
    const depRows = (depsRes.data ?? []) as DependencyRow[];
    const baseRows = (baseRes.data ?? []) as BaselineRow[];

    // Bygg uid-mapping (db_id → uid) för dep-mapping och parent-mapping
    const uidByDbId = new Map<string, string>();
    for (const t of taskRows) {
      uidByDbId.set(t.id, t.external_uid ?? t.id);
    }

    const tasks = taskRows.map((t) => mapTask(t, uidByDbId));
    const dependencies = depRows.map((d) => mapDependency(d, uidByDbId));

    const calendar: WorkingCalendar = calRes ?? {
      ref: "se-standard",
      name: "Svensk standard (fallback)",
      workingDays: [1, 2, 3, 4, 5],
      workingHoursPerDay: 8,
      exceptions: [],
    };

    return {
      header: mapScheduleHeader(schedule, calendar.ref),
      tasks,
      dependencies,
      calendar,
      baselines: baseRows.map(mapBaseline),
    };
  }

  // -------- createSchedule --------
  async createSchedule(input: CreateScheduleInput): Promise<ScheduleHeader> {
    const supabase = (await createClient()) as AnySupabase;

    // Slå upp calendar_id via ref. Söker först kundens kalendrar (om projektet
    // har en org), faller tillbaka till system-globala (customer_id IS NULL).
    const calendar_id = await resolveCalendarId(supabase, input.calendarRef, input.projectId);

    const { data, error } = await supabase
      .from("gf_schedules")
      .insert({
        project_id: input.projectId,
        name: input.name,
        kind: input.kind ?? "main",
        status: "draft",
        calendar_id,
        project_start_date: input.projectStartDate ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(`createSchedule: ${error.message}`);

    return mapScheduleHeader(data as ScheduleRow, input.calendarRef);
  }

  // -------- archiveSchedule --------
  async archiveSchedule(scheduleId: string): Promise<void> {
    const supabase = (await createClient()) as AnySupabase;
    const { error } = await supabase
      .from("gf_schedules")
      .update({ status: "archived" })
      .eq("id", scheduleId);
    if (error) throw new Error(`archiveSchedule: ${error.message}`);
  }

  // -------- createTask --------
  async createTask(input: CreateTaskInput): Promise<Task> {
    const supabase = (await createClient()) as AnySupabase;

    // Lösa parent_id om parentUid är satt
    const parent_id = input.parentUid
      ? await resolveTaskIdByUid(supabase, input.scheduleId, input.parentUid)
      : null;

    const { data, error } = await supabase
      .from("gf_tasks")
      .insert({
        schedule_id: input.scheduleId,
        parent_id,
        external_uid: input.uid,
        wbs_code: input.wbsCode ?? null,
        name: input.name,
        type: input.type,
        planned_duration_days: input.durationDays ?? null,
        constraint_type: input.constraintType ?? "ASAP",
        constraint_date: input.constraintDate ?? null,
        responsible: input.responsible ?? null,
        discipline_id: input.disciplineId ?? null,
        deliverable_id: input.deliverableId ?? null,
        sort_order: input.sortOrder ?? 0,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(`createTask: ${error.message}`);

    const row = data as TaskRow;
    return mapTask(row, new Map([[row.id, row.external_uid ?? row.id]]));
  }

  // -------- bulkInsertTasks --------
  // Tar listan i tre pass: först alla rot-tasks, sedan progressivt djupare
  // nivåer så parent_id kan resolveras. Effektivt nog för demonstration.
  async bulkInsertTasks(scheduleId: string, tasks: CreateTaskInput[]): Promise<Task[]> {
    const inserted: Task[] = [];
    const remaining = [...tasks];
    const knownUids = new Set<string>();

    // Pass 1: rot-tasks (utan parentUid)
    const roots = remaining.filter((t) => !t.parentUid);
    for (const t of roots) {
      inserted.push(await this.createTask({ ...t, scheduleId }));
      knownUids.add(t.uid);
    }

    // Pass 2+: barn där parentUid finns inserted
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        const t = remaining[i];
        if (!t.parentUid) continue;            // redan rot
        if (knownUids.has(t.uid)) continue;    // redan inserted
        if (!knownUids.has(t.parentUid)) continue; // vänta tills parent finns
        inserted.push(await this.createTask({ ...t, scheduleId }));
        knownUids.add(t.uid);
        changed = true;
      }
    }

    // Kvarvarande (om parentUid pekar på ej-existerande task) blir tysta
    return inserted;
  }

  // -------- updateTask --------
  async updateTask(taskId: string, patch: UpdateTaskPatch): Promise<Task> {
    const supabase = (await createClient()) as AnySupabase;
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.wbsCode !== undefined) update.wbs_code = patch.wbsCode;
    if (patch.durationDays !== undefined) update.planned_duration_days = patch.durationDays;
    if (patch.plannedStart !== undefined) update.planned_start = patch.plannedStart;
    if (patch.plannedEnd !== undefined) update.planned_end = patch.plannedEnd;
    if (patch.actualStart !== undefined) update.actual_start = patch.actualStart;
    if (patch.actualEnd !== undefined) update.actual_end = patch.actualEnd;
    if (patch.percentComplete !== undefined) update.percent_complete = patch.percentComplete;
    if (patch.constraintType !== undefined) update.constraint_type = patch.constraintType;
    if (patch.constraintDate !== undefined) update.constraint_date = patch.constraintDate;
    if (patch.responsible !== undefined) update.responsible = patch.responsible;
    if (patch.disciplineId !== undefined) update.discipline_id = patch.disciplineId;
    if (patch.deliverableId !== undefined) update.deliverable_id = patch.deliverableId;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

    const { data, error } = await supabase
      .from("gf_tasks")
      .update(update)
      .eq("id", taskId)
      .select("*")
      .single();
    if (error) throw new Error(`updateTask: ${error.message}`);
    const row = data as TaskRow;
    return mapTask(row, new Map([[row.id, row.external_uid ?? row.id]]));
  }

  // -------- removeTask --------
  async removeTask(taskId: string): Promise<void> {
    const supabase = (await createClient()) as AnySupabase;
    const { error } = await supabase.from("gf_tasks").delete().eq("id", taskId);
    if (error) throw new Error(`removeTask: ${error.message}`);
  }

  // -------- createDependency --------
  async createDependency(input: CreateDependencyInput): Promise<Dependency> {
    const supabase = (await createClient()) as AnySupabase;
    const [predId, succId] = await Promise.all([
      resolveTaskIdByUid(supabase, input.scheduleId, input.predecessorUid),
      resolveTaskIdByUid(supabase, input.scheduleId, input.successorUid),
    ]);
    if (!predId) throw new Error(`predecessorUid ${input.predecessorUid} hittades inte`);
    if (!succId) throw new Error(`successorUid ${input.successorUid} hittades inte`);

    const { data, error } = await supabase
      .from("gf_task_dependencies")
      .insert({
        schedule_id: input.scheduleId,
        predecessor_id: predId,
        successor_id: succId,
        type: input.type,
        lag_days: input.lagDays ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(`createDependency: ${error.message}`);
    return {
      id: (data as DependencyRow).id,
      predecessorUid: input.predecessorUid,
      successorUid: input.successorUid,
      type: input.type,
      lagDays: input.lagDays ?? 0,
    };
  }

  // -------- removeDependency --------
  async removeDependency(dependencyId: string): Promise<void> {
    const supabase = (await createClient()) as AnySupabase;
    const { error } = await supabase
      .from("gf_task_dependencies")
      .delete()
      .eq("id", dependencyId);
    if (error) throw new Error(`removeDependency: ${error.message}`);
  }

  // -------- bulkInsertDependencies --------
  async bulkInsertDependencies(
    scheduleId: string,
    deps: CreateDependencyInput[],
  ): Promise<Dependency[]> {
    const out: Dependency[] = [];
    for (const d of deps) {
      out.push(await this.createDependency({ ...d, scheduleId }));
    }
    return out;
  }

  // -------- loadCalendarByRef --------
  async loadCalendarByRef(
    ref: string,
    customerId?: string,
  ): Promise<WorkingCalendar | null> {
    const supabase = (await createClient()) as AnySupabase;
    // Sök först customer-specifik, faller tillbaka till system-global (NULL)
    if (customerId) {
      const own = await loadCalendarByRefFor(supabase, ref, customerId);
      if (own) return own;
    }
    return loadCalendarByRefFor(supabase, ref, null);
  }

  // -------- listCalendars --------
  async listCalendars(customerId?: string): Promise<WorkingCalendar[]> {
    const supabase = (await createClient()) as AnySupabase;
    const query = supabase.from("gf_calendars").select("*");
    const { data, error } = await (customerId
      ? query.in("customer_id", [customerId, null as unknown as string])
      : query.is("customer_id", null));
    if (error) throw new Error(`listCalendars: ${error.message}`);
    const cals = (data ?? []) as CalendarRow[];

    // Hämta alla exceptions för dessa kalendrar
    const ids = cals.map((c) => c.id);
    if (ids.length === 0) return [];
    const { data: excData, error: excErr } = await supabase
      .from("gf_calendar_exceptions")
      .select("*")
      .in("calendar_id", ids);
    if (excErr) throw new Error(`listCalendars.exceptions: ${excErr.message}`);
    const excByCal = new Map<string, CalendarException[]>();
    for (const exc of (excData ?? []) as CalendarExceptionRow[]) {
      const list = excByCal.get(exc.calendar_id) ?? [];
      list.push({
        date: exc.date,
        type: exc.type,
        hours: exc.hours ?? undefined,
        label: exc.label ?? undefined,
      });
      excByCal.set(exc.calendar_id, list);
    }

    return cals.map((c) => mapCalendar(c, excByCal.get(c.id) ?? []));
  }

  // -------- saveBaseline --------
  async saveBaseline(scheduleId: string, name: string): Promise<Baseline> {
    const supabase = (await createClient()) as AnySupabase;
    const schedule = await this.loadSchedule(scheduleId);
    if (!schedule) throw new Error(`saveBaseline: schedule ${scheduleId} hittades inte`);
    const snapshot = { tasks: schedule.tasks, dependencies: schedule.dependencies };
    const { data, error } = await supabase
      .from("gf_schedule_baselines")
      .insert({
        schedule_id: scheduleId,
        name,
        snapshot_data: snapshot,
      })
      .select("*")
      .single();
    if (error) throw new Error(`saveBaseline: ${error.message}`);
    return mapBaseline(data as BaselineRow);
  }

  // -------- listBaselines --------
  async listBaselines(scheduleId: string): Promise<Baseline[]> {
    const supabase = (await createClient()) as AnySupabase;
    const { data, error } = await supabase
      .from("gf_schedule_baselines")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("snapshot_at", { ascending: false });
    if (error) throw new Error(`listBaselines: ${error.message}`);
    return ((data ?? []) as BaselineRow[]).map(mapBaseline);
  }

  // -------- applyCpmResults --------
  async applyCpmResults(scheduleId: string, updates: CpmTaskUpdate[]): Promise<void> {
    const supabase = (await createClient()) as AnySupabase;
    // För enkelhet: en update per task. För prod-skala bör vi göra en
    // batch-update via en SQL-funktion. Markerat som TODO i T1.
    for (const u of updates) {
      const { error } = await supabase
        .from("gf_tasks")
        .update({
          computed_early_start: u.computedEarlyStart,
          computed_early_finish: u.computedEarlyFinish,
          computed_late_start: u.computedLateStart,
          computed_late_finish: u.computedLateFinish,
          total_float_days: u.totalFloatDays,
          free_float_days: u.freeFloatDays,
          is_critical: u.isCritical,
        })
        .eq("id", u.taskId);
      if (error) throw new Error(`applyCpmResults: ${error.message}`);
    }
    void scheduleId;
  }
}

// =============================================================================
// Hjälpare
// =============================================================================

async function resolveCalendarId(
  supabase: AnySupabase,
  ref: string,
  projectId: string,
): Promise<string | null> {
  // Hämta org_id för projektet
  const { data: proj } = await supabase
    .from("gf_projects")
    .select("org_id")
    .eq("id", projectId)
    .maybeSingle();
  const orgId = (proj as { org_id: string } | null)?.org_id;

  if (orgId) {
    const own = await loadCalendarByRefFor(supabase, ref, orgId);
    if (own) return own.id ?? null;
  }
  const sys = await loadCalendarByRefFor(supabase, ref, null);
  return sys?.id ?? null;
}

async function loadCalendarByRefFor(
  supabase: AnySupabase,
  ref: string,
  customerId: string | null,
): Promise<WorkingCalendar | null> {
  const q = supabase.from("gf_calendars").select("*").eq("ref", ref);
  const { data, error } = await (customerId
    ? q.eq("customer_id", customerId)
    : q.is("customer_id", null));
  if (error) throw new Error(`loadCalendarByRefFor: ${error.message}`);
  const cals = (data ?? []) as CalendarRow[];
  if (cals.length === 0) return null;
  const cal = cals[0];

  const { data: excData, error: excErr } = await supabase
    .from("gf_calendar_exceptions")
    .select("*")
    .eq("calendar_id", cal.id);
  if (excErr) throw new Error(`loadCalendarByRefFor.exceptions: ${excErr.message}`);

  const exceptions: CalendarException[] = ((excData ?? []) as CalendarExceptionRow[]).map((row) => {
    return {
      date: row.date,
      type: row.type,
      hours: row.hours ?? undefined,
      label: row.label ?? undefined,
    };
  });

  return mapCalendar(cal, exceptions);
}

async function loadCalendarById(
  supabase: AnySupabase,
  calendarId: string,
): Promise<WorkingCalendar | null> {
  const [{ data: cal }, { data: excData }] = await Promise.all([
    supabase.from("gf_calendars").select("*").eq("id", calendarId).maybeSingle(),
    supabase.from("gf_calendar_exceptions").select("*").eq("calendar_id", calendarId),
  ]);
  if (!cal) return null;
  const exceptions: CalendarException[] = ((excData ?? []) as CalendarExceptionRow[]).map((e) => ({
    date: e.date,
    type: e.type,
    hours: e.hours ?? undefined,
    label: e.label ?? undefined,
  }));
  return mapCalendar(cal as CalendarRow, exceptions);
}

async function resolveTaskIdByUid(
  supabase: AnySupabase,
  scheduleId: string,
  uid: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("gf_tasks")
    .select("id")
    .eq("schedule_id", scheduleId)
    .eq("external_uid", uid)
    .maybeSingle();
  if (error) throw new Error(`resolveTaskIdByUid: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

// =============================================================================
// Factory
// =============================================================================

let _singleton: SupabaseScheduleDataSource | null = null;

export function getScheduleDataSource(): ScheduleDataSource {
  if (!_singleton) _singleton = new SupabaseScheduleDataSource();
  return _singleton;
}

// Cached convenience-funktion för server components — react.cache räcker
// eftersom skrivningar går via server actions med eget anrop.
export const cachedLoadSchedule = cache(async (scheduleId: string): Promise<Schedule | null> => {
  return getScheduleDataSource().loadSchedule(scheduleId);
});

export const cachedListSchedules = cache(async (projectId: string): Promise<ScheduleListItem[]> => {
  return getScheduleDataSource().listSchedules(projectId);
});
