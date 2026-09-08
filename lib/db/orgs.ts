// Slug → uuid-helpers för gf_organizations / gf_projects.
// URL:erna i appen identifierar orgs och projekt med slug (`/c/<org>/<projekt>`),
// men DB:n PK:ar på uuid. Två-stegs-lookup behövs i nästan alla queries och
// muteringar. React.cache → samma slug inom samma RSC-render → en query.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface DbOrg {
  id: string;
  slug: string;
  name: string;
  kind: "entreprenad";
  unit_noun: string;
  unit_noun_plural: string;
}

export interface DbProject {
  id: string;
  slug: string;
  name: string;
  org_id: string;
  phase: string;
  status: string;
  meta: string | null;
  program: string | null;
  has_data: boolean;
}

type OrgRow = {
  id: string;
  slug: string | null;
  name: string;
  kind: string;
  unit_noun: string;
  unit_noun_plural: string;
};

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string;
  org_id: string;
  phase: string;
  status: string;
  meta: string | null;
  program: string | null;
  has_data: boolean;
};

export const orgBySlug = cache(async (slug: string): Promise<DbOrg | null> => {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_organizations")
    .select("id, slug, name, kind, unit_noun, unit_noun_plural")
    .eq("slug", slug)
    .maybeSingle();
  const row = res.data as OrgRow | null;
  if (!row || !row.slug) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: "entreprenad" as DbOrg["kind"],
    unit_noun: row.unit_noun,
    unit_noun_plural: row.unit_noun_plural,
  };
});

export async function orgIdFromSlug(slug: string): Promise<string | null> {
  const org = await orgBySlug(slug);
  return org?.id ?? null;
}

export const projectBySlug = cache(
  async (orgSlug: string, projectSlug: string): Promise<DbProject | null> => {
    const org = await orgBySlug(orgSlug);
    if (!org) return null;
    const supabase = await createClient();
    const res = await supabase
      .from("gf_projects")
      .select("id, slug, name, org_id, phase, status, meta, program, has_data")
      .eq("org_id", org.id)
      .eq("slug", projectSlug)
      .maybeSingle();
    const row = res.data as ProjectRow | null;
    if (!row || !row.slug) return null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      org_id: row.org_id,
      phase: row.phase,
      status: row.status,
      meta: row.meta,
      program: row.program,
      has_data: row.has_data,
    };
  },
);

export async function projectIdFromSlugs(
  orgSlug: string,
  projectSlug: string,
): Promise<string | null> {
  const project = await projectBySlug(orgSlug, projectSlug);
  return project?.id ?? null;
}

// Header-switchers: kund-dropdown + projekt-dropdown. Filtrerade på de slugs
// inloggad användare har tillgång till (från getAccessContext()). RLS gör
// att en query utan filter ändå skulle returnera samma rader för
// icke-admin — vi filtrerar för att slippa onödig query och säkra ordningen.

export interface DbCustomerStub {
  id: string; // slug
  name: string;
}

export interface DbUnitGroup {
  id: string; // org slug
  name: string;
  kind: "entreprenad";
  unitNoun: string;
  unitNounPlural: string;
  units: { id: string; name: string }[]; // project slug + namn
}

export async function dbCustomerStubs(
  accessibleSlugs: string[],
): Promise<DbCustomerStub[]> {
  if (accessibleSlugs.length === 0) return [];
  const supabase = await createClient();
  const res = await supabase
    .from("gf_organizations")
    .select("slug, name")
    .in("slug", accessibleSlugs)
    .order("name");
  return ((res.data ?? []) as { slug: string | null; name: string }[])
    .filter((r) => r.slug != null)
    .map((r) => ({ id: r.slug as string, name: r.name }));
}

export async function dbUnitGroups(
  accessibleSlugs: string[],
): Promise<DbUnitGroup[]> {
  if (accessibleSlugs.length === 0) return [];
  const supabase = await createClient();

  const orgsRes = await supabase
    .from("gf_organizations")
    .select("id, slug, name, kind, unit_noun, unit_noun_plural")
    .in("slug", accessibleSlugs)
    .order("name");
  const orgs = ((orgsRes.data ?? []) as {
    id: string;
    slug: string | null;
    name: string;
    kind: string;
    unit_noun: string;
    unit_noun_plural: string;
  }[]).filter((o) => o.slug != null);

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);
  const projRes = await supabase
    .from("gf_projects")
    .select("org_id, slug, name")
    .in("org_id", orgIds)
    .order("name");
  const projects = ((projRes.data ?? []) as {
    org_id: string;
    slug: string | null;
    name: string;
  }[]).filter((p) => p.slug != null);

  const projectsByOrgId = new Map<string, { id: string; name: string }[]>();
  for (const p of projects) {
    const arr = projectsByOrgId.get(p.org_id) ?? [];
    arr.push({ id: p.slug as string, name: p.name });
    projectsByOrgId.set(p.org_id, arr);
  }

  return orgs.map((o) => ({
    id: o.slug as string,
    name: o.name,
    kind: "entreprenad" as DbUnitGroup["kind"],
    unitNoun: o.unit_noun,
    unitNounPlural: o.unit_noun_plural,
    units: projectsByOrgId.get(o.id) ?? [],
  }));
}

// Hela listan med projekt i en org — för admin-vyer och översikter.
export const projectsByOrgSlug = cache(async (orgSlug: string): Promise<DbProject[]> => {
  const org = await orgBySlug(orgSlug);
  if (!org) return [];
  const supabase = await createClient();
  const res = await supabase
    .from("gf_projects")
    .select("id, slug, name, org_id, phase, status, meta, program, has_data")
    .eq("org_id", org.id)
    .order("name");
  const rows = (res.data ?? []) as ProjectRow[];
  return rows
    .filter((r) => r.slug != null)
    .map((r) => ({
      id: r.id,
      slug: r.slug as string,
      name: r.name,
      org_id: r.org_id,
      phase: r.phase,
      status: r.status,
      meta: r.meta,
      program: r.program,
      has_data: r.has_data,
    }));
});
