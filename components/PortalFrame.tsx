import { getUnit } from "@/lib/data";

// Bäddar in en (statisk, JS-renderad) projektportal via iframe. `section` ger
// embed-läge (portalens egen header/sidebar döljs, en sektion visas) och
// djuplänkar dit via hash. Utan `section` visas hela portalen.
export default function PortalFrame({
  src,
  section,
  title = "Projektportal",
}: {
  src: string;
  section?: string;
  title?: string;
}) {
  const url = section ? `${src}?embed=1#${section}` : src;
  return <iframe src={url} title={title} className="h-full w-full border-0 bg-white" />;
}

// Returnerar en inbäddad portalsektion för enhetens modul, eller null om
// enheten inte är portal-backad / saknar mappning för modulen.
export function modulePortal(org: string, id: string, moduleKey: string) {
  const unit = getUnit(org, id);
  const sec = unit?.portal?.sections?.[moduleKey];
  if (!unit?.portal || !sec) return null;
  return <PortalFrame src={unit.portal.src} section={sec} title={unit.name} />;
}
