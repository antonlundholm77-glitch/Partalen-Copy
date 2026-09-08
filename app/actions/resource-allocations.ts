"use server";

// Server actions för /intern/resursplanering.
// gf_resource_allocations har unique-constraint på
// (resource_id, project_id, iso_year, iso_week) — vi upsertar mot den
// när timmar > 0 och raderar raden när timmar = 0. RLS = plattformsadmin.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AllocationActionResult =
  | { ok: true }
  | { ok: false; error: string };

// Protokoll-avvikelse: Database-typen i lib/types täcker inte
// gf_resource_allocations med rätt Insert-shape. Cast till any tills
// `supabase gen types` körs. RLS skyddar runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

interface SetAllocationInput {
  resourceId: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  hours: number;
}

export async function setAllocation(
  input: SetAllocationInput,
): Promise<AllocationActionResult> {
  const { resourceId, projectId, isoYear, isoWeek, hours } = input;

  if (!resourceId || !projectId) {
    return { ok: false, error: "resourceId och projectId krävs." };
  }
  if (!Number.isInteger(isoYear) || isoYear < 2020 || isoYear > 2100) {
    return { ok: false, error: `Ogiltigt iso_year: ${isoYear}` };
  }
  if (!Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    return { ok: false, error: `Ogiltigt iso_week: ${isoWeek}` };
  }
  if (!Number.isFinite(hours) || hours < 0) {
    return { ok: false, error: `Ogiltigt hours: ${hours}` };
  }

  const supabase = (await createClient()) as AnySupabase;

  if (hours === 0) {
    const { error } = await supabase
      .from("gf_resource_allocations")
      .delete()
      .eq("resource_id", resourceId)
      .eq("project_id", projectId)
      .eq("iso_year", isoYear)
      .eq("iso_week", isoWeek);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("gf_resource_allocations")
      .upsert(
        {
          resource_id: resourceId,
          project_id: projectId,
          iso_year: isoYear,
          iso_week: isoWeek,
          hours,
        },
        { onConflict: "resource_id,project_id,iso_year,iso_week" },
      );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/intern/resurser/planerat");
  return { ok: true };
}

// Bulk-radera alla allokeringar för (resource, project) — används när
// en resurs tas bort från ett uppdrag i UI:n.
export async function clearAllocationsFor(
  resourceId: string,
  projectId: string,
): Promise<AllocationActionResult> {
  if (!resourceId || !projectId) {
    return { ok: false, error: "resourceId och projectId krävs." };
  }
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase
    .from("gf_resource_allocations")
    .delete()
    .eq("resource_id", resourceId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/resurser/planerat");
  return { ok: true };
}
