// Org-CRUD-helpers ovanpå Supabase (gf_organizations). RLS = platform-admin
// only (policy org_admin_all i 0002_access.sql), så endast plattformsadmin
// kan skapa/redigera kunder.

import { createClient } from "@/lib/supabase/server";

const ORG_KINDS = ["entreprenad"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export function isOrgKind(value: string): value is OrgKind {
  return (ORG_KINDS as readonly string[]).includes(value);
}

export interface DbCustomer {
  id: string;
  name: string;
  slug: string;
  kind: OrgKind;
  unit_noun: string;
  unit_noun_plural: string;
  created_at: string;
}

type OrgRow = {
  id: string;
  name: string;
  slug: string | null;
  kind: string;
  unit_noun: string;
  unit_noun_plural: string;
  created_at: string;
};

// Återanvänder samma slug-logik som projects.ts. Inlinad här för att hålla
// modulen oberoende — det är bara två rader.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function listCustomers(): Promise<DbCustomer[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("gf_organizations")
    .select("id, name, slug, kind, unit_noun, unit_noun_plural, created_at")
    .order("name");
  const rows = (res.data ?? []) as OrgRow[];
  return rows
    .filter((r) => r.slug != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug as string,
      kind: "entreprenad" as OrgKind,
      unit_noun: r.unit_noun,
      unit_noun_plural: r.unit_noun_plural,
      created_at: r.created_at,
    }));
}

export interface CreateCustomerInput {
  name: string;
  slug?: string;
  kind: OrgKind;
  unit_noun?: string;
  unit_noun_plural?: string;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<{ ok: true; customer: DbCustomer } | { ok: false; error: string }> {
  const supabase = await createClient();
  const name = input.name.trim();
  if (name.length === 0) return { ok: false, error: "Namn krävs." };

  const desiredSlug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || "kund";

  // Slug måste vara unik (UNIQUE-constraint på gf_organizations.slug).
  const existing = await supabase
    .from("gf_organizations")
    .select("id")
    .eq("slug", desiredSlug)
    .maybeSingle();
  if (existing.data) {
    return { ok: false, error: `Slug "${desiredSlug}" är redan tagen.` };
  }

  const defaultNoun = "projekt";
  const defaultNounPlural = "Projekt";

  const payload = {
    name,
    slug: desiredSlug,
    kind: input.kind,
    unit_noun: input.unit_noun?.trim() || defaultNoun,
    unit_noun_plural: input.unit_noun_plural?.trim() || defaultNounPlural,
  };

  const res = await supabase
    .from("gf_organizations")
    .insert(payload as never)
    .select("id, name, slug, kind, unit_noun, unit_noun_plural, created_at")
    .single();

  if (res.error) return { ok: false, error: res.error.message };
  const row = res.data as OrgRow;
  return {
    ok: true,
    customer: {
      id: row.id,
      name: row.name,
      slug: row.slug ?? desiredSlug,
      kind: "entreprenad" as OrgKind,
      unit_noun: row.unit_noun,
      unit_noun_plural: row.unit_noun_plural,
      created_at: row.created_at,
    },
  };
}

export interface CustomerPatch {
  name?: string;
  kind?: OrgKind;
  unit_noun?: string;
  unit_noun_plural?: string;
}

export async function updateCustomer(
  orgId: string,
  patch: CustomerPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.name != null) update.name = patch.name.trim();
  if (patch.kind != null) update.kind = patch.kind;
  if (patch.unit_noun != null) update.unit_noun = patch.unit_noun.trim();
  if (patch.unit_noun_plural != null) update.unit_noun_plural = patch.unit_noun_plural.trim();

  if (Object.keys(update).length === 0) return { ok: true };

  const res = await supabase
    .from("gf_organizations")
    .update(update as never)
    .eq("id", orgId);
  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}
