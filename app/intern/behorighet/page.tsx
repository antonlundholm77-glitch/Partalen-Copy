import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import InternalAccess from "@/components/InternalAccess";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";

export default async function InternalBehorighetPage() {
  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    if (!ctx) redirect("/login");
    if (!ctx.isPlatformAdmin) redirect("/");
  }

  return (
    <AppShell showSignOut={AUTH_ENABLED}>
      <InternalAccess />
    </AppShell>
  );
}
