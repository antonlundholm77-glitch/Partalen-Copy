import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { modulePortal } from "@/components/PortalFrame";
import TidplanTabs from "@/components/TidplanTabs";
import ScheduleGantt from "@/lib/scheduling/ui/ScheduleGantt";
import ScheduleImportExportBar from "@/components/ScheduleImportExportBar";
import { computeCpm } from "@/lib/scheduling/cpm";
import { getCustomer, getUnit } from "@/lib/data";
import { resolveProjectId } from "@/lib/documents-server";
import { dbPhases } from "@/lib/db/deliverables";
import { projectBySlug } from "@/lib/db/orgs";
import { cachedListSchedules, cachedLoadSchedule } from "@/lib/scheduling/ds/supabase";

const m = getModule("tidplan")!;

// Projektstart per kurerad enhet — användbart när tidplanen ska börja innan
// första fasens completion_date (default härleds till -2 mån).
const PROJECT_STARTS: Record<string, string> = {};

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const portal = modulePortal(org, id, "tidplan");
  if (portal) return portal;

  const customer = getCustomer(org);
  const unit = getUnit(org, id);
  if (!customer || !unit) notFound();

  // 1) Försök läsa DB-tidplan (gf_schedules) först — riktiga CPM-tidplaner
  const dbProject = await projectBySlug(org, id);
  if (dbProject) {
    const list = await cachedListSchedules(dbProject.id);
    const active = list.find((s) => s.status === "active") ?? list[0];
    if (active) {
      const schedule = await cachedLoadSchedule(active.id);
      if (schedule && schedule.tasks.length > 0) {
        const projectStart =
          schedule.header.projectStartDate ??
          schedule.tasks
            .map((t) => t.plannedStart)
            .filter((v): v is string => Boolean(v))
            .sort()[0];
        if (projectStart) {
          const cpm = computeCpm({
            tasks: schedule.tasks,
            dependencies: schedule.dependencies,
            calendar: schedule.calendar,
            projectStart,
          });
          const cpmByUid: Record<string, ReturnType<typeof cpm.byUid.get>> = {};
          cpm.byUid.forEach((v, k) => { cpmByUid[k] = v; });
          // CPM räknar projectFinish bara på ES/EF — om paketen har sina egna
          // planned_end (FNLT-constraints) räcker det inte. Ta max av båda.
          const latestPlanned = schedule.tasks
            .map((t) => t.plannedEnd)
            .filter((v): v is string => Boolean(v))
            .sort()
            .pop();
          const projectFinish =
            latestPlanned && latestPlanned > cpm.projectFinish
              ? latestPlanned
              : cpm.projectFinish;
          return (
            <div className="grid h-full grid-rows-[auto_1fr]">
              <ScheduleImportExportBar org={org} id={id} />
              <div className="min-h-0">
                <ScheduleGantt
                  tasks={schedule.tasks}
                  cpmByUid={cpmByUid as never}
                  projectStart={projectStart}
                  projectFinish={projectFinish}
                  scheduleName={schedule.header.name}
                  customerName={`${customer.name} · ${unit.name}`}
                  badge={`DB · ${schedule.tasks.length} tasks`}
                />
              </div>
            </div>
          );
        }
      }
    }
  }

  // 2) Fallback: pm_phases-vyn (process-/etapp-tidplan)
  const projectId = await resolveProjectId(org, id);
  const phases = projectId ? await dbPhases(projectId) : [];

  if (phases.length === 0) {
    return <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />;
  }

  return (
    <TidplanTabs
      phases={phases}
      projectName={unit.name}
      projectStart={PROJECT_STARTS[id]}
    />
  );
}
