import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface CanvasRow {
  id: string;
  title: string;
  state: { nodes: unknown[]; edges: unknown[] };
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasSummary {
  id: string;
  title: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  state: { nodes: unknown[]; edges: unknown[] };
}

export const dbCanvases = cache(async (): Promise<CanvasSummary[]> => {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any)
    .from("gf_canvases")
    .select("id, title, project_id, created_by, created_at, updated_at, state")
    .is("project_id", null)
    .order("updated_at", { ascending: false });

  const rows: Array<{
    id: string;
    title: string;
    project_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    state: { nodes: unknown[]; edges: unknown[] };
  }> = res.data ?? [];

  if (rows.length === 0) return [];

  const creatorIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];

  const profileRows: Array<{ user_id: string; full_name: string | null; email: string | null }> =
    creatorIds.length > 0
      ? ((await supabase.from("gf_profiles").select("user_id, full_name, email").in("user_id", creatorIds)).data ?? [])
      : [];

  const profiles = Object.fromEntries(
    profileRows.map((p) => [p.user_id, p.full_name ?? p.email ?? null]),
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    project_id: r.project_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    creator_name: r.created_by ? (profiles[r.created_by] ?? null) : null,
    state: r.state ?? { nodes: [], edges: [] },
  }));
});

export const dbCanvas = cache(async (id: string): Promise<CanvasRow | null> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any)
    .from("gf_canvases")
    .select("id, title, state, project_id, created_by, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (res.data ?? null) as CanvasRow | null;
});
