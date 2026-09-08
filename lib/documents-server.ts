// Server-bunden via lib/supabase/server (next/headers). Anropa endast från
// server-komponenter.
import { createClient } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/auth";

// Slår upp (kund-slug, enhets-slug) → enhetens uuid via riktiga Supabase-rader
// (seedade i 0004). RLS-gateat: returnerar null om enheten inte finns eller
// användaren saknar åtkomst. Null → biblioteket visar en notis.
export async function resolveProjectId(
  orgSlug: string,
  unitSlug: string,
): Promise<string | null> {
  if (!AUTH_ENABLED) return null;
  const supabase = await createClient();

  // supabase-js typar select → never med vår minimala Database-typ; casta lokalt.
  const { data: org } = (await (supabase.from("gf_organizations") as any)
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle()) as { data: { id: string } | null };
  if (!org) return null;

  const { data: proj } = (await (supabase.from("gf_projects") as any)
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", unitSlug)
    .maybeSingle()) as { data: { id: string } | null };

  return proj?.id ?? null;
}
