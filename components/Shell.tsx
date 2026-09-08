"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import SidebarToggleButton from "@/components/SidebarToggleButton";
import Breadcrumb from "@/components/Breadcrumb";
import BrandStyleInjector from "@/components/BrandStyleInjector";
import type { CustomerStub } from "@/components/CustomerSwitcher";
import type { ProjectStub, UnitGroup } from "@/components/ProjectSwitcher";
import type { UnitKind } from "@/lib/modules";
import type { SessionUser } from "@/lib/session";
import type { ViewMode } from "@/lib/auth/view-mode";
import type { ResolvedBrand } from "@/lib/branding/types";

// Layout-skal: topprad + (ihopfällbar) sidomeny + innehåll. Håller fäll-läget
// och sparar det i localStorage.
export default function Shell({
  customers,
  projectGroups,
  currentCustomerId,
  customerName,
  projects,
  currentProjectId,
  unitNoun,
  unitNounPlural,
  kind,
  badge,
  showSignOut = false,
  user = null,
  disabledModuleKeys,
  isPlatformAdmin = true,
  viewMode = "internal",
  brand,
  pageTitle,
  children,
}: {
  customers?: CustomerStub[];
  projectGroups?: UnitGroup[];
  currentCustomerId?: string;
  customerName?: string;
  projects?: ProjectStub[];
  currentProjectId?: string;
  unitNoun?: string;
  unitNounPlural?: string;
  kind?: UnitKind;
  badge?: string;
  showSignOut?: boolean;
  user?: SessionUser | null;
  disabledModuleKeys?: string[];
  isPlatformAdmin?: boolean;
  viewMode?: ViewMode;
  brand?: ResolvedBrand;
  pageTitle?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("gf-sidebar") === "1");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("gf-sidebar", next ? "1" : "0");
      return next;
    });

  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      {brand && <BrandStyleInjector brand={brand} />}
      <TopBar
        currentCustomerId={currentCustomerId}
        currentProjectId={currentProjectId}
        badge={badge}
        showSignOut={showSignOut}
        user={user}
        customers={customers}
        projectGroups={projectGroups}
        viewMode={viewMode}
        brand={brand}
        leading={<SidebarToggleButton collapsed={collapsed} onClick={toggle} />}
      />
      <div
        className={`grid min-h-0 ${collapsed ? "grid-cols-[3.25rem_1fr]" : "grid-cols-[15rem_1fr]"}`}
      >
        <Sidebar
          currentCustomerId={currentCustomerId}
          customerName={customerName}
          currentProjectId={currentProjectId}
          kind={kind}
          collapsed={collapsed}
          onToggle={toggle}
          disabledModuleKeys={disabledModuleKeys}
          isPlatformAdmin={isPlatformAdmin}
          viewMode={viewMode}
          portalMode={brand?.portalMode === true}
        />
        <main className="grid min-h-0 grid-rows-[auto_1fr]">
          <Breadcrumb
            currentCustomerId={currentCustomerId}
            currentProjectId={currentProjectId}
            kind={kind}
            pageTitle={pageTitle}
          />
          {/* PhaseNav (Idé/Projektering/...) borttagen — den avancerade
              process-vyn (Projektprocessen) ersätter den. */}
          <div className="min-h-0 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
