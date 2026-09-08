"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCustomer, getUnit } from "@/lib/data";
import { navItemsFor, type UnitKind } from "@/lib/modules";
import { currentLevel, LEVEL_THEME } from "@/lib/levels";

type Crumb = { label: string; href?: string };

// Brödsmulor under headern: Part ▸ Bolag ▸ Projekt ▸ Modul. Kontextkänslig
// utifrån vald kund/enhet (från Shell) + aktuell route (usePathname).
export default function Breadcrumb({
  currentCustomerId,
  currentProjectId,
  kind = "entreprenad",
  pageTitle,
}: {
  currentCustomerId?: string;
  currentProjectId?: string;
  kind?: UnitKind;
  pageTitle?: string;
}) {
  const pathname = usePathname();
  const home = "/";
  const cbase = "/c";
  const adminBase = "/admin";

  const crumbs: Crumb[] = [{ label: "Part", href: home }];

  if (pathname.startsWith(adminBase)) {
    if (pathname.startsWith(`${adminBase}/bolag`)) crumbs.push({ label: "Bolag" });
    else if (pathname.startsWith(`${adminBase}/canvas`)) crumbs.push({ label: "Canvas", href: `${adminBase}/canvas` });
    else crumbs.push({ label: "Administration" });
  } else if (currentCustomerId) {
    const cust = getCustomer(currentCustomerId);
    crumbs.push({ label: cust?.name ?? currentCustomerId, href: `${cbase}/${currentCustomerId}` });

    const custAdminBase = `${cbase}/${currentCustomerId}/admin`;
    if (pathname === custAdminBase || pathname.startsWith(`${custAdminBase}/`)) {
      crumbs.push({ label: "Administration" });
    } else if (currentProjectId) {
      const unit = getUnit(currentCustomerId, currentProjectId);
      const unitBase = `${cbase}/${currentCustomerId}/${currentProjectId}`;
      crumbs.push({ label: unit?.name ?? currentProjectId, href: unitBase });
      const rest = pathname.slice(unitBase.length).split("/").filter(Boolean);
      if (rest[0]) {
        const m = navItemsFor(kind).find((x) => x.segment === rest[0]);
        crumbs.push({ label: m?.label ?? rest[0] });
      }
    }
  }

  if (pageTitle) crumbs.push({ label: pageTitle });

  const theme = LEVEL_THEME[currentLevel(currentCustomerId, currentProjectId)];

  return (
    <nav
      aria-label="Brödsmulor"
      className={`flex items-center gap-1 overflow-x-auto border-b border-b-border border-t-2 ${theme.line} ${theme.tint} px-4 py-1.5 text-[12px]`}
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-ink-3"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
            {c.href && !last ? (
              <Link href={c.href} className="truncate text-ink-3 transition hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className={`truncate font-medium ${theme.accent}`}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
