"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// gf_canvases och gf_canvas_images är inte i Database-typen ännu.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function canvasDb() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any;
}

export async function createCanvas(title = "Ny canvas"): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = await canvasDb();
  const res = await db
    .from("gf_canvases")
    .insert({ title, created_by: user?.id ?? null })
    .select("id")
    .single();
  revalidatePath("/intern/canvas");
  return res.data as { id: string } | null;
}

export async function saveCanvasState(
  id: string,
  state: { nodes: unknown[]; edges: unknown[] },
): Promise<void> {
  const db = await canvasDb();
  await db.from("gf_canvases").update({ state }).eq("id", id);
}

export async function renameCanvas(id: string, title: string): Promise<void> {
  const db = await canvasDb();
  await db.from("gf_canvases").update({ title: title.trim() || "Ny canvas" }).eq("id", id);
  revalidatePath("/intern/canvas");
}

export async function deleteCanvas(id: string): Promise<void> {
  const db = await canvasDb();
  await db.from("gf_canvases").delete().eq("id", id);
  revalidatePath("/intern/canvas");
}

// Bilder lagras under "library/" — canvas-oberoende sökvägar.
export async function createImageUploadUrl(
  fileName: string,
): Promise<{ signedUrl: string; path: string } | null> {
  const supabase = await createClient();
  const path = `library/${Date.now()}-${fileName}`;
  const res = await supabase.storage.from("canvas-assets").createSignedUploadUrl(path);
  if (res.error || !res.data) return null;
  return { signedUrl: res.data.signedUrl, path };
}

export async function registerImageInLibrary(
  storagePath: string,
  fileName: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = await canvasDb();
  await db.from("gf_canvas_images").insert({
    storage_path: storagePath,
    file_name: fileName,
    created_by: user?.id ?? null,
  });
}

export interface LibraryImage {
  id: string;
  fileName: string;
  storagePath: string;
  signedUrl: string;
}

export async function getImageLibrary(): Promise<LibraryImage[]> {
  const supabase = await createClient();
  const db = await canvasDb();
  const res = await db
    .from("gf_canvas_images")
    .select("id, file_name, storage_path")
    .order("created_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Array<{ id: string; file_name: string; storage_path: string }> = res.data ?? [];
  if (rows.length === 0) return [];

  const paths = rows.map((r) => r.storage_path);
  const urlRes = await supabase.storage.from("canvas-assets").createSignedUrls(paths, 3600);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const urlMap: Record<string, string> = Object.fromEntries(
    (urlRes.data ?? [])
      .filter((u) => u.path && u.signedUrl)
      .map((u) => [u.path as string, u.signedUrl as string]),
  );

  return rows
    .map((r) => ({
      id: r.id,
      fileName: r.file_name,
      storagePath: r.storage_path,
      signedUrl: urlMap[r.storage_path] ?? "",
    }))
    .filter((r) => r.signedUrl);
}

export async function createImageDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const res = await supabase.storage
    .from("canvas-assets")
    .createSignedUrl(storagePath, 3600);
  return res.data?.signedUrl ?? null;
}
