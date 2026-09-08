"use server";

// CRUD-actions för pm_phases, pm_disciplines, pm_deliverables.
// RLS gör auktoriseringen — vi anropar med användarens session och får
// 401/403 om man saknar rätt. Returnerar { ok, error } i samma format som
// identity-actions.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateProject(orgSlug: string, projectSlug: string) {
  revalidatePath(`/c/${orgSlug}/${projectSlug}/process`);
  revalidatePath(`/c/${orgSlug}/${projectSlug}/teknik`);
  revalidatePath(`/c/${orgSlug}/${projectSlug}/leverabler`);
}

// =============================================================================
// Phases
// =============================================================================

export interface PhaseInput {
  stage: string;
  name: string;
  description?: string | null;
  status?: string;
  progress?: number;
  completion_date?: string | null;
  key_activities?: string[] | null;
  sort_order?: number;
}

export async function createPhase(
  orgSlug: string,
  projectSlug: string,
  projectId: string,
  data: PhaseInput,
): Promise<ActionResult> {
  if (!data.stage.trim() || !data.name.trim()) {
    return { ok: false, error: "Stage och namn krävs." };
  }
  const supabase = await createClient();
  const res = await (supabase.from("pm_phases") as any).insert({
    project_id: projectId,
    stage: data.stage.trim(),
    name: data.name.trim(),
    description: data.description ?? null,
    status: data.status ?? "upcoming",
    progress: data.progress ?? 0,
    completion_date: data.completion_date ?? null,
    key_activities: data.key_activities ?? null,
    sort_order: data.sort_order ?? 0,
  });
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function updatePhase(
  orgSlug: string,
  projectSlug: string,
  phaseId: string,
  data: Partial<PhaseInput>,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.stage !== undefined) patch.stage = data.stage.trim();
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.progress !== undefined) patch.progress = data.progress;
  if (data.completion_date !== undefined) patch.completion_date = data.completion_date ?? null;
  if (data.key_activities !== undefined) patch.key_activities = data.key_activities ?? null;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;

  const res = await (supabase.from("pm_phases") as any).update(patch).eq("id", phaseId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function deletePhase(
  orgSlug: string,
  projectSlug: string,
  phaseId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await supabase.from("pm_phases").delete().eq("id", phaseId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

// =============================================================================
// Disciplines
// =============================================================================

export interface DisciplineInput {
  code: string;
  name: string;
  color?: string | null;
  sort_order?: number;
  description?: string | null;
  status?: string;
  progress?: number;
  phase_id?: string | null;
  key_components?: string[] | null;
  integration_points?: string[] | null;
  responsible_team?: string | null;
  target_date?: string | null;
  icon_name?: string | null;
}

export async function createDiscipline(
  orgSlug: string,
  projectSlug: string,
  projectId: string,
  data: DisciplineInput,
): Promise<ActionResult> {
  if (!data.code.trim() || !data.name.trim()) {
    return { ok: false, error: "Kod och namn krävs." };
  }
  const supabase = await createClient();
  const res = await (supabase.from("pm_disciplines") as any).insert({
    project_id: projectId,
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    color: data.color ?? null,
    sort_order: data.sort_order ?? 0,
    description: data.description ?? null,
    status: data.status ?? "planering",
    progress: data.progress ?? 0,
    phase_id: data.phase_id ?? null,
    key_components: data.key_components ?? null,
    integration_points: data.integration_points ?? null,
    responsible_team: data.responsible_team ?? null,
    target_date: data.target_date ?? null,
    icon_name: data.icon_name ?? null,
  });
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function updateDiscipline(
  orgSlug: string,
  projectSlug: string,
  disciplineId: string,
  data: Partial<DisciplineInput>,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.code !== undefined) patch.code = data.code.trim().toUpperCase();
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.color !== undefined) patch.color = data.color ?? null;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.progress !== undefined) patch.progress = data.progress;
  if (data.phase_id !== undefined) patch.phase_id = data.phase_id ?? null;
  if (data.key_components !== undefined) patch.key_components = data.key_components ?? null;
  if (data.integration_points !== undefined)
    patch.integration_points = data.integration_points ?? null;
  if (data.responsible_team !== undefined)
    patch.responsible_team = data.responsible_team ?? null;
  if (data.target_date !== undefined) patch.target_date = data.target_date ?? null;
  if (data.icon_name !== undefined) patch.icon_name = data.icon_name ?? null;
  const res = await (supabase.from("pm_disciplines") as any)
    .update(patch)
    .eq("id", disciplineId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function deleteDiscipline(
  orgSlug: string,
  projectSlug: string,
  disciplineId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await supabase.from("pm_disciplines").delete().eq("id", disciplineId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

// =============================================================================
// Deliverables
// =============================================================================

export interface DeliverableInput {
  code: string;
  name: string;
  description?: string | null;
  phase_id?: string | null;
  discipline_id?: string | null;
  status?: string;
  format?: string | null;
  information_content?: string[] | null;
  responsible?: string | null;
  due_date?: string | null;
  building?: string | null;
  sort_order?: number;
}

export async function createDeliverable(
  orgSlug: string,
  projectSlug: string,
  projectId: string,
  data: DeliverableInput,
): Promise<ActionResult> {
  if (!data.code.trim() || !data.name.trim()) {
    return { ok: false, error: "Kod och namn krävs." };
  }
  const supabase = await createClient();
  const res = await (supabase.from("pm_deliverables") as any).insert({
    project_id: projectId,
    code: data.code.trim(),
    name: data.name.trim(),
    description: data.description ?? null,
    phase_id: data.phase_id ?? null,
    discipline_id: data.discipline_id ?? null,
    status: data.status ?? "ej-paborjad",
    format: data.format ?? null,
    information_content: data.information_content ?? null,
    responsible: data.responsible ?? null,
    due_date: data.due_date ?? null,
    building: data.building ?? null,
    sort_order: data.sort_order ?? 0,
  });
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function updateDeliverable(
  orgSlug: string,
  projectSlug: string,
  deliverableId: string,
  data: Partial<DeliverableInput>,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.phase_id !== undefined) patch.phase_id = data.phase_id ?? null;
  if (data.discipline_id !== undefined) patch.discipline_id = data.discipline_id ?? null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.format !== undefined) patch.format = data.format ?? null;
  if (data.information_content !== undefined)
    patch.information_content = data.information_content ?? null;
  if (data.responsible !== undefined) patch.responsible = data.responsible ?? null;
  if (data.due_date !== undefined) patch.due_date = data.due_date ?? null;
  if (data.building !== undefined) patch.building = data.building ?? null;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  const res = await (supabase.from("pm_deliverables") as any)
    .update(patch)
    .eq("id", deliverableId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}

export async function deleteDeliverable(
  orgSlug: string,
  projectSlug: string,
  deliverableId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await supabase.from("pm_deliverables").delete().eq("id", deliverableId);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateProject(orgSlug, projectSlug);
  return { ok: true };
}
