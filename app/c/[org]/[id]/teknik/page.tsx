import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { modulePortal } from "@/components/PortalFrame";
import { getUnit } from "@/lib/data";
import { AUTH_ENABLED } from "@/lib/auth";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDeliverables, dbDisciplines, dbPhases } from "@/lib/db/deliverables";
import { canManageProject } from "@/lib/auth/access";
import TechnicalAreasView from "@/components/TechnicalAreasView";

const m = getModule("tekniska")!;

// Teknik — administrera teknikområden (PM Cloud DisciplinesView-paritet).
// Visar lista med stats + CRUD-modal. Fallback till portal eller placeholder.
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
      const [disciplines, deliverables, phases, canManage] = await Promise.all([
        dbDisciplines(project.id),
        dbDeliverables(project.id),
        dbPhases(project.id),
        canManageProject(project.id),
      ]);

      if (disciplines.length > 0 || deliverables.length > 0) {
        return (
          <TechnicalAreasView
            orgSlug={org}
            projectSlug={id}
            projectId={project.id}
            projectName={unit.name}
            disciplines={disciplines}
            deliverables={deliverables}
            phases={phases}
            canManage={canManage}
          />
        );
      }
    }
  }

  return (
    modulePortal(org, id, "tekniska") ?? (
      <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />
    )
  );
}
