// DB-fetchers för /intern/resursplanering (intern resursvy, plattformsadmin).
// RLS gör att bara plattformsadmin får läsa — anonyma/icke-admin får tom array.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface DbResource {
  id: string;
  name: string;
  role: string | null;
  capacity_hours_per_week: number;
  active: boolean;
  sort_order: number;
}

export interface DbAllocation {
  id: string;
  resource_id: string;
  project_id: string;
  iso_year: number;
  iso_week: number;
  hours: number;
  notes: string | null;
}

export const fetchResources = cache(async (): Promise<DbResource[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gf_resources")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) {
    console.error("fetchResources:", error.message);
    return [];
  }
  return (data ?? []) as DbResource[];
});

export const fetchAllocations = cache(async (): Promise<DbAllocation[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gf_resource_allocations")
    .select("*");
  if (error) {
    console.error("fetchAllocations:", error.message);
    return [];
  }
  return (data ?? []) as DbAllocation[];
});

// Lookup-tabell project_id ↔ "<orgSlug>/<projectSlug>" (= UI:ns unitKey).
// UI:n arbetar mot fixture-baserade unitKeys; DB lagrar uuid. Den här bron
// gör att DbAllocation → AllocMap-mappningen kan ske server-side.
export interface ProjectLookupRow {
  id: string; // uuid
  unitKey: string; // "<orgSlug>/<projectSlug>"
}

interface ProjectJoinRow {
  id: string;
  slug: string | null;
  gf_organizations: { slug: string | null } | { slug: string | null }[] | null;
}

export const fetchProjectLookup = cache(async (): Promise<ProjectLookupRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gf_projects")
    .select("id, slug, gf_organizations!inner(slug)");
  if (error) {
    console.error("fetchProjectLookup:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProjectJoinRow[];
  return rows
    .map((r) => {
      const org = Array.isArray(r.gf_organizations)
        ? r.gf_organizations[0]
        : r.gf_organizations;
      const orgSlug = org?.slug ?? null;
      if (!orgSlug || !r.slug) return null;
      return { id: r.id, unitKey: `${orgSlug}/${r.slug}` };
    })
    .filter((r): r is ProjectLookupRow => r !== null);
});
