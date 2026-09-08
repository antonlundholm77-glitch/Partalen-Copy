// Nivå-subtema: lågmäld färgnyans som följer med beroende på var i hierarkin
// man är (plattform ▸ Kund ▸ Projekt/Kurs). Återkommer i top-chrome + innehåll.
// Samma kulörer som sidomeny/OrgTree: oliv / terrakotta / grön.

export type LevelKey = "platform" | "kund" | "projekt";

export function currentLevel(customerId?: string, projectId?: string): LevelKey {
  if (projectId) return "projekt";
  if (customerId) return "kund";
  return "platform";
}

export const LEVEL_THEME: Record<
  LevelKey,
  { tint: string; line: string; accent: string }
> = {
  platform: { tint: "bg-[#6d6930]/[0.06]", line: "border-t-[#6d6930]", accent: "text-[#6d6930]" },
  kund: { tint: "bg-[#b5532a]/[0.06]", line: "border-t-[#b5532a]", accent: "text-[#b5532a]" },
  projekt: { tint: "bg-[#5e8553]/[0.07]", line: "border-t-[#5e8553]", accent: "text-[#5e8553]" },
};
