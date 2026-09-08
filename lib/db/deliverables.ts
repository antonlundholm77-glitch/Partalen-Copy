// DB-helpers för leverabel-modellen (pm_disciplines + pm_phases + pm_deliverables).
// RLS skyddar via gf_can_access_unit på project_id — vi behöver inga extra checks.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface PmDiscipline {
  id: string;
  code: string;
  name: string;
  color: string | null;
  sort_order: number;
  // Rich-data från migration 0015 — visas på Teknik-vyn.
  description: string | null;
  status: string;
  progress: number;
  phase_id: string | null;
  key_components: string[] | null;
  integration_points: string[] | null;
  responsible_team: string | null;
  target_date: string | null;
  icon_name: string | null;
}

export interface PmPhase {
  id: string;
  stage: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  completion_date: string | null;
  key_activities: string[] | null;
  sort_order: number;
}

export interface PmDeliverable {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase_id: string | null;
  discipline_id: string | null;
  status: string;
  format: string | null;
  information_content: string[] | null;
  responsible: string | null;
  due_date: string | null;
  building: string | null;
  sort_order: number;
}

export interface PmDeliverableWithJoins extends PmDeliverable {
  phase: PmPhase | null;
  discipline: PmDiscipline | null;
}

export const dbDisciplines = cache(async (projectId: string): Promise<PmDiscipline[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_disciplines")
    .select(
      "id, code, name, color, sort_order, description, status, progress, phase_id, key_components, integration_points, responsible_team, target_date, icon_name",
    )
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmDiscipline[];
});

export const dbPhases = cache(async (projectId: string): Promise<PmPhase[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_phases")
    .select("id, stage, name, description, status, progress, completion_date, key_activities, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmPhase[];
});

export const dbDeliverables = cache(
  async (projectId: string): Promise<PmDeliverableWithJoins[]> => {
    const supabase = await createClient();
    const [delRes, phases, disciplines] = await Promise.all([
      supabase
        .from("pm_deliverables")
        .select(
          "id, code, name, description, phase_id, discipline_id, status, format, information_content, responsible, due_date, building, sort_order",
        )
        .eq("project_id", projectId)
        .order("sort_order"),
      dbPhases(projectId),
      dbDisciplines(projectId),
    ]);
    const phasesById = new Map(phases.map((p) => [p.id, p]));
    const discById = new Map(disciplines.map((d) => [d.id, d]));
    return ((delRes.data ?? []) as PmDeliverable[]).map((d) => ({
      ...d,
      phase: d.phase_id ? phasesById.get(d.phase_id) ?? null : null,
      discipline: d.discipline_id ? discById.get(d.discipline_id) ?? null : null,
    }));
  },
);

export const dbDeliverableByCode = cache(
  async (projectId: string, code: string): Promise<PmDeliverableWithJoins | null> => {
    const all = await dbDeliverables(projectId);
    return all.find((d) => d.code === code) ?? null;
  },
);
