import Shell from "@/components/Shell";
import type { ProjectStub } from "@/components/ProjectSwitcher";
import type { UnitKind } from "@/lib/modules";
import { AUTH_ENABLED } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { getAccessContext } from "@/lib/auth/access";
import { dbCustomerStubs, dbUnitGroups } from "@/lib/db/orgs";
import { getBrand, DEFAULT_BRAND } from "@/lib/db/branding";
import { getCustomer } from "@/lib/data";

// Projekt-/kursarbetsyta: topprad + ihopfällbar sidomeny + innehåll.
// Switcher-listorna (kunder + projekt) hämtas alltid via getAccessContext
// + dbCustomerStubs/dbUnitGroups — inga override-listor från anroparen,
// så användaren ser bara det hen har access till.
export default async function ProjectWorkspace({
  currentCustomerId,
  projects,
  currentProjectId,
  unitNoun,
  unitNounPlural,
  kind = "entreprenad",
  badge,
  disabledModuleKeys,
  children,
}: {
  currentCustomerId: string;
  projects: ProjectStub[];
  currentProjectId: string;
  unitNoun?: string;
  unitNounPlural?: string;
  kind?: UnitKind;
  edition?: string | null;
  badge?: string;
  disabledModuleKeys?: string[];
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const effectiveBadge = badge ?? (AUTH_ENABLED ? "DB" : "Prototypdata");

  let isPlatformAdmin = true;
  let viewMode: "internal" | "customer" | "project" = "internal";
  let switcherCustomers;
  let projectGroups;
  let brand = DEFAULT_BRAND;
  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    isPlatformAdmin = ctx?.isPlatformAdmin === true;
    viewMode = ctx?.viewMode ?? "internal";
    const slugs = ctx?.accessibleOrgSlugs ?? [];
    switcherCustomers = await dbCustomerStubs(slugs);
    projectGroups = await dbUnitGroups(slugs);
    brand = await getBrand({
      viewMode,
      orgSlug: currentCustomerId,
      projectSlug: currentProjectId,
    });
  }

  return (
    <Shell
      currentCustomerId={currentCustomerId}
      customerName={getCustomer(currentCustomerId)?.name}
      currentProjectId={currentProjectId}
      unitNoun={unitNoun}
      unitNounPlural={unitNounPlural}
      kind={kind}
      badge={effectiveBadge}
      showSignOut={AUTH_ENABLED}
      user={user}
      disabledModuleKeys={disabledModuleKeys}
      isPlatformAdmin={isPlatformAdmin}
      viewMode={viewMode}
      brand={brand}
      customers={switcherCustomers}
      projectGroups={projectGroups}
    >
      {children}
    </Shell>
  );
}
