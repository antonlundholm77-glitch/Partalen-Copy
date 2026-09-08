"use server";

// Server actions för /intern/team. RLS = gf_is_platform_admin().

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const AVATAR_BUCKET = "gf-team-avatars";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// =========================================================================
// PROFIL
// =========================================================================

interface UpdateProfileInput {
  id: string;
  name?: string;
  title?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  skills?: string[];
  languages?: string[];
  start_year?: number | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  if (!input.id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Namn kan inte vara tomt" };
    patch.name = input.name.trim();
  }
  if (input.title !== undefined) patch.title = input.title;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.linkedin_url !== undefined) patch.linkedin_url = input.linkedin_url;
  if (input.skills !== undefined) patch.skills = input.skills;
  if (input.languages !== undefined) patch.languages = input.languages;
  if (input.start_year !== undefined) patch.start_year = input.start_year;

  const { error } = await supabase.from("gf_resources").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/intern/team");
  revalidatePath(`/intern/team/${input.id}`);
  return { ok: true };
}

// =========================================================================
// AVATAR-UPLOAD
// =========================================================================

export async function createAvatarUploadUrl(
  resourceId: string,
  fileName: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  if (!resourceId || !fileName) return { ok: false, error: "saknade argument" };
  const supabase = (await createClient()) as AnySupabase;
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const path = `${resourceId}/${Date.now()}_${safe}`;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(path);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: { path, token: (data as { token: string }).token },
  };
}

export async function setAvatarPath(
  resourceId: string,
  path: string | null,
): Promise<ActionResult> {
  if (!resourceId) return { ok: false, error: "resourceId krävs" };
  const supabase = (await createClient()) as AnySupabase;

  // Hämta tidigare path så vi kan städa det gamla objektet.
  const { data: existing } = await supabase
    .from("gf_resources")
    .select("avatar_path")
    .eq("id", resourceId)
    .maybeSingle();
  const oldPath = (existing as { avatar_path: string | null } | null)?.avatar_path;

  const { error } = await supabase
    .from("gf_resources")
    .update({ avatar_path: path })
    .eq("id", resourceId);
  if (error) return { ok: false, error: error.message };

  if (oldPath && oldPath !== path) {
    const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
    if (rmErr) console.warn("avatar remove warning:", rmErr.message);
  }

  revalidatePath("/intern/team");
  revalidatePath(`/intern/team/${resourceId}`);
  return { ok: true };
}

// =========================================================================
// UTBILDNING (CRUD)
// =========================================================================

interface EducationInput {
  id?: string;
  resourceId: string;
  institution: string;
  degree?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  sortOrder?: number;
}

export async function upsertEducation(input: EducationInput): Promise<ActionResult> {
  if (!input.resourceId || !input.institution?.trim()) {
    return { ok: false, error: "resourceId och institution krävs" };
  }
  const supabase = (await createClient()) as AnySupabase;
  const row = {
    ...(input.id && { id: input.id }),
    resource_id: input.resourceId,
    institution: input.institution.trim(),
    degree: input.degree ?? null,
    year_from: input.yearFrom ?? null,
    year_to: input.yearTo ?? null,
    sort_order: input.sortOrder ?? 0,
  };
  const { error } = await supabase.from("gf_team_education").upsert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${input.resourceId}`);
  return { ok: true };
}

export async function deleteEducation(id: string, resourceId: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_team_education").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${resourceId}`);
  return { ok: true };
}

// =========================================================================
// CERTIFIERING (CRUD)
// =========================================================================

interface CertificationInput {
  id?: string;
  resourceId: string;
  name: string;
  issuer?: string | null;
  issuedYear?: number | null;
  expiresYear?: number | null;
  sortOrder?: number;
}

export async function upsertCertification(
  input: CertificationInput,
): Promise<ActionResult> {
  if (!input.resourceId || !input.name?.trim()) {
    return { ok: false, error: "resourceId och namn krävs" };
  }
  const supabase = (await createClient()) as AnySupabase;
  const row = {
    ...(input.id && { id: input.id }),
    resource_id: input.resourceId,
    name: input.name.trim(),
    issuer: input.issuer ?? null,
    issued_year: input.issuedYear ?? null,
    expires_year: input.expiresYear ?? null,
    sort_order: input.sortOrder ?? 0,
  };
  const { error } = await supabase.from("gf_team_certifications").upsert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${input.resourceId}`);
  return { ok: true };
}

export async function deleteCertification(
  id: string,
  resourceId: string,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_team_certifications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${resourceId}`);
  return { ok: true };
}

// =========================================================================
// REFERENSUPPDRAG (CRUD)
// =========================================================================

interface ExperienceInput {
  id?: string;
  resourceId: string;
  projectId?: string | null;
  externalProjectName?: string | null;
  externalClientName?: string | null;
  role?: string | null;
  description?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  sortOrder?: number;
}

export async function upsertExperience(input: ExperienceInput): Promise<ActionResult> {
  if (!input.resourceId) return { ok: false, error: "resourceId krävs" };
  if (!input.projectId && !input.externalProjectName?.trim()) {
    return { ok: false, error: "Välj ett projekt eller fyll i externt projektnamn" };
  }
  const supabase = (await createClient()) as AnySupabase;
  const row = {
    ...(input.id && { id: input.id }),
    resource_id: input.resourceId,
    project_id: input.projectId ?? null,
    external_project_name: input.projectId ? null : input.externalProjectName?.trim() ?? null,
    external_client_name: input.projectId ? null : input.externalClientName ?? null,
    role: input.role ?? null,
    description: input.description ?? null,
    year_from: input.yearFrom ?? null,
    year_to: input.yearTo ?? null,
    sort_order: input.sortOrder ?? 0,
  };
  const { error } = await supabase.from("gf_team_experiences").upsert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${input.resourceId}`);
  return { ok: true };
}

export async function deleteExperience(
  id: string,
  resourceId: string,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_team_experiences").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/intern/team/${resourceId}`);
  return { ok: true };
}
