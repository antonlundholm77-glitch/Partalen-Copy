// Read-only diagnostik: kontrollerar att dokumentbibliotekets schema + seed finns.
// Kör: node --env-file=.env.local scripts/doc-diag.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
// Anon-nyckel (samma som appen). RLS gäller: anon utan session ser 0 rader,
// men ett saknat schema ger "relation ... does not exist" → då är migrationerna
// inte applicerade.
const sb = createClient(url, key, { auth: { persistSession: false } });

async function check(label, fn) {
  try {
    const { data, error } = await fn();
    if (error) console.log(`✗ ${label}: ${error.message}`);
    else console.log(`✓ ${label}: ${JSON.stringify(data)}`);
  } catch (e) {
    console.log(`✗ ${label}: ${e.message}`);
  }
}

console.log("URL:", url);
await check("gf_organizations (slug)", () =>
  sb.from("gf_organizations").select("slug,name").order("slug"),
);
await check("gf_projects (slug)", () =>
  sb.from("gf_projects").select("slug,name,org_id").order("slug"),
);
await check("gf_documents finns", () =>
  sb.from("gf_documents").select("id").limit(1),
);
await check("storage bucket gf-documents", () =>
  sb.storage.getBucket("gf-documents"),
);
