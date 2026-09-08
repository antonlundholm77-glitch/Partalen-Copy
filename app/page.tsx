import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PartGroupOverview from "@/components/PartGroupOverview";
import { Card } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";

export default async function Home() {
  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    if (ctx && !ctx.isPlatformAdmin) {
      if (ctx.viewMode === "project" && ctx.scopedOrgSlug && ctx.scopedProjectSlug) {
        redirect(`/c/${ctx.scopedOrgSlug}/${ctx.scopedProjectSlug}`);
      }
      const first = ctx.accessibleOrgSlugs[0];
      if (first) redirect(`/c/${first}`);

      return (
        <AppShell showSignOut>
          <div className="mx-auto max-w-md px-6 py-12">
            <Card padded>
              <h1 className="text-lg font-medium">Ingen access än</h1>
              <p className="mt-2 text-[13px] text-fg-2">
                Du är inloggad som <code>{ctx.email}</code> men har ingen
                tilldelad organisation eller projekt. Be din kontaktperson om
                en inbjudningslänk.
              </p>
              <p className="mt-3 text-[12px] text-fg-3">
                Om du nyligen accepterat en inbjudan: ladda om sidan eller
                logga ut och in igen för att uppdatera sessionen.
              </p>
            </Card>
          </div>
        </AppShell>
      );
    }
  }

  return (
    <AppShell showSignOut={AUTH_ENABLED}>
      <PartGroupOverview />
    </AppShell>
  );
}
