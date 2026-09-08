"use server";

import { revalidatePath } from "next/cache";
import { orgBySlug } from "@/lib/db/orgs";
import {
  createAssignment,
  updateAssignment,
  setAssignmentStatus,
} from "@/lib/db/assignments";
import { createProject, isProjectPhase } from "@/lib/db/projects";

export type AssignmentActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

export async function createAssignmentInOrg(
  orgSlug: string,
  input: { title: string; description?: string; operator?: string },
): Promise<AssignmentActionResult> {
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const res = await createAssignment({
    orgId: org.id,
    title: input.title,
    description: input.description,
    operator: input.operator,
  });

  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true, data: { id: res.id } };
}

export async function updateAssignmentInOrg(
  orgSlug: string,
  assignmentId: string,
  input: { title?: string; description?: string | null; operator?: string | null },
): Promise<AssignmentActionResult> {
  const res = await updateAssignment(assignmentId, input);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true };
}

export async function setAssignmentStatusInOrg(
  orgSlug: string,
  assignmentId: string,
  status: "draft" | "active" | "inactive",
): Promise<AssignmentActionResult> {
  const res = await setAssignmentStatus(assignmentId, status);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  return { ok: true };
}

export async function deployProjectFromAssignment(
  orgSlug: string,
  assignmentId: string,
  input: { name: string; phase?: string },
): Promise<AssignmentActionResult> {
  const org = await orgBySlug(orgSlug);
  if (!org) return { ok: false, error: `Hittar inte kunden ${orgSlug}.` };

  const phase = input.phase && isProjectPhase(input.phase) ? input.phase : undefined;

  const res = await createProject({
    orgId: org.id,
    name: input.name,
    phase,
    assignmentId,
  });

  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/c/${orgSlug}/admin`);
  revalidatePath(`/c/${orgSlug}`);
  return { ok: true, data: { id: res.project.id, slug: res.project.slug } };
}
