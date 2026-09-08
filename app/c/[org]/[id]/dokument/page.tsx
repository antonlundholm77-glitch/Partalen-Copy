import { notFound } from "next/navigation";
import { getCustomer, getUnit } from "@/lib/data";
import DocumentLibrary from "@/components/DocumentLibrary";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { getModule } from "@/lib/modules";
import { canUploadProject, canManageProject } from "@/lib/auth/access";
import { AUTH_ENABLED } from "@/lib/auth";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDeliverables, dbDisciplines, dbPhases } from "@/lib/db/deliverables";

const m = getModule("dokument")!;

export default async function DokumentPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const customer = getCustomer(org);
  const unit = getUnit(org, id);
  if (!customer || !unit) notFound();

  if (AUTH_ENABLED) {
    const project = await projectBySlug(org, id);
    if (project) {
      const [richDeliverables, richDisciplines, phases, canUpload, canManage] = await Promise.all([
        dbDeliverables(project.id),
        dbDisciplines(project.id),
        dbPhases(project.id),
        canUploadProject(project.id),
        canManageProject(project.id),
      ]);

      return (
        <DocumentLibrary
          projectId={project.id}
          unitName={unit.name}
          deliverables={richDeliverables.map((d) => ({ id: d.id, code: d.code, name: d.name }))}
          disciplines={richDisciplines.map((d) => ({ code: d.code, name: d.name, color: d.color }))}
          richDeliverables={richDeliverables}
          richDisciplines={richDisciplines}
          phases={phases}
          canUpload={canUpload}
          canManage={canManage}
          orgSlug={org}
          projectSlug={id}
          projectIdForActions={project.id}
        />
      );
    }
  }

  return <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />;
}
