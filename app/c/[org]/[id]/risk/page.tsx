import { getModule } from "@/lib/modules";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import { modulePortal } from "@/components/PortalFrame";

const m = getModule("risk")!;

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  return (
    modulePortal(org, id, "risk") ?? (
      <ModulePlaceholder moduleKey={m.key} title={m.label} blurb={m.blurb} />
    )
  );
}
