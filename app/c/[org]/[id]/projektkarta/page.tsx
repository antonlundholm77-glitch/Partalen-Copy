import ProjectMap from "@/components/ProjectMap";
import SchematicMap from "@/components/SchematicMap";
import DrawingEditor from "@/components/DrawingEditor";
import { modulePortal } from "@/components/PortalFrame";
import { getUnit } from "@/lib/data";
import { projectContent } from "@/lib/project-content";

export default async function Page({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const content = projectContent(org, id);

  // Renritning med redigerbart symbollager (om enheten har en uppladdad ritning).
  if (content?.drawing) {
    return (
      <DrawingEditor
        unitName={getUnit(org, id)?.name ?? ""}
        storageKey={`gf-drawing-${org}-${id}`}
        initial={content.drawing}
      />
    );
  }

  // Saknas koordinater? Visa tolkad schematisk vy istället för geografisk karta.
  if (content?.schematic) return <SchematicMap {...content.schematic} />;

  // Portal-backade enheter visar ev. egen kartsektion; annars standardkartan.
  return modulePortal(org, id, "projektkarta") ?? <ProjectMap />;
}
