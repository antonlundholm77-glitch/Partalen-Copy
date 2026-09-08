import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { modulePortal } from "@/components/PortalFrame";
import { getUnit } from "@/lib/data";
import { AUTH_ENABLED } from "@/lib/auth";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDeliverables, dbDisciplines, dbPhases } from "@/lib/db/deliverables";
import { canManageProject } from "@/lib/auth/access";
import ProcessView from "@/components/ProcessView";

const m = getModule("process")!;

// Projektprocessen — administrera faser och leverabler kopplade till varje fas.
// PM Cloud-paritet: ProcessView med flow-strip + detalj-panel + CRUD-modal.
// Fallback till portal-iframe eller placeholder för icke-seedade projekt.
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();

  if (AUTH_ENABLED) {
    const project = await projectBySlug(org, id);
    if (project) {
      const [phases, deliverables, disciplines, canManage] = await Promise.all([
        dbPhases(project.id),
        dbDeliverables(project.id),
        dbDisciplines(project.id),
        canManageProject(project.id),
      ]);

      if (phases.length > 0 || deliverables.length > 0 || disciplines.length > 0) {
        return (
          <ProcessView
            orgSlug={org}
            projectSlug={id}
            projectId={project.id}
            projectName={unit.name}
            phases={phases}
            deliverables={deliverables}
            disciplines={disciplines}
            canManage={canManage}
          />
        );
      }
    }
  }

  return (
    modulePortal(org, id, "process") ?? (
      <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />
    )
  );
}
