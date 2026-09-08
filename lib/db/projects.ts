// Projekt-CRUD-helpers ovanpå Supabase (gf_projects + gf_organizations).
// Återanvänds av server actions och admin-vyer. Slug-generering här (server)
// så vi kan kolla unikhet inom org.

import { createClient } from "@/lib/supabase/server";

const PROJECT_PHASES = [
  "forstudie",
  "projektering",
  "upphandling",
  "anbud",
  "utforande",
  "overlamning",
  "forvaltning",
] as const;
const PROJECT_STATUSES = ["pagaende", "arkiverat"] as const;

export type ProjectPhase = (typeof PROJECT_PHASES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function isProjectPhase(value: string): value is ProjectPhase {
  return (PROJECT_PHASES as readonly string[]).includes(value);
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

// Kebab-case + en oändlig svans av siffror om kollision.
// "Etapp 3 Norra" → "etapp-3-norra"
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function uniqueSlug(orgId: string, base: string): Promise<string> {
  const supabase = await createClient();
  const root = slugify(base) || "projekt";
  // Hämta alla projekt-slugs i orgen — typiskt få rader.
  const res = await supabase
    .from("gf_projects")
    .select("slug")
    .eq("org_id", orgId);
  const taken = new Set(
    ((res.data ?? []) as { slug: string | null }[])
      .map((r) => r.slug)
      .filter((s): s is string => Boolean(s)),
  );
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Fallback med slumpat suffix om vi nådde 999.
  return `${root}-${Date.now().toString(36)}`;
}

export interface CreateProjectInput {
  orgId: string;
  name: string;
  slug?: string;
  phase?: ProjectPhase;
  status?: ProjectStatus;
  meta?: string | null;
  program?: string | null;
  assignmentId?: string | null;
}

export interface ProjectPatch {
  name?: string;
  slug?: string;
  phase?: ProjectPhase;
  status?: ProjectStatus;
  meta?: string | null;
  program?: string | null;
}

export interface CreatedProject {
  id: string;
  slug: string;
  name: string;
}

export async function createProject(input: CreateProjectInput): Promise<
  { ok: true; project: CreatedProject } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const name = input.name.trim();
  if (name.length === 0) return { ok: false, error: "Namn krävs." };

  const desiredSlug = input.slug?.trim() ? slugify(input.slug) : await uniqueSlug(input.orgId, name);
  // Om användaren angav slug — kolla unikhet manuellt så vi kan returnera fint
  // felmeddelande istället för en rå constraint-violation.
  if (input.slug?.trim()) {
    const collisionRes = await supabase
      .from("gf_projects")
      .select("id")
      .eq("org_id", input.orgId)
      .eq("slug", desiredSlug)
      .maybeSingle();
    if (collisionRes.data) {
      return { ok: false, error: `Slug "${desiredSlug}" är redan tagen i denna kund.` };
    }
  }

  const payload = {
    org_id: input.orgId,
    name,
    slug: desiredSlug,
    phase: input.phase ?? "forstudie",
    status: input.status ?? "pagaende",
    meta: input.meta ?? null,
    program: input.program ?? null,
    assignment_id: input.assignmentId ?? null,
  };

  const res = await supabase
    .from("gf_projects")
    .insert(payload as never)
    .select("id, slug, name")
    .single();

  if (res.error) return { ok: false, error: res.error.message };
  const row = res.data as { id: string; slug: string; name: string };
  return { ok: true, project: row };
}

export async function updateProject(
  projectId: string,
  patch: ProjectPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.name != null) update.name = patch.name.trim();
  if (patch.slug != null) update.slug = slugify(patch.slug);
  if (patch.phase != null) update.phase = patch.phase;
  if (patch.status != null) update.status = patch.status;
  if (patch.meta !== undefined) update.meta = patch.meta;
  if (patch.program !== undefined) update.program = patch.program;

  if (Object.keys(update).length === 0) return { ok: true };

  const res = await supabase
    .from("gf_projects")
    .update(update as never)
    .eq("id", projectId);
  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}

export async function archiveProject(projectId: string) {
  return updateProject(projectId, { status: "arkiverat" });
}

export async function unarchiveProject(projectId: string) {
  return updateProject(projectId, { status: "pagaende" });
}
