// Auth aktiveras bara när Supabase är konfigurerat (en riktig .supabase.co-URL).
// Lokalt med dev-projektet → true (inloggning krävs). På Vercel utan env →
// false (appen öppen med testdata, ingen redirect-loop). Datan kommer alltid
// från lib/data oavsett.
export const AUTH_ENABLED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(
  ".supabase.co",
);
