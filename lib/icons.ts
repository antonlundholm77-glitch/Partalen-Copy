// Central Lucide-ikon-karta — en källa för modul-/yt-ikoner i hela appen
// (sidomeny, launchpad, modulkatalog, playbook-nav). Lägg nya nycklar här.

import {
  LayoutDashboard,
  ListTree,
  Map,
  Files,
  Workflow,
  ShieldAlert,
  CalendarRange,
  HardHat,
  Layers,
  Hammer,
  Wrench,
  HelpCircle,
  ClipboardCheck,
  Users,
  ShieldCheck,
  CalendarDays,
  Presentation,
  BookOpen,
  Link2,
  Building2,
  BookMarked,
  FileText,
  Network,
  Video,
  Boxes,
  PackageCheck,
  Lightbulb,
  Palette,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export const MODULE_ICONS: Record<string, LucideIcon> = {
  // projektmoduler
  oversikt: LayoutDashboard,
  smartprep: ListTree,
  projektkarta: Map,
  dokument: Files,
  process: Workflow,
  risk: ShieldAlert,
  tidplan: CalendarRange,
  arbetsmiljo: HardHat,
  omraden: Layers,
  genomforande: Hammer,
  teknik: Wrench,
  fragor: HelpCircle,
  kontrollplan: ClipboardCheck,
  moten: Users,
  behorighet: ShieldCheck,
  // kurerade extra-moduler
  organisation: Network,
  karta: Map,
  observationer: Video,
  objekt: Boxes,
  leverabler: PackageCheck,
  lessons: Lightbulb,
  // kursverktyg
  schema: CalendarDays,
  forelasningar: Presentation,
  kursmaterial: BookOpen,
  lankar: Link2,
  // interna ytor
  kunder: Building2,
  playbook: BookMarked,
  operator: Workflow,
  dashboard: LayoutDashboard,
  mallar: FileText,
  resursplanering: CalendarRange,
  resurser: CalendarRange,
  bibliotek: BookOpen,
  team: Users,
  grafiskProfil: Palette,
  canvas: PenLine,
};

export function moduleIcon(key: string): LucideIcon {
  return MODULE_ICONS[key] ?? LayoutDashboard;
}
