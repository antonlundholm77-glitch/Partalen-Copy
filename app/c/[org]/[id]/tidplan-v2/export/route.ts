// GET /c/[org]/[id]/tidplan-v2/export
// Returnerar projektets aktiva tidplan som ScheduleEnvelope-JSON-fil.
// Format matchar lib/scheduling/schema.ts → kan re-importeras eller delas
// med en LLM-session som arbetar i tidplanens prompt-guide-format.

import { NextResponse } from "next/server";
import { projectBySlug } from "@/lib/db/orgs";
import { cachedListSchedules, cachedLoadSchedule } from "@/lib/scheduling/ds/supabase";
import { scheduleToEnvelope } from "@/lib/scheduling/envelope";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string }> },
) {
  const { org, id } = await params;
  const project = await projectBySlug(org, id);
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte i DB" }, { status: 404 });
  }
  const list = await cachedListSchedules(project.id);
  const active = list.find((s) => s.status === "active") ?? list[0];
  if (!active) {
    return NextResponse.json(
      { error: "Ingen tidplan finns för projektet" },
      { status: 404 },
    );
  }
  const schedule = await cachedLoadSchedule(active.id);
  if (!schedule) {
    return NextResponse.json({ error: "Kunde inte ladda tidplanen" }, { status: 500 });
  }
  const envelope = scheduleToEnvelope(schedule, {
    customerSlug: org,
    projectSlug: id,
  });
  const json = JSON.stringify(envelope, null, 2);
  const filename = `schedule-${org}-${id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(json, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
