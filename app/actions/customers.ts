"use server";

// Server actions för kund-CRUD. RLS = platform-admin only.

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  updateCustomer,
  isOrgKind,
  type CustomerPatch,
} from "@/lib/db/customers";

export type CustomerActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

export interface CreateCustomerActionInput {
  name: string;
  slug?: string;
  kind: string;
  unit_noun?: string;
  unit_noun_plural?: string;
}

export async function createCustomerAction(
  input: CreateCustomerActionInput,
): Promise<CustomerActionResult> {
  if (!isOrgKind(input.kind)) return { ok: false, error: `Ogiltig kundtyp: ${input.kind}.` };

  const res = await createCustomer({
    name: input.name,
    slug: input.slug,
    kind: input.kind,
    unit_noun: input.unit_noun,
    unit_noun_plural: input.unit_noun_plural,
  });

  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/intern/kunder");
  revalidatePath("/");
  return { ok: true, data: { id: res.customer.id, slug: res.customer.slug } };
}

export interface UpdateCustomerActionInput {
  name?: string;
  kind?: string;
  unit_noun?: string;
  unit_noun_plural?: string;
}

export async function updateCustomerAction(
  orgId: string,
  input: UpdateCustomerActionInput,
): Promise<CustomerActionResult> {
  const patch: CustomerPatch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.kind !== undefined) {
    if (!isOrgKind(input.kind)) return { ok: false, error: `Ogiltig kundtyp: ${input.kind}.` };
    patch.kind = input.kind;
  }
  if (input.unit_noun !== undefined) patch.unit_noun = input.unit_noun;
  if (input.unit_noun_plural !== undefined) patch.unit_noun_plural = input.unit_noun_plural;

  const res = await updateCustomer(orgId, patch);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/intern/kunder");
  revalidatePath(`/c/${orgId}`);
  return { ok: true };
}
