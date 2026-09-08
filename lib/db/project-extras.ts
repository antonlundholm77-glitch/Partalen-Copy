// DB-helpers för projektets utökade tabeller:
// pm_stakeholders, pm_restrictions, pm_penalties, pm_contract_deviations,
// pm_quantity_items. RLS skyddar via gf_can_access_unit på project_id.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface PmStakeholder {
  id: string;
  category: string;
  name: string;
  organization: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sort_order: number;
}

export interface PmRestriction {
  id: string;
  category: string;
  title: string;
  description: string | null;
  period: string | null;
  severity: string;
  sort_order: number;
}

export interface PmPenalty {
  id: string;
  kind: string;
  category: string | null;
  title: string;
  description: string | null;
  amount: number | null;
  unit: string | null;
  cap: number | null;
  conditions: string | null;
  sort_order: number;
}

export interface PmContractDeviation {
  id: string;
  section: string | null;
  title: string;
  original_text: string | null;
  modified_text: string | null;
  reason: string | null;
  sort_order: number;
}

export interface PmQuantityItem {
  id: string;
  ama_code: string | null;
  sub_code: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  discipline_id: string | null;
  section: string | null;
  sort_order: number;
}

export const dbStakeholders = cache(async (projectId: string): Promise<PmStakeholder[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_stakeholders")
    .select("id, category, name, organization, role, email, phone, notes, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmStakeholder[];
});

export const dbRestrictions = cache(async (projectId: string): Promise<PmRestriction[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_restrictions")
    .select("id, category, title, description, period, severity, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmRestriction[];
});

export const dbPenalties = cache(async (projectId: string): Promise<PmPenalty[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_penalties")
    .select("id, kind, category, title, description, amount, unit, cap, conditions, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmPenalty[];
});

export const dbContractDeviations = cache(
  async (projectId: string): Promise<PmContractDeviation[]> => {
    const supabase = await createClient();
    const res = await supabase
      .from("pm_contract_deviations")
      .select("id, section, title, original_text, modified_text, reason, sort_order")
      .eq("project_id", projectId)
      .order("sort_order");
    return (res.data ?? []) as PmContractDeviation[];
  },
);

export const dbQuantityItems = cache(async (projectId: string): Promise<PmQuantityItem[]> => {
  const supabase = await createClient();
  const res = await supabase
    .from("pm_quantity_items")
    .select(
      "id, ama_code, sub_code, description, unit, quantity, unit_price, total, discipline_id, section, sort_order",
    )
    .eq("project_id", projectId)
    .order("sort_order");
  return (res.data ?? []) as PmQuantityItem[];
});
