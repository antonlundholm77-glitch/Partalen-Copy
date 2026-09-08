// Server-side: hämta dokument kopplade till en specifik leverabel.
// Använder samma gf_documents-RLS som dokumentmodulen — projekt-medlemmar
// och kund-admins kan läsa.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { GfDocStatus } from "@/lib/documents";

export interface DeliverableDocument {
  id: string;
  name: string;
  status: GfDocStatus;
  current_version: number;
  updated_at: string;
  description: string | null;
}

export const dbDocumentsForDeliverable = cache(
  async (deliverableId: string): Promise<DeliverableDocument[]> => {
    const supabase = await createClient();
    const res = await supabase
      .from("gf_documents")
      .select("id, name, status, current_version, updated_at, description")
      .eq("deliverable_id", deliverableId)
      .order("updated_at", { ascending: false });
    return (res.data ?? []) as DeliverableDocument[];
  },
);
