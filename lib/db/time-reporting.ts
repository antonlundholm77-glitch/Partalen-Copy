// DB-fetchers för /intern/resurser/utfort (egen tidrapportering).
// RLS gör att authenticated användare bara ser sina egna rader; plattformsadmin
// ser allt. Den här filen anropas alltid med "min egen tid" som scope.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface DbTimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  activity: string;
  entry_date: string; // YYYY-MM-DD
  hours: number;
  note: string | null;
  status: "draft" | "submitted" | "locked";
}

// Hämta mina egna tidrapporter inom ett datumintervall (inkl. båda ändar).
// from/to är YYYY-MM-DD-strängar.
export async function fetchMyTimeEntries(
  fromDate: string,
  toDate: string,
): Promise<DbTimeEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gf_time_entries")
    .select("*")
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate)
    .order("entry_date");
  if (error) {
    console.error("fetchMyTimeEntries:", error.message);
    return [];
  }
  return (data ?? []) as DbTimeEntry[];
}

// Hämta information om den inloggade användarens resurs-koppling. Returnerar
// null om användaren inte har en koppling — då kan UI:n visa ett "kontakta
// admin"-meddelande istället för en tom veckogrid.
export interface MyResourceProfile {
  resource_id: string;
  name: string;
  employment_type: "employee" | "consultant";
  capacity_hours_per_week: number;
}

// Protokoll-avvikelse: Database-typen täcker inte gf_resources med
// employment_type/user_id än (samma anledning som resource-allocations.ts).
// Cast till any tills `supabase gen types` körs efter migration 0021.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResourceRow = any;

export const fetchMyResourceProfile = cache(
  async (): Promise<MyResourceProfile | null> => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("gf_resources")
      .select("id, name, employment_type, capacity_hours_per_week")
      .eq("user_id", uid)
      .eq("active", true)
      .maybeSingle();
    if (error) {
      console.error("fetchMyResourceProfile:", error.message);
      return null;
    }
    if (!data) return null;
    const row = data as ResourceRow;
    return {
      resource_id: row.id,
      name: row.name,
      employment_type: row.employment_type as "employee" | "consultant",
      capacity_hours_per_week: Number(row.capacity_hours_per_week),
    };
  },
);

// Tunn projektlista för select-meny i tidrapport — bara projekt + org-slug
// så medarbetaren kan välja "[org] — [projekt]" från en dropdown.
export interface TimeProjectOption {
  id: string;
  orgSlug: string;
  orgName: string;
  projectSlug: string;
  projectName: string;
  label: string; // "[Org] — [Projekt]" för dropdown
}

interface ProjectJoinRow {
  id: string;
  slug: string | null;
  name: string;
  gf_organizations:
    | { slug: string | null; name: string }
    | { slug: string | null; name: string }[]
    | null;
}

export const fetchTimeProjectOptions = cache(
  async (): Promise<TimeProjectOption[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gf_projects")
      .select("id, slug, name, gf_organizations!inner(slug, name)")
      .order("name");
    if (error) {
      console.error("fetchTimeProjectOptions:", error.message);
      return [];
    }
    const rows = (data ?? []) as ProjectJoinRow[];
    return rows
      .map((r) => {
        const org = Array.isArray(r.gf_organizations)
          ? r.gf_organizations[0]
          : r.gf_organizations;
        const orgSlug = org?.slug ?? null;
        const orgName = org?.name ?? "";
        if (!orgSlug || !r.slug) return null;
        return {
          id: r.id,
          orgSlug,
          orgName,
          projectSlug: r.slug,
          projectName: r.name,
          label: `${orgName} — ${r.name}`,
        };
      })
      .filter((r): r is TimeProjectOption => r !== null);
  },
);
