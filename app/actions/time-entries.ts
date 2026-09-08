"use server";

// Server actions för /intern/resurser/utfort.
// RLS säkrar att authenticated bara skriver mot sina egna rader (user_id =
// auth.uid()). UI:n skickar in row-data; vi sätter user_id från sessionen
// och persisterar mot gf_time_entries.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/time-reporting";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type TimeActionResult = { ok: true } | { ok: false; error: string };

interface UpsertEntryInput {
  id?: string; // om satt = update; annars insert
  projectId: string | null;
  activity: ActivityKey;
  entryDate: string; // YYYY-MM-DD
  hours: number;
  note?: string | null;
}

function validate(input: UpsertEntryInput): string | null {
  if (!ACTIVITY_KEYS.includes(input.activity)) return `Ogiltig aktivitet: ${input.activity}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) return `Ogiltigt datum: ${input.entryDate}`;
  if (!Number.isFinite(input.hours) || input.hours <= 0 || input.hours > 24) {
    return `Ogiltigt timantal: ${input.hours}`;
  }
  // Frånvaro och internt får ha null project_id; övriga kräver projekt.
  const requiresProject = !["franvaro", "internt"].includes(input.activity);
  if (requiresProject && !input.projectId) {
    return "Aktiviteten kräver projekt.";
  }
  return null;
}

export async function upsertTimeEntry(input: UpsertEntryInput): Promise<TimeActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = (await createClient()) as AnySupabase;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id as string | undefined;
  if (!uid) return { ok: false, error: "Ej inloggad" };

  const row = {
    user_id: uid,
    project_id: input.projectId,
    activity: input.activity,
    entry_date: input.entryDate,
    hours: input.hours,
    note: input.note ?? null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("gf_time_entries")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", uid); // belt-and-braces utöver RLS
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("gf_time_entries").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/intern/resurser/utfort");
  return { ok: true };
}

export async function deleteTimeEntry(id: string): Promise<TimeActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id as string | undefined;
  if (!uid) return { ok: false, error: "Ej inloggad" };

  const { error } = await supabase
    .from("gf_time_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/resurser/utfort");
  return { ok: true };
}

// Batch-upsert för "spara hela veckan"-knapp i UI:n. Anropas med en lista av
// rader (befintliga + nya); rader med hours=0 raderas, övriga upsertas.
export async function saveTimeEntriesBatch(
  entries: (UpsertEntryInput & { id?: string })[],
): Promise<TimeActionResult> {
  for (const e of entries) {
    if (e.hours === 0 && e.id) {
      const r = await deleteTimeEntry(e.id);
      if (!r.ok) return r;
      continue;
    }
    if (e.hours > 0) {
      const r = await upsertTimeEntry(e);
      if (!r.ok) return r;
    }
  }
  revalidatePath("/intern/resurser/utfort");
  return { ok: true };
}
