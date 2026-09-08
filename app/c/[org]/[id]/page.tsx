import { notFound } from "next/navigation";
import ModuleOverview from "@/components/ModuleOverview";
import BrandedHero from "@/components/BrandedHero";
import PartalenProjectHero from "@/components/PartalenProjectHero";
import { getProjectDoc } from "@/lib/data";
import { modulePortal } from "@/components/PortalFrame";
import { resolveModuleGroups } from "@/lib/modules";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDisabledModuleKeys } from "@/lib/db/project-modules";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";
import { getBrand } from "@/lib/db/branding";
import type { ResolvedBrand } from "@/lib/branding/types";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const doc = getProjectDoc(org, id);
  if (!doc) notFound();

  const portal = modulePortal(org, id, "oversikt");
  if (portal) return portal;
  const groups = doc.modules.groups ? resolveModuleGroups(doc.modules.groups) : undefined;

  let disabledModuleKeys: string[] = [];
  let hero;
  let brand: ResolvedBrand | undefined;
  if (AUTH_ENABLED) {
    const [project, ctx] = await Promise.all([projectBySlug(org, id), getAccessContext()]);
    if (project) disabledModuleKeys = await dbDisabledModuleKeys(project.id);
    brand = await getBrand({
      viewMode: ctx?.viewMode ?? "internal",
      orgSlug: org,
      projectSlug: id,
    });
    hero = brand.hero;
  }

  if (hero) {
    // Portal-kunder (Partalen m.fl.) får ljus hero som matchar kundlandningen.
    // Övriga kunder fortsätter med mörk PM-Cloud-gradient via BrandedHero.
    const useLightHero = brand?.portalMode === true;
    return (
      <div className="h-full overflow-y-auto">
        {useLightHero && brand ? (
          <PartalenProjectHero hero={hero} brand={brand} />
        ) : (
          <BrandedHero hero={hero} />
        )}
        <ModuleOverview
          basePath={`/c/${org}/${id}`}
          projectName={doc.metadata.name}
          meta={doc.metadata.meta}
          kind={doc.metadata.kind ?? "entreprenad"}
          phase={doc.metadata.phase}
          status={doc.metadata.status}
          portalKeys={Object.keys(doc.modules.portal?.sections ?? {})}
          groups={groups}
          purpose={doc.content.purpose}
          disabledModuleKeys={disabledModuleKeys}
          embedded
        />
      </div>
    );
  }

  return (
    <ModuleOverview
      basePath={`/c/${org}/${id}`}
      projectName={doc.metadata.name}
      meta={doc.metadata.meta}
      kind={doc.metadata.kind ?? "entreprenad"}
      phase={doc.metadata.phase}
      status={doc.metadata.status}
      portalKeys={Object.keys(doc.modules.portal?.sections ?? {})}
      groups={groups}
      purpose={doc.content.purpose}
      disabledModuleKeys={disabledModuleKeys}
    />
  );
}
