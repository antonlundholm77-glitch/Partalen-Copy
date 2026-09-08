// Per-projekt-modul-overrides. Saknas rad → modulen är tillgänglig (default på).
// Rad med enabled=false → dolt för det projektet. Module_id matchar nycklarna
// i lib/modules.ts (PROJECT_MODULES.key / COURSE_MODULES.key).

import { createClient } from "@/lib/supabase/server";

export interface ProjectModuleOverride {
  module_id: string;
  enabled: boolean;
}

export async function dbProjectModuleOverrides(
  projectId: string,
): Promise<ProjectModuleOverride[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_project_modules")
    .select("module_id, enabled")
    .eq("project_id", projectId);
  return ((res.data ?? []) as { module_id: string; enabled: boolean }[]).map((r) => ({
    module_id: r.module_id,
    enabled: r.enabled,
  }));
}

// Returnerar en Map { module_id → enabled? }. true om aktiv, false om explicit av.
// Saknas → odefinierad (kall ren default-tillstånd används).
export async function dbProjectModuleMap(
  projectId: string,
): Promise<Map<string, boolean>> {
  const rows = await dbProjectModuleOverrides(projectId);
  return new Map(rows.map((r) => [r.module_id, r.enabled]));
}

// Lista över modul-nycklar som är explicit avstängda för projektet. Konsumeras
// av Sidebar/Launchpad så att togglar i ProjectModulesPanel faktiskt gömmer
// modulen i menyn. Tom array = default-läge för alla moduler.
export async function dbDisabledModuleKeys(projectId: string): Promise<string[]> {
  const rows = await dbProjectModuleOverrides(projectId);
  return rows.filter((r) => !r.enabled).map((r) => r.module_id);
}
