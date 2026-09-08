import { notFound } from "next/navigation";
import { getUnit } from "@/lib/data";
import { getModule } from "@/lib/modules";
import { projectContent } from "@/lib/project-content";
import { ObjectsView } from "@/components/ProjectContentViews";
import ModulePlaceholder from "@/components/ModulePlaceholder";

const m = getModule("objekt")!;

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();
  const content = projectContent(org, id);
  if (!content?.objects) {
    return <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />;
  }
  return <ObjectsView unitName={unit.name} objects={content.objects} />;
}
