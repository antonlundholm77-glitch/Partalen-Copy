"use server";

// Server actions för verktygshantering per projekt.
// Sätter/raderar overrides i gf_project_modules. RLS = admin/manager-roll.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orgBySlug } from "@/lib/db/orgs";

export type ModuleActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function resolveProjectId(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };
  const supabase = await createClient();
  const res = await supabase
    .from("gf_projects")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", projectSlug)
    .maybeSingle();
  const row = res.data as { id: string } | null;
  if (!row) return { ok: false, error: `Hittar inte ${projectSlug}.` };
  return { ok: true, projectId: row.id };
}

export async function setProjectModuleEnabled(
  orgSlug: string,
  projectSlug: string,
  moduleId: string,
  enabled: boolean,
): Promise<ModuleActionResult> {
  const resolved = await resolveProjectId(orgSlug, projectSlug);
  if (!resolved.ok) return resolved;

  const supabase = await createClient();
  const res = await supabase
    .from("gf_project_modules")
    .upsert({ project_id: resolved.projectId, module_id: moduleId, enabled } as never, {
      onConflict: "project_id,module_id",
    });

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  revalidatePath(`/c/${orgSlug}/${projectSlug}`);
  return { ok: true };
}

// Ta bort en override (återgå till defaultläget).
export async function clearProjectModuleOverride(
  orgSlug: string,
  projectSlug: string,
  moduleId: string,
): Promise<ModuleActionResult> {
  const resolved = await resolveProjectId(orgSlug, projectSlug);
  if (!resolved.ok) return resolved;

  const supabase = await createClient();
  const res = await supabase
    .from("gf_project_modules")
    .delete()
    .eq("project_id", resolved.projectId)
    .eq("module_id", moduleId);

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/c/${orgSlug}/${projectSlug}/behorighet`);
  revalidatePath(`/c/${orgSlug}/${projectSlug}`);
  return { ok: true };
}
