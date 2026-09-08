import { notFound } from "next/navigation";
import ScrollReset from "@/components/ScrollReset";
import QuantityTable from "@/components/QuantityTable";
import { getUnit } from "@/lib/data";
import { resolveProjectId } from "@/lib/documents-server";
import { dbQuantityItems } from "@/lib/db/project-extras";

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();

  const projectId = await resolveProjectId(org, id);
  const items = projectId ? await dbQuantityItems(projectId) : [];

  if (items.length === 0) {
    return (
      <ScrollReset className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-ink-1">Mängdförteckning saknas</h2>
            <p className="mt-2 text-[13px] text-ink-3">
              Det här projektet har inga MF-poster seedade. Mängdförteckningen
              aktiveras automatiskt när poster läggs in i <code>pm_quantity_items</code>.
            </p>
          </div>
        </div>
      </ScrollReset>
    );
  }

  return (
    <ScrollReset className="h-full">
      <QuantityTable items={items} projectName={unit.name} />
    </ScrollReset>
  );
}
