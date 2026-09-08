import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Auth-gate: när Supabase är konfigurerat krävs inloggning till hela appen
// (utom /auth/*). Är det inte konfigurerat (t.ex. Vercel utan env) släpps
// allt igenom — appen kör då öppet på testdata. /login är undantaget i
// matchern nedan.
export async function middleware(request: NextRequest) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const authEnabled = supaUrl.includes(".supabase.co") && supaKey.length > 0;

  if (!authEnabled) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supaUrl, supaKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Inte inloggad → till /login (men släpp igenom auth-flödet självt).
  if (!user && !request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Undantag: Next-interna, favicon, login och statiska assets (filer med
  // ändelse, t.ex. inbäddade portal-html-filer under public/).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|.*\\.).*)"],
};
