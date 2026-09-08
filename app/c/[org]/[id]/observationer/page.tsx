import { notFound } from "next/navigation";
import { getUnit } from "@/lib/data";
import { getModule } from "@/lib/modules";
import { projectContent } from "@/lib/project-content";
import { ObservationsView } from "@/components/ProjectContentViews";
import ModulePlaceholder from "@/components/ModulePlaceholder";

const m = getModule("observationer")!;

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();
  const content = projectContent(org, id);
  if (!content?.observations) {
    return <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />;
  }
  return <ObservationsView unitName={unit.name} observations={content.observations} />;
}
