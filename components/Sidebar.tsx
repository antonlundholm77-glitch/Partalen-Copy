"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Presentation } from "lucide-react";
import { navItemsFor, moduleHref, resolveModuleGroups, type UnitKind } from "@/lib/modules";
import { getCustomer, getUnit } from "@/lib/data";
import { moduleIcon } from "@/lib/icons";

// Färgtema per sektion (matchar OrgTree + headerns dropdowns).
// Jordnära kulörer: Internt = oliv, Kund = terrakotta, Projekt = grön.
const SECTION = {
  platform: { label: "text-[#6d6930]", bar: "border-l-[#6d6930]", bg: "bg-[#eae8d0]", on: "text-[#4f4b22]" },
  kund: { label: "text-[#b5532a]", bar: "border-l-[#b5532a]", bg: "bg-[#f5e5d9]", on: "text-[#8a3f20]" },
  projekt: { label: "text-[#5e8553]", bar: "border-l-[#5e8553]", bg: "bg-[#dde7d5]", on: "text-[#3f5c38]" },
};

type Theme = (typeof SECTION)[keyof typeof SECTION];

type ViewMode = "internal" | "customer" | "project";

export default function Sidebar({
  currentCustomerId,
  customerName,
  currentProjectId,
  kind = "entreprenad",
  collapsed = false,
  onToggle,
  disabledModuleKeys,
  isPlatformAdmin = true,
  viewMode = "internal",
  portalMode = false,
}: {
  currentCustomerId?: string;
  // Visas som sektionsrubrik istället för "Kund". Default "Kund" om saknas.
  customerName?: string;
  currentProjectId?: string;
  kind?: UnitKind;
  collapsed?: boolean;
  onToggle?: () => void;
  disabledModuleKeys?: string[];
  isPlatformAdmin?: boolean;
  viewMode?: ViewMode;
  // När vi är inne i en "portalkund" (gf_org_content.content.brand.portalMode):
  // dölj den interna sektionen även för plattformsadmin så kundens portal-känsla
  // bevaras. Andra kunder påverkas inte.
  portalMode?: boolean;
}) {
  const disabledSet = new Set(disabledModuleKeys ?? []);
  // Project-mode: dölj kund-översiktslänken så användaren bara ser sitt projekt.
  const showCustomerSection = viewMode !== "project";
  // Plattformsadmin ser alltid hela menyn, oavsett vilken kund de besöker.
  // portalMode styr nu om Presentation-länken syns längst ned i menyn.
  const showPlatformSection = isPlatformAdmin;
  const pathname = usePathname();
  const presentationHref = currentCustomerId
    ? `/c/${currentCustomerId}/presentation`
    : null;
  const showPresentation = portalMode && presentationHref;

  // Kom ihåg senast besökta projekt per kund — så att projektmenyn finns kvar
  // när man traverserar tillbaka till kundnivån och kan gå ned i samma projekt
  // igen utan att gå via header-väljaren.
  const [rememberedProjectId, setRememberedProjectId] = useState<string | undefined>(undefined);

  const lastProjectKey = currentCustomerId
    ? `gf-last-project:${currentCustomerId}`
    : undefined;

  useEffect(() => {
    if (!lastProjectKey) {
      setRememberedProjectId(undefined);
      return;
    }
    if (currentProjectId) {
      localStorage.setItem(lastProjectKey, currentProjectId);
      setRememberedProjectId(currentProjectId);
    } else {
      setRememberedProjectId(localStorage.getItem(lastProjectKey) ?? undefined);
    }
  }, [lastProjectKey, currentProjectId]);

  const effectiveProjectId = currentProjectId ?? rememberedProjectId;

  const homeHref = "/";
  const custBase = "/c";
  const internBase = "/admin";
  const customerHref = currentCustomerId ? `${custBase}/${currentCustomerId}` : undefined;
  const projectBase =
    currentCustomerId && effectiveProjectId
      ? `${custBase}/${currentCustomerId}/${effectiveProjectId}`
      : undefined;

  const exact = (href: string) => pathname === href;
  const startsWith = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const unit =
    currentCustomerId && effectiveProjectId
      ? getUnit(currentCustomerId, effectiveProjectId)
      : undefined;

  // När vi faller tillbaka på minne saknar vi prop-`kind` (server skickar bara
  // det när URL har ett projekt) — härled från kundens kind så modulurvalet blir rätt.
  const effectiveKind: UnitKind = currentProjectId
    ? kind
    : currentCustomerId
      ? (getCustomer(currentCustomerId)?.kind ?? kind)
      : kind;

  // Moduler som visas via inbäddad portal är monterade — ska inte märkas "snart"
  // även om modulregistret har status "soon".
  const portalKeys = Object.keys(unit?.portal?.sections ?? {});
  const groups = unit?.moduleGroups ? resolveModuleGroups(unit.moduleGroups) : null;

  function Item({
    href,
    icon,
    label,
    active,
    theme,
    soon,
  }: {
    href: string;
    icon: string;
    label: string;
    active: boolean;
    theme: Theme;
    soon?: boolean;
  }) {
    const I = moduleIcon(icon);
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2 rounded-md border-l-2 py-1.5 text-[13px] transition ${
          collapsed ? "justify-center px-0" : "pl-2 pr-2"
        } ${
          active
            ? `${theme.bar} ${theme.bg} font-medium ${theme.on}`
            : "border-l-transparent text-ink-2 hover:bg-secondary hover:text-ink"
        }`}
      >
        <I size={16} strokeWidth={1.75} className={active ? "opacity-100" : "opacity-70"} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && soon && (
          <span className="rounded bg-secondary px-1.5 py-px text-[10px] font-medium text-ink-3">
            snart
          </span>
        )}
      </Link>
    );
  }

  function SectionHeader({ title, theme }: { title: string; theme: Theme }) {
    // Tom title → ingen header (flat lista). Andvänds när moduleGroups bara
    // har en sektion utan namn.
    if (!title) return null;
    if (collapsed) return <div className="mx-2 mt-3 border-t border-border" />;
    return (
      <div className={`mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide ${theme.label}`}>
        {title}
      </div>
    );
  }

  // Toggle-knappen sitter numera som hamburger i TopBar (SidebarToggleButton).
  // onToggle-propen behålls i signaturen för bakåtkompatibilitet men används inte.
  void onToggle;

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-panel">
      <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-3">
        {/* 1. Part Group — plattformsadmin */}
        {showPlatformSection && (
          <>
            <SectionHeader title="Part Group" theme={SECTION.platform} />
            <Item href={homeHref} icon="oversikt" label="Översikt" active={exact(homeHref)} theme={SECTION.platform} />
            <Item href={`${internBase}/bolag`} icon="kunder" label="Bolag" active={startsWith(`${internBase}/bolag`)} theme={SECTION.platform} />
            <Item href={`${internBase}/canvas`} icon="canvas" label="Canvas" active={startsWith(`${internBase}/canvas`)} theme={SECTION.platform} />
          </>
        )}

        {/* 2. Kund — dolt för project-mode (de ser bara sitt projekt). Rubriken
            visar kundens namn (t.ex. "Part Group") istället för "Kund". */}
        {showCustomerSection && (
          <>
            <SectionHeader title={customerName ?? "Kund"} theme={SECTION.kund} />
            {customerHref ? (
              <Item href={customerHref} icon="oversikt" label="Översikt" active={exact(customerHref)} theme={SECTION.kund} />
            ) : (
              !collapsed && <div className="px-2 py-1 text-[12px] text-ink-3">Välj kund i headern.</div>
            )}
          </>
        )}

        {/* 3. Projekt */}
        {!groups && <SectionHeader title="Projekt" theme={SECTION.projekt} />}
        {projectBase ? (
          groups ? (
            // Kurerad enhet: smalt modulurval grupperat per sektion.
            groups.map((g) => (
              <Fragment key={g.section}>
                <SectionHeader title={g.section} theme={SECTION.projekt} />
                {g.items.filter((m) => !disabledSet.has(m.key)).map((m) => {
                  const href = moduleHref(projectBase, m.segment);
                  const active = m.segment ? startsWith(href) : exact(projectBase);
                  return (
                    <Item
                      key={m.key}
                      href={href}
                      icon={m.key}
                      label={m.label}
                      active={active}
                      theme={SECTION.projekt}
                      soon={m.status === "soon" && !portalKeys.includes(m.key)}
                    />
                  );
                })}
              </Fragment>
            ))
          ) : (
            navItemsFor(effectiveKind)
              .filter((m) => m.key !== "behorighet") // flyttad till kugghjulet
              .filter((m) => !disabledSet.has(m.key))
              .map((m) => {
                const href = moduleHref(projectBase, m.segment);
                const active = m.segment ? startsWith(href) : exact(projectBase);
                return (
                  <Item
                    key={m.key}
                    href={href}
                    icon={m.key}
                    label={m.label}
                    active={active}
                    theme={SECTION.projekt}
                    soon={m.status === "soon" && !portalKeys.includes(m.key)}
                  />
                );
              })
          )
        ) : (
          !collapsed && (
            <div className="px-2 py-1 text-[12px] text-ink-3">Välj projekt i headern.</div>
          )
        )}

        {/* Presentation — portal-kunder, länken syns både på kund- och
            projektnivå så den fungerar oavsett var man är. */}
        {showPresentation && presentationHref && (
          <div className="mt-6 border-t border-border pt-3">
            <Link
              href={presentationHref}
              title={collapsed ? "Presentation" : undefined}
              className={`flex items-center gap-2 rounded-md border-l-2 py-1.5 text-[13px] transition ${
                collapsed ? "justify-center px-0" : "pl-2 pr-2"
              } ${
                exact(presentationHref)
                  ? "border-l-[var(--brand-accent,#F59E0B)] bg-amber-50 font-medium text-[var(--brand-primary,#1E3A8A)]"
                  : "border-l-transparent text-ink-2 hover:bg-secondary hover:text-ink"
              }`}
            >
              <Presentation size={16} strokeWidth={1.75} className="opacity-80" />
              {!collapsed && <span className="flex-1 truncate">Presentation</span>}
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
