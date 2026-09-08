import { notFound } from "next/navigation";
import ProjectExplorer from "@/components/ProjectExplorer";
import { getUnit, getAmaData } from "@/lib/data";
import { modulePortal } from "@/components/PortalFrame";

export default async function SmartPrepPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const unit = getUnit(org, id);
  if (!unit) notFound();
  const portal = modulePortal(org, id, "smartprep");
  if (portal) return portal;
  const { codes, tb, mf } = getAmaData(unit);
  return <ProjectExplorer codes={codes} tb={tb} mf={mf} />;
}
