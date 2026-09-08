"use server";

// Server actions för projekt — skapa, uppdatera, arkivera, återöppna.
// RLS gäller — admin/manager-roll krävs (se 0002_access.sql).

import { revalidatePath } from "next/cache";
import { orgBySlug } from "@/lib/db/orgs";
import {
  createProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  isProjectPhase,
  isProjectStatus,
  type ProjectPatch,
} from "@/lib/db/projects";

export type ProjectActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

export interface CreateProjectActionInput {
  name: string;
  slug?: string;
  phase?: string;
  meta?: string;
  program?: string;
}

export async function createProjectInOrg(
  orgSlug: string,
  input: CreateProjectActionInput,
): Promise<ProjectActionResult> {
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const phase = input.phase && isProjectPhase(input.phase) ? input.phase : undefined;

  const res = await createProject({
    orgId: org.id,
    name: input.name,
    slug: input.slug,
    phase,
    meta: input.meta?.trim() || null,
    program: input.program?.trim() || null,
  });

  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  revalidatePath(`/c/${orgSlug}`);
  return { ok: true, data: { id: res.project.id, slug: res.project.slug } };
}

export interface UpdateProjectActionInput {
  name?: string;
  phase?: string;
  status?: string;
  meta?: string | null;
  program?: string | null;
}

export async function updateProjectInOrg(
  orgSlug: string,
  projectId: string,
  input: UpdateProjectActionInput,
): Promise<ProjectActionResult> {
  const patch: ProjectPatch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phase !== undefined) {
    if (!isProjectPhase(input.phase)) return { ok: false, error: `Ogiltig fas: ${input.phase}.` };
    patch.phase = input.phase;
  }
  if (input.status !== undefined) {
    if (!isProjectStatus(input.status))
      return { ok: false, error: `Ogiltig status: ${input.status}.` };
    patch.status = input.status;
  }
  if (input.meta !== undefined) patch.meta = input.meta;
  if (input.program !== undefined) patch.program = input.program;

  const res = await updateProject(projectId, patch);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  revalidatePath(`/c/${orgSlug}`);
  return { ok: true };
}

export async function archiveProjectInOrg(
  orgSlug: string,
  projectId: string,
): Promise<ProjectActionResult> {
  const res = await archiveProject(projectId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  revalidatePath(`/c/${orgSlug}`);
  return { ok: true };
}

export async function unarchiveProjectInOrg(
  orgSlug: string,
  projectId: string,
): Promise<ProjectActionResult> {
  const res = await unarchiveProject(projectId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  revalidatePath(`/c/${orgSlug}`);
  return { ok: true };
}
