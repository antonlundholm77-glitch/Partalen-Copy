import { notFound } from "next/navigation";
import { getUnit } from "@/lib/data";
import DeliverableDetail from "@/components/DeliverableDetail";
import { AUTH_ENABLED } from "@/lib/auth";
import { projectBySlug } from "@/lib/db/orgs";
import { dbDeliverableByCode } from "@/lib/db/deliverables";
import { dbDocumentsForDeliverable } from "@/lib/db/deliverable-documents";

// Detalj-vy för en leverabel — /c/<org>/<projekt>/leverabler/<code>
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string; code: string }>;
}) {
  const { org, id, code } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();
  if (!AUTH_ENABLED) notFound();

  const project = await projectBySlug(org, id);
  if (!project) notFound();

  const deliverable = await dbDeliverableByCode(project.id, code);
  if (!deliverable) notFound();

  const documents = await dbDocumentsForDeliverable(deliverable.id);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <DeliverableDetail
          basePath={`/c/${org}/${id}/leverabler`}
          projectBasePath={`/c/${org}/${id}`}
          deliverable={deliverable}
          documents={documents}
        />
      </div>
    </div>
  );
}
