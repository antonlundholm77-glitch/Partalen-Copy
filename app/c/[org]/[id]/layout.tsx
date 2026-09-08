import { notFound } from "next/navigation";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import { getCustomer, getUnit } from "@/lib/data";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDisabledModuleKeys } from "@/lib/db/project-modules";
import { AUTH_ENABLED } from "@/lib/auth";


// Projekt-/kursarbetsyta. Modul-overrides från gf_project_modules backas in i
// Sidebar + Launchpad så att toggles i ProjectModulesPanel faktiskt gömmer
// modulen. Default (saknas rad) → ingen filtrering, exakt nuvarande beteende.
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const customer = getCustomer(org);
  const unit = getUnit(org, id);
  if (!customer || !unit) notFound();

  let disabledModuleKeys: string[] = [];
  if (AUTH_ENABLED) {
    const project = await projectBySlug(org, id);
    if (project) disabledModuleKeys = await dbDisabledModuleKeys(project.id);
  }

  return (
    <ProjectWorkspace
      currentCustomerId={org}
      projects={customer.units.map((u) => ({ id: u.id, name: u.name }))}
      currentProjectId={id}
      unitNoun={customer.unitNoun}
      unitNounPlural={customer.unitNounPlural}
      kind={customer.kind}
      edition={unit.edition}
      disabledModuleKeys={disabledModuleKeys}
    >
      {children}
    </ProjectWorkspace>
  );
}
