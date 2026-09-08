import Shell from "@/components/Shell";
import { currentUser } from "@/lib/session";
import type { CustomerStub } from "@/components/CustomerSwitcher";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";
import { dbCustomerStubs, dbUnitGroups } from "@/lib/db/orgs";
import { getBrand, DEFAULT_BRAND } from "@/lib/db/branding";
import { getCustomer } from "@/lib/data";

// Skal för list-/landningsnivåer (plattforms-topp, kund-landning, admin).
// Default-badge baseras på AUTH_ENABLED (Supabase konfigurerat = DB-läge).
// Switcher-listor hämtas från DB filtrerade på användarens åtkomst.
export default async function AppShell({
  customers: customersOverride,
  currentCustomerId,
  badge,
  showSignOut = false,
  pageTitle,
  children,
}: {
  customers?: CustomerStub[];
  currentCustomerId?: string;
  badge?: string;
  showSignOut?: boolean;
  pageTitle?: string;
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const effectiveBadge = badge ?? (AUTH_ENABLED ? "DB" : "Prototypdata");

  let isPlatformAdmin = true;
  let viewMode: "internal" | "customer" | "project" = "internal";
  let customers = customersOverride;
  let projectGroups;
  let brand = DEFAULT_BRAND;

  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    isPlatformAdmin = ctx?.isPlatformAdmin === true;
    viewMode = ctx?.viewMode ?? "internal";
    const slugs = ctx?.accessibleOrgSlugs ?? [];
    customers = customersOverride ?? (await dbCustomerStubs(slugs));
    projectGroups = await dbUnitGroups(slugs);
    brand = await getBrand({ viewMode, orgSlug: currentCustomerId });
  }

  return (
    <Shell
      currentCustomerId={currentCustomerId}
      customerName={currentCustomerId ? getCustomer(currentCustomerId)?.name : undefined}
      badge={effectiveBadge}
      showSignOut={showSignOut}
      user={user}
      isPlatformAdmin={isPlatformAdmin}
      viewMode={viewMode}
      brand={brand}
      customers={customers}
      projectGroups={projectGroups}
      pageTitle={pageTitle}
    >
      {children}
    </Shell>
  );
}
