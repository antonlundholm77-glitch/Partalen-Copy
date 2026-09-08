"use server";

// Server actions för /intern/bibliotek.
// RLS = gf_is_platform_admin(). Storage-uppladdning sker via service-role
// signed-URLs så klienten kan PUT-a direkt utan att stryka cookies.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const BUCKET = "gf-library-docs";

// =========================================================================
// DOKUMENT
// =========================================================================

interface CreateDocInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  statusId?: string | null;
  ownerUserId?: string | null;
  tags?: string[];
  storagePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export async function createLibraryDocument(
  input: CreateDocInput,
): Promise<ActionResult<{ id: string }>> {
  if (!input.title?.trim()) return { ok: false, error: "Titel krävs" };

  const supabase = (await createClient()) as AnySupabase;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id as string | undefined;
  if (!uid) return { ok: false, error: "Ej inloggad" };

  const { data, error } = await supabase
    .from("gf_library_documents")
    .insert({
      title: input.title.trim(),
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      status_id: input.statusId ?? "aktiv",
      owner_user_id: input.ownerUserId ?? uid,
      tags: input.tags ?? [],
      storage_path: input.storagePath ?? null,
      file_name: input.fileName ?? null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType ?? null,
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  return { ok: true, data: { id: (data as { id: string }).id } };
}

interface UpdateDocInput {
  id: string;
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  statusId?: string | null;
  ownerUserId?: string | null;
  tags?: string[];
}

export async function updateLibraryDocument(
  input: UpdateDocInput,
): Promise<ActionResult> {
  if (!input.id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id as string | undefined;
  if (!uid) return { ok: false, error: "Ej inloggad" };

  const patch: Record<string, unknown> = { updated_by: uid };
  if (input.title !== undefined) {
    if (!input.title.trim()) return { ok: false, error: "Titel kan inte vara tom" };
    patch.title = input.title.trim();
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.statusId !== undefined) patch.status_id = input.statusId;
  if (input.ownerUserId !== undefined) patch.owner_user_id = input.ownerUserId;
  if (input.tags !== undefined) patch.tags = input.tags;

  const { error } = await supabase
    .from("gf_library_documents")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  return { ok: true };
}

export async function deleteLibraryDocument(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;

  // Hämta storage_path innan vi raderar raden, så vi kan städa storage-objektet.
  const { data: doc } = await supabase
    .from("gf_library_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("gf_library_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  const storagePath = (doc as { storage_path: string | null } | null)?.storage_path;
  if (storagePath) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (rmErr) console.warn("storage remove warning:", rmErr.message);
  }

  revalidatePath("/intern/bibliotek");
  return { ok: true };
}

// =========================================================================
// UPPLADDNING
// =========================================================================

// Skapa en signerad upload-URL. Klienten PUT-ar filen direkt mot Supabase
// Storage; sedan skapar vi dokument-raden via createLibraryDocument().
// Path: <document_uuid>/<sanerat_filnamn>. Vi genererar UUID:n här.
export async function createUploadUrl(
  fileName: string,
): Promise<ActionResult<{ documentId: string; path: string; token: string }>> {
  if (!fileName) return { ok: false, error: "filnamn krävs" };
  const supabase = (await createClient()) as AnySupabase;

  const documentId = crypto.randomUUID();
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 200);
  const path = `${documentId}/${safe}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: {
      documentId,
      path,
      token: (data as { token: string }).token,
    },
  };
}

// Skapa en kortlivad nedladdnings-URL (signed) för en fil.
export async function createDownloadUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  if (!storagePath) return { ok: false, error: "storage_path krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1h
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { url: (data as { signedUrl: string }).signedUrl } };
}

// =========================================================================
// KATEGORIER (CRUD)
// =========================================================================

interface UpsertCategoryInput {
  id: string;
  label: string;
  sortOrder?: number;
  active?: boolean;
}

export async function upsertCategory(input: UpsertCategoryInput): Promise<ActionResult> {
  if (!input.id?.trim()) return { ok: false, error: "id krävs" };
  if (!input.label?.trim()) return { ok: false, error: "label krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_doc_categories").upsert({
    id: input.id.trim(),
    label: input.label.trim(),
    sort_order: input.sortOrder ?? 0,
    active: input.active ?? true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  revalidatePath("/intern/bibliotek/admin");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_doc_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  revalidatePath("/intern/bibliotek/admin");
  return { ok: true };
}

// =========================================================================
// STATUSAR (CRUD)
// =========================================================================

interface UpsertStatusInput {
  id: string;
  label: string;
  sortOrder?: number;
  active?: boolean;
  isTerminal?: boolean;
}

export async function upsertStatus(input: UpsertStatusInput): Promise<ActionResult> {
  if (!input.id?.trim()) return { ok: false, error: "id krävs" };
  if (!input.label?.trim()) return { ok: false, error: "label krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_doc_statuses").upsert({
    id: input.id.trim(),
    label: input.label.trim(),
    sort_order: input.sortOrder ?? 0,
    active: input.active ?? true,
    is_terminal: input.isTerminal ?? false,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  revalidatePath("/intern/bibliotek/admin");
  return { ok: true };
}

export async function deleteStatus(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "id krävs" };
  const supabase = (await createClient()) as AnySupabase;
  const { error } = await supabase.from("gf_doc_statuses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/intern/bibliotek");
  revalidatePath("/intern/bibliotek/admin");
  return { ok: true };
}
