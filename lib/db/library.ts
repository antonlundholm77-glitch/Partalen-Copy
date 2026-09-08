// DB-fetchers för /intern/bibliotek (internt dokumentbibliotek).
// RLS = gf_is_platform_admin() — bara plattformsadmin ser och skriver.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export interface DocCategory {
  id: string;
  label: string;
  sort_order: number;
  active: boolean;
}

export interface DocStatus {
  id: string;
  label: string;
  sort_order: number;
  active: boolean;
  is_terminal: boolean;
}

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  status_id: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  tags: string[];
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export const fetchCategories = cache(async (): Promise<DocCategory[]> => {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_doc_categories")
    .select("id, label, sort_order, active")
    .order("sort_order");
  if (error) {
    console.error("fetchCategories:", error.message);
    return [];
  }
  return (data ?? []) as DocCategory[];
});

export const fetchStatuses = cache(async (): Promise<DocStatus[]> => {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_doc_statuses")
    .select("id, label, sort_order, active, is_terminal")
    .order("sort_order");
  if (error) {
    console.error("fetchStatuses:", error.message);
    return [];
  }
  return (data ?? []) as DocStatus[];
});

// Alla aktiva interna användare som kan vara ägare till dokument.
// Returnerar gf_profiles-rader (plattformsadmin-domän + ev. konsulter med konto).
export const fetchOwners = cache(
  async (): Promise<{ user_id: string; full_name: string; email: string }[]> => {
    const supabase = (await createClient()) as AnySupabase;
    const { data, error } = await supabase
      .from("gf_profiles")
      .select("user_id, full_name, email")
      .order("full_name");
    if (error) {
      console.error("fetchOwners:", error.message);
      return [];
    }
    return (data ?? []) as { user_id: string; full_name: string; email: string }[];
  },
);

interface LibraryDocumentRow {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  status_id: string | null;
  owner_user_id: string | null;
  tags: string[] | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

// FK från gf_library_documents.owner_user_id går till auth.users, inte till
// gf_profiles, så PostgREST kan inte resolva en named-join. Lösning: hämta
// dokumenten och profilerna separat och joina in-memory. Datavolymen är
// rimlig för ett internt bibliotek.
export const fetchLibraryDocuments = cache(
  async (): Promise<LibraryDocument[]> => {
    const supabase = (await createClient()) as AnySupabase;
    const [docsRes, profilesRes] = await Promise.all([
      supabase
        .from("gf_library_documents")
        .select(
          "id, title, description, category_id, status_id, owner_user_id, tags, storage_path, file_name, file_size, mime_type, created_at, updated_at",
        )
        .order("updated_at", { ascending: false }),
      supabase.from("gf_profiles").select("user_id, full_name, email"),
    ]);
    if (docsRes.error) {
      console.error("fetchLibraryDocuments:", docsRes.error.message);
      return [];
    }
    const profileById = new Map<string, { full_name: string; email: string }>();
    for (const p of (profilesRes.data ?? []) as {
      user_id: string;
      full_name: string;
      email: string;
    }[]) {
      profileById.set(p.user_id, { full_name: p.full_name, email: p.email });
    }
    const rows = (docsRes.data ?? []) as LibraryDocumentRow[];
    return rows.map((r) => {
      const owner = r.owner_user_id ? profileById.get(r.owner_user_id) : null;
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category_id: r.category_id,
        status_id: r.status_id,
        owner_user_id: r.owner_user_id,
        owner_name: owner?.full_name ?? null,
        owner_email: owner?.email ?? null,
        tags: r.tags ?? [],
        storage_path: r.storage_path,
        file_name: r.file_name,
        file_size: r.file_size === null ? null : Number(r.file_size),
        mime_type: r.mime_type,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
  },
);
