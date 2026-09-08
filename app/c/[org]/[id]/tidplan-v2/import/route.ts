// POST /c/[org]/[id]/tidplan-v2/import
// Tar emot en ScheduleEnvelope-JSON i request-body, validerar mot
// lib/scheduling/schema.ts och seedar in i gf_schedules + gf_tasks.
//
// MVP-beteende: ersätter befintligt schedule (om finns) — diff-vy i UI:t
// kommer i senare iteration. Returnerar antal tasks/deps/errors.

import { NextResponse } from "next/server";
import { projectBySlug } from "@/lib/db/orgs";
import { validateScheduleJson } from "@/lib/scheduling/schema";
import { getScheduleDataSource } from "@/lib/scheduling/ds/supabase";
import type {
  CreateTaskInput,
  CreateDependencyInput,
} from "@/lib/scheduling/ds/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> },
) {
  const { org, id } = await params;
  const project = await projectBySlug(org, id);
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const result = validateScheduleJson(body);
  if (!result.ok || !result.parsed) {
    return NextResponse.json(
      {
        error: "Schema- eller cross-field-fel",
        schemaIssues: result.schemaIssues,
        crossFieldIssues: result.crossFieldIssues,
      },
      { status: 422 },
    );
  }

  const envelope = result.parsed;

  // Kontext-validering: kund/projekt-slugs måste matcha URL
  if (envelope.context.customerSlug !== org || envelope.context.projectSlug !== id) {
    return NextResponse.json(
      {
        error: `Envelopens context (${envelope.context.customerSlug}/${envelope.context.projectSlug}) matchar inte URL:n (${org}/${id})`,
      },
      { status: 422 },
    );
  }

  const ds = getScheduleDataSource();

  // Skapa tidplanen (eller använd existerande)
  const header = await ds.createSchedule({
    projectId: project.id,
    name: envelope.data.schedule.name,
    kind: envelope.data.schedule.kind,
    calendarRef: envelope.data.schedule.calendarRef,
    projectStartDate: envelope.data.schedule.projectStartDate,
  });

  // Tasks
  const taskInputs: CreateTaskInput[] = envelope.data.tasks.map((t) => ({
    scheduleId: header.id!,
    uid: t.uid,
    parentUid: t.parentUid,
    wbsCode: t.wbsCode,
    name: t.name,
    type: t.type,
    durationDays: t.durationDays,
    constraintType: t.constraint?.type,
    constraintDate: t.constraint?.date,
    responsible: t.responsible,
    notes: t.notes,
    sortOrder: 0,
  }));
  const insertedTasks = await ds.bulkInsertTasks(header.id!, taskInputs);

  // Dependencies
  const depInputs: CreateDependencyInput[] = envelope.data.dependencies.map((d) => ({
    scheduleId: header.id!,
    predecessorUid: d.predecessorUid,
    successorUid: d.successorUid,
    type: d.type,
    lagDays: d.lag,
  }));
  const insertedDeps = await ds.bulkInsertDependencies(header.id!, depInputs);

  return NextResponse.json({
    ok: true,
    scheduleId: header.id,
    tasksInserted: insertedTasks.length,
    dependenciesInserted: insertedDeps.length,
  });
}
