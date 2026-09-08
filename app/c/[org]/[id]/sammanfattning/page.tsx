import { notFound } from "next/navigation";
import ScrollReset from "@/components/ScrollReset";
import ProjectSummaryView from "@/components/ProjectSummaryView";
import { getUnit } from "@/lib/data";
import { resolveProjectId } from "@/lib/documents-server";
import {
  dbStakeholders,
  dbRestrictions,
  dbPenalties,
  dbContractDeviations,
} from "@/lib/db/project-extras";

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();

  const projectId = await resolveProjectId(org, id);
  if (!projectId) {
    return (
      <ScrollReset className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-ink-1">Sammanfattning kräver projektdata</h2>
            <p className="mt-2 text-[13px] text-ink-3">
              Det här projektet är inte seedat i Supabase ännu.
            </p>
          </div>
        </div>
      </ScrollReset>
    );
  }

  const [stakeholders, restrictions, penalties, deviations] = await Promise.all([
    dbStakeholders(projectId),
    dbRestrictions(projectId),
    dbPenalties(projectId),
    dbContractDeviations(projectId),
  ]);

  return (
    <ScrollReset className="h-full">
      <ProjectSummaryView
        projectName={unit.name}
        meta={unit.meta}
        stakeholders={stakeholders}
        restrictions={restrictions}
        penalties={penalties}
        deviations={deviations}
      />
    </ScrollReset>
  );
}
