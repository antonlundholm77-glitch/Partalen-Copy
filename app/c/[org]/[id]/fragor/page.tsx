import { getModule } from "@/lib/modules";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { modulePortal } from "@/components/PortalFrame";
import { projectContent } from "@/lib/project-content";
import { getUnit } from "@/lib/data";
import { QuestionsView } from "@/components/ProjectContentViews";

const m = getModule("fragor")!;

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const questions = projectContent(org, id)?.questions;
  if (questions) {
    return <QuestionsView unitName={getUnit(org, id)?.name ?? ""} questions={questions} />;
  }
  return (
    modulePortal(org, id, "fragor") ?? (
      <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />
    )
  );
}
