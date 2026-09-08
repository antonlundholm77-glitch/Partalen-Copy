// Dokumentbibliotek — datalager mot Supabase (Storage + metadata).
// Lean kärna: lista, ladda upp, ny version, byt status, signerad nedladdning.
// Speglar supabase/migrations/0003_documents.sql.

import { createClient } from "@/lib/supabase/client";
import type { DocumentStatus } from "@/lib/types";

export const DOCS_BUCKET = "gf-documents";

export type GfDocStatus = DocumentStatus;

export interface GfDocument {
  id: string;
  project_id: string;
  name: string;
  phase: string | null;
  discipline: string | null;
  status: GfDocStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
  description: string | null;
  access_code: string | null;
  // Koppling till pm_deliverables.id. null = fristående dokument.
  deliverable_id: string | null;
  // Soft-delete (papperskorg). null = aktiv. Sätts via softDeleteDocument,
  // nollställs via restoreDocument, gör hård radering via permanentlyDelete.
  deleted_at: string | null;
}

export interface GfDocumentVersion {
  id: string;
  document_id: string;
  project_id: string;
  version: number;
  storage_path: string;
  size: number | null;
  mime: string | null;
  uploaded_at: string;
}

export const DOC_STATUS: { id: GfDocStatus; label: string; cls: string }[] = [
  { id: "arbetsmaterial", label: "Arbetsmaterial", cls: "bg-warning-bg text-warning-text" },
  { id: "granskning", label: "Granskning", cls: "bg-accent-bg text-accent" },
  { id: "godkand", label: "Godkänd", cls: "bg-success-bg text-success-text" },
];

// Filnamn → säker storage-nyckel (utan att tappa läsbarhet).
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_");
}

// Default: bara aktiva (inte i papperskorg). Sätt includeDeleted=true för
// att istället få allt i papperskorgen — för "Papperskorg"-vyn.
export async function listDocuments(
  projectId: string,
  opts: { includeDeleted?: boolean } = {},
): Promise<GfDocument[]> {
  const supabase = createClient();
  let q = supabase.from("gf_documents").select("*").eq("project_id", projectId);
  if (opts.includeDeleted) {
    q = q.not("deleted_at", "is", null);
  } else {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GfDocument[];
}

export async function listVersions(documentId: string): Promise<GfDocumentVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gf_document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GfDocumentVersion[];
}

// Ny handling: skapar gf_documents-rad + v1 och laddar upp filen.
export async function uploadDocument(
  projectId: string,
  file: File,
  meta: { phase?: string; discipline?: string; deliverable_id?: string | null },
): Promise<GfDocument> {
  const supabase = createClient();
  // supabase-js insert/update kräver full per-tabell Insert/Update-typ; vår
  // Database-typ är minimal, så vi castar muteringsbyggaren lokalt.
  const { data: doc, error: docErr } = await (supabase.from("gf_documents") as any)
    .insert({
      project_id: projectId,
      name: file.name,
      phase: meta.phase || null,
      discipline: meta.discipline || null,
      deliverable_id: meta.deliverable_id || null,
    })
    .select("*")
    .single();
  if (docErr) throw docErr;

  await putVersion(projectId, doc.id, 1, file);
  return doc as GfDocument;
}

// Ny version av en befintlig handling.
export async function uploadNewVersion(doc: GfDocument, file: File): Promise<void> {
  const supabase = createClient();
  const next = doc.current_version + 1;
  await putVersion(doc.project_id, doc.id, next, file);
  const { error } = await (supabase.from("gf_documents") as any)
    .update({ current_version: next, name: file.name })
    .eq("id", doc.id);
  if (error) throw error;
}

// Ladda upp en fil till Storage + skapa versionsrad.
async function putVersion(
  projectId: string,
  documentId: string,
  version: number,
  file: File,
): Promise<void> {
  const supabase = createClient();
  const path = `${projectId}/${documentId}/v${version}-${safeName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { error: verErr } = await (supabase.from("gf_document_versions") as any).insert({
    document_id: documentId,
    project_id: projectId,
    version,
    storage_path: path,
    size: file.size,
    mime: file.type || null,
  });
  if (verErr) throw verErr;
}

export async function setStatus(documentId: string, status: GfDocStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.from("gf_documents") as any)
    .update({ status })
    .eq("id", documentId);
  if (error) throw error;
}

// Redigera metadata (namn, fas, disciplin, beskrivning, access-kod, leverabel).
export async function updateMeta(
  documentId: string,
  fields: {
    name?: string;
    phase?: string | null;
    discipline?: string | null;
    description?: string | null;
    access_code?: string | null;
    deliverable_id?: string | null;
  },
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.from("gf_documents") as any)
    .update(fields)
    .eq("id", documentId);
  if (error) throw error;
}

// Signerad URL + mime för dokumentets aktuella version (för förhandsvisning).
// storage_path som börjar med "public:" tolkas som relativ path under
// Next.js static-assets (public/) — används för publikt tillgängliga
// dokument. Övriga går via Supabase Storage med signering.
export async function currentVersionUrl(
  doc: GfDocument,
): Promise<{ url: string; mime: string | null } | null> {
  const vers = await listVersions(doc.id);
  const cur = vers.find((v) => v.version === doc.current_version) ?? vers[0];
  if (!cur) return null;
  if (cur.storage_path.startsWith("public:")) {
    return { url: `/${cur.storage_path.slice("public:".length)}`, mime: cur.mime };
  }
  return { url: await signedUrl(cur.storage_path), mime: cur.mime };
}

// Signerad (tidsbegränsad) URL för nedladdning/förhandsvisning.
export async function signedUrl(storagePath: string, seconds = 3600): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(storagePath, seconds);
  if (error) throw error;
  return data.signedUrl;
}

// Mjuk borttagning: markerar deleted_at, dokumentet hamnar i papperskorgen.
// Filerna ligger kvar i Storage tills permanentlyDeleteDocument anropas
// eller dokumentet återställs via restoreDocument.
export async function softDeleteDocument(documentId: string): Promise<void> {
  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { error } = await (supabase.from("gf_documents") as any)
    .update({ deleted_at: new Date().toISOString(), deleted_by: uid })
    .eq("id", documentId);
  if (error) throw error;
}

// Återställ från papperskorgen.
export async function restoreDocument(documentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.from("gf_documents") as any)
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", documentId);
  if (error) throw error;
}

// Hård borttagning: tar bort alla version-filer från Storage + rader från DB.
// Endast aktiv i papperskorgs-läget för att skydda mot oavsiktlig dataförlust.
// public:-prefixade paths är static-assets — de hoppas över i Storage-rensningen.
export async function permanentlyDeleteDocument(documentId: string): Promise<void> {
  const supabase = createClient();
  const versions = await listVersions(documentId);
  const paths = versions
    .map((v) => v.storage_path)
    .filter((p) => !p.startsWith("public:"));
  if (paths.length) await supabase.storage.from(DOCS_BUCKET).remove(paths);
  const { error } = await supabase.from("gf_documents").delete().eq("id", documentId);
  if (error) throw error;
}

// @deprecated — använd softDeleteDocument istället. Behållen för bakåtkompatibilitet
// medan DocumentLibrary refaktoreras till soft-delete-flödet.
export async function deleteDocument(documentId: string): Promise<void> {
  return softDeleteDocument(documentId);
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
