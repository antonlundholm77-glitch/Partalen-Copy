import Link from "next/link";
import CustomerSwitcher, { type CustomerStub } from "@/components/CustomerSwitcher";
import ProjectSwitcher, { type UnitGroup } from "@/components/ProjectSwitcher";
import SettingsMenu from "@/components/SettingsMenu";
import BrandedLogo from "@/components/BrandedLogo";
import { customerStubs, unitGroups } from "@/lib/data";
import type { SessionUser } from "@/lib/session";
import type { ViewMode } from "@/lib/auth/view-mode";
import { DEFAULT_BRAND, type ResolvedBrand } from "@/lib/branding/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// Topprad: [brand] ▸ [kund ▾] ▸ [projekt ▾] + badge/utloggning.
// Switchers villkorliga på viewMode:
//   internal — visa alltid
//   customer — visa CustomerSwitcher om ≥2 orgs, ProjectSwitcher alltid
//   project  — dölj båda (project-mode har bara ett projekt)
export default function TopBar({
  currentCustomerId,
  currentProjectId,
  badge,
  showSignOut = false,
  user = null,
  customers,
  projectGroups,
  viewMode = "internal",
  brand = DEFAULT_BRAND,
  leading,
}: {
  currentCustomerId?: string;
  currentProjectId?: string;
  badge?: string;
  showSignOut?: boolean;
  user?: SessionUser | null;
  customers?: CustomerStub[];
  projectGroups?: UnitGroup[];
  viewMode?: ViewMode;
  brand?: ResolvedBrand;
  // Slot för sidebar-toggle (hamburger) — Shell renderar denna eftersom den
  // är client och behöver toggle-state. TopBar förblir server-komponent.
  leading?: React.ReactNode;
}) {
  // För customer/project: hem-länken går till kunden, inte plattforms-landningen
  const homeHref =
    viewMode === "internal" ? "/" : currentCustomerId ? `/c/${currentCustomerId}` : "/";
  const custBase = "/c";
  const effectiveCustomers = customers ?? customerStubs();
  const effectiveGroups = projectGroups ?? unitGroups();

  // Räkna totalt antal åtkomliga projekt över alla orgs användaren ser.
  const totalProjectCount = effectiveGroups.reduce((n, g) => n + g.units.length, 0);

  const showCustomerSwitcher =
    viewMode === "internal" || (viewMode === "customer" && effectiveCustomers.length >= 2);
  // Project-switcher syns så fort användaren har minst ett projekt — även
  // med ett enda projekt vill vi visa det i headern som navigation/breadcrumb.
  // Plattformsadmin (internal) ser den alltid.
  const showProjectSwitcher = viewMode === "internal" || totalProjectCount >= 1;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-panel px-4 py-2.5">
      <div className="flex items-center gap-2">
        {leading}
        <Link href={homeHref} className="px-1" aria-label={`${brand.name} — hem`}>
          <BrandedLogo brand={brand} size={22} />
        </Link>
        {showCustomerSwitcher && (
          <>
            <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border-strong" />
            <CustomerSwitcher
              custBase={custBase}
              currentId={currentCustomerId}
              customers={effectiveCustomers}
            />
          </>
        )}
        {showProjectSwitcher && (
          <>
            <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border-strong" />
            <ProjectSwitcher
              base={custBase}
              currentCustomerId={currentCustomerId}
              currentProjectId={currentProjectId}
              groups={effectiveGroups}
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning-text">
            {badge}
          </span>
        )}
        <SettingsMenu
          currentCustomerId={currentCustomerId}
          currentProjectId={currentProjectId}
        />
        {user && (
          <span
            className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-0.5 pl-0.5 pr-2.5"
            title={user.email}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eae8d0] text-[10px] font-semibold text-[#4f4b22]">
              {initials(user.name)}
            </span>
            <span className="hidden text-[12px] font-medium text-ink sm:inline">{user.name}</span>
          </span>
        )}
        {showSignOut && (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-secondary hover:text-ink"
            >
              Logga ut
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
