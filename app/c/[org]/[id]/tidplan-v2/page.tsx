// Tidplan v2 var den utvecklingsroute där CPM-flödet och DB-läsningen
// arbetades upp. /tidplan läser nu samma DB-tidplan när den finns —
// vi behöver inte längre en separat v2-yta. Redirectar dit istället för
// att hålla två kodvägar i synk.
//
// Export/import-routarna under denna sökväg (/tidplan-v2/export och
// /tidplan-v2/import) lever kvar och anropas av ScheduleImportExportBar.

import { redirect } from "next/navigation";

export default async function TidplanV2Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  redirect(`/c/${org}/${id}/tidplan`);
}
