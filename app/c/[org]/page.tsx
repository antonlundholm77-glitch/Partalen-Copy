import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CustomerOverview from "@/components/CustomerOverview";
import PartalenWelcome from "@/components/PartalenWelcome";
import { getCustomer } from "@/lib/data";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";
import { getBrand } from "@/lib/db/branding";
import { currentUser } from "@/lib/session";

// Kund-landning: dashboard med enheter, medlemmar och inbjudningar.
// Project-only-användare ska aldrig se kund-landningen — de skickas vidare
// till sitt enda projekt så Part Group:s projektväljare inte exponeras.
// Kunder med brand.landingTemplate får custom landningsdesign istället för
// standard CustomerOverview.
export default async function CustomerLanding({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const customer = getCustomer(org);
  if (!customer) notFound();

  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    if (ctx?.viewMode === "project" && ctx.scopedProjectSlug) {
      redirect(`/c/${org}/${ctx.scopedProjectSlug}`);
    }
  }

  let landingTemplate: string | undefined;
  let userName: string | undefined;
  if (AUTH_ENABLED) {
    const [brand, ctx, user] = await Promise.all([
      getBrand({ viewMode: "customer", orgSlug: org }),
      getAccessContext(),
      currentUser(),
    ]);
    landingTemplate = brand.landingTemplate;
    userName = user?.name;
    void ctx;
  }

  return (
    <AppShell
      currentCustomerId={org}
      showSignOut={AUTH_ENABLED}
    >
      {landingTemplate === "partalen-welcome" ? (
        <PartalenWelcomeWrapper org={org} userName={userName} />
      ) : (
        <CustomerOverview org={org} />
      )}
    </AppShell>
  );
}

// Litet server-wrapping så vi kan fetcha brand inom samma request-cache.
async function PartalenWelcomeWrapper({
  org,
  userName,
}: {
  org: string;
  userName?: string;
}) {
  const brand = await getBrand({ viewMode: "customer", orgSlug: org });
  return <PartalenWelcome brand={brand} userName={userName} orgSlug={org} />;
}
