import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface DbAssignment {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  operator: string | null;
  status: "draft" | "active" | "inactive";
}

export interface DbAssignmentWithProjects extends DbAssignment {
  projects: { id: string; slug: string; name: string; status: string }[];
}

export interface OrgWithAssignments {
  orgId: string;
  orgSlug: string;
  orgName: string;
  unit_noun: string;
  unit_noun_plural: string;
  assignments: DbAssignmentWithProjects[];
}

type AssignmentRow = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  operator: string | null;
  status: string;
};

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string;
  assignment_id: string | null;
  status: string;
  org_id?: string;
};

export const assignmentsByOrgSlug = cache(
  async (orgSlug: string): Promise<DbAssignmentWithProjects[]> => {
    const supabase = await createClient();

    const orgRes = await supabase
      .from("gf_organizations")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();
    const org = orgRes.data as { id: string } | null;
    if (!org) return [];

    const [assignRes, projRes] = await Promise.all([
      supabase
        .from("gf_assignments")
        .select("id, org_id, title, description, operator, status")
        .eq("org_id", org.id)
        .order("title"),
      supabase
        .from("gf_projects")
        .select("id, slug, name, assignment_id, status")
        .eq("org_id", org.id)
        .not("assignment_id", "is", null),
    ]);

    const assignments = (assignRes.data ?? []) as AssignmentRow[];
    const projects = ((projRes.data ?? []) as ProjectRow[]).filter(
      (p) => p.slug != null && p.assignment_id != null,
    );

    const projByAssignment = new Map<
      string,
      { id: string; slug: string; name: string; status: string }[]
    >();
    for (const p of projects) {
      const key = p.assignment_id as string;
      const arr = projByAssignment.get(key) ?? [];
      arr.push({ id: p.id, slug: p.slug as string, name: p.name, status: p.status });
      projByAssignment.set(key, arr);
    }

    return assignments.map((a) => ({
      id: a.id,
      org_id: a.org_id,
      title: a.title,
      description: a.description,
      operator: a.operator,
      status: a.status as DbAssignment["status"],
      projects: projByAssignment.get(a.id) ?? [],
    }));
  },
);

export async function listAllAssignments(): Promise<OrgWithAssignments[]> {
  const supabase = await createClient();

  const orgsRes = await supabase
    .from("gf_organizations")
    .select("id, slug, name, unit_noun, unit_noun_plural")
    .order("name");
  const orgs = ((orgsRes.data ?? []) as {
    id: string;
    slug: string | null;
    name: string;
    unit_noun: string;
    unit_noun_plural: string;
  }[]).filter((o) => o.slug != null);
  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  const [assignRes, projRes] = await Promise.all([
    supabase
      .from("gf_assignments")
      .select("id, org_id, title, description, operator, status")
      .in("org_id", orgIds)
      .order("title"),
    supabase
      .from("gf_projects")
      .select("id, slug, name, assignment_id, org_id, status")
      .in("org_id", orgIds)
      .not("assignment_id", "is", null),
  ]);

  const assignments = (assignRes.data ?? []) as AssignmentRow[];
  const projects = ((projRes.data ?? []) as ProjectRow[]).filter(
    (p) => p.slug != null && p.assignment_id != null,
  );

  const projByAssignment = new Map<
    string,
    { id: string; slug: string; name: string; status: string }[]
  >();
  for (const p of projects) {
    const key = p.assignment_id as string;
    const arr = projByAssignment.get(key) ?? [];
    arr.push({ id: p.id, slug: p.slug as string, name: p.name, status: p.status });
    projByAssignment.set(key, arr);
  }

  const assignByOrg = new Map<string, DbAssignmentWithProjects[]>();
  for (const a of assignments) {
    const arr = assignByOrg.get(a.org_id) ?? [];
    arr.push({
      id: a.id,
      org_id: a.org_id,
      title: a.title,
      description: a.description,
      operator: a.operator,
      status: a.status as DbAssignment["status"],
      projects: projByAssignment.get(a.id) ?? [],
    });
    assignByOrg.set(a.org_id, arr);
  }

  return orgs.map((o) => ({
    orgId: o.id,
    orgSlug: o.slug as string,
    orgName: o.name,
    unit_noun: o.unit_noun,
    unit_noun_plural: o.unit_noun_plural,
    assignments: assignByOrg.get(o.id) ?? [],
  }));
}

export async function createAssignment(input: {
  orgId: string;
  title: string;
  description?: string | null;
  operator?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Titel krävs." };

  const supabase = await createClient();
  const res = await supabase
    .from("gf_assignments")
    .insert({
      org_id: input.orgId,
      title,
      description: input.description?.trim() || null,
      operator: input.operator?.trim() || null,
      status: "draft",
    } as never)
    .select("id")
    .single();

  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true, id: (res.data as { id: string }).id };
}

export async function updateAssignment(
  assignmentId: string,
  patch: { title?: string; description?: string | null; operator?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title != null) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.operator !== undefined) update.operator = patch.operator?.trim() || null;

  const res = await supabase
    .from("gf_assignments")
    .update(update as never)
    .eq("id", assignmentId);

  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}

export async function setAssignmentStatus(
  assignmentId: string,
  status: "draft" | "active" | "inactive",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_assignments")
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id", assignmentId);

  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}
