"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

// Browser-klient: anon-key + auth-cookie. Aldrig service-role här.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
