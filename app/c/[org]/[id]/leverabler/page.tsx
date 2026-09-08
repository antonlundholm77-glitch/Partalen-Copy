import { notFound } from "next/navigation";
import { getUnit } from "@/lib/data";
import { getModule } from "@/lib/modules";
import { projectContent } from "@/lib/project-content";
import { DeliverablesView } from "@/components/ProjectContentViews";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import DeliverablesList from "@/components/DeliverablesList";
import { AUTH_ENABLED } from "@/lib/auth";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDeliverables, dbPhases } from "@/lib/db/deliverables";

const m = getModule("leverabler")!;

// Leverabel-lista. DB-driven när AUTH_ENABLED + projekt finns i gf_projects,
// annars fixture-fallback (gamla DeliverablesView).
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
      const [deliverables, phases] = await Promise.all([
        dbDeliverables(project.id),
        dbPhases(project.id),
      ]);

      if (deliverables.length > 0) {
        return (
          <div className="h-full overflow-y-auto px-8 py-8">
            <div className="mx-auto max-w-4xl">
              <h1 className="text-xl font-medium tracking-tight">Leverabler</h1>
              <p className="text-ink-3 mt-0.5 text-sm">
                {unit.name} · {deliverables.length} leverabler i {phases.length} faser
              </p>
              <div className="mt-6">
                <DeliverablesList
                  basePath={`/c/${org}/${id}/leverabler`}
                  phases={phases}
                  deliverables={deliverables}
                />
              </div>
            </div>
          </div>
        );
      }
    }
  }

  // Fixture-fallback (oförändrad — för projekt som inte är seedade i DB ännu)
  const content = projectContent(org, id);
  if (!content?.deliverables) {
    return <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />;
  }
  return <DeliverablesView unitName={unit.name} deliverables={content.deliverables} />;
}
