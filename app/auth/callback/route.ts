import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth-callback: Supabase skickar tillbaka en kod efter Entra-inloggning.
// Vi växlar koden mot en session (PKCE) och sätter auth-cookien.
// `next` propageras från login-sidan (t.ex. /auth/invite/<token>) så att
// inbjudningsflödet kan avslutas på rätt sida efter lyckad login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

// Bara tillåt relativa paths — skydd mot open-redirect via manipulerad `next`.
function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
