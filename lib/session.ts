// Server: hämtar inloggad användare ur Supabase-sessionen (för badge i headern).
// Returnerar null i preview/utan auth — ingen badge visas då. Anropas endast
// från server-komponenter (AppShell/ProjectWorkspace).
import { createClient } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/auth";

export interface SessionUser {
  name: string;
  email: string;
}

export async function currentUser(): Promise<SessionUser | null> {
  if (!AUTH_ENABLED) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (meta.full_name as string) ||
      (meta.name as string) ||
      user.email?.split("@")[0] ||
      "Inloggad";
    return { name, email: user.email ?? "" };
  } catch {
    return null;
  }
}
