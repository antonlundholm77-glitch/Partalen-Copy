"use client";

import { useState } from "react";
import Link from "next/link";
import { getCustomer, getUnit } from "@/lib/data";

// Kugghjul uppe till höger: samlar användare & behörighet för alla nivåer
// (Internt ▸ Kund ▸ Projekt/Kurs), kontextkänsligt efter vad som är valt.
export default function SettingsMenu({
  currentCustomerId,
  currentProjectId,
}: {
  currentCustomerId?: string;
  currentProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const internBase = "/intern";
  const custBase = "/c";

  const customer = currentCustomerId ? getCustomer(currentCustomerId) : undefined;
  const unit =
    currentCustomerId && currentProjectId
      ? getUnit(currentCustomerId, currentProjectId)
      : undefined;

  type Row = { theme: keyof typeof THEME; eyebrow: string; label: string; href: string };
  const rows: Row[] = [
    {
      theme: "platform",
      eyebrow: "Internt",
      label: "Användare & behörighet",
      href: `${internBase}/behorighet`,
    },
  ];
  if (customer) {
    rows.push({
      theme: "kund",
      eyebrow: customer.name,
      label: "Administration",
      href: `${custBase}/${customer.id}/admin`,
    });
  }
  if (customer && unit) {
    rows.push({
      theme: "projekt",
      eyebrow: unit.name,
      label: "Behörighet",
      href: `${custBase}/${customer.id}/${unit.id}/behorighet`,
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Användare & behörighet"
        aria-label="Användare & behörighet"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-secondary hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-md border border-border bg-panel py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              Användare & behörighet
            </div>
            {rows.map((r) => {
              const t = THEME[r.theme];
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 border-l-2 px-3 py-2 hover:bg-secondary ${t.bar}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold ${t.chip}`}>
                    {r.eyebrow.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[10px] font-semibold uppercase tracking-wide ${t.label}`}>
                      {r.eyebrow}
                    </span>
                    <span className="block truncate text-[13px] text-ink">{r.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Samma jordnära kulörer som sidomenyn/OrgTree.
const THEME = {
  platform: { bar: "border-l-[#6d6930]", chip: "bg-[#eae8d0] text-[#4f4b22]", label: "text-[#6d6930]" },
  kund: { bar: "border-l-[#b5532a]", chip: "bg-[#f5e5d9] text-[#8a3f20]", label: "text-[#b5532a]" },
  projekt: { bar: "border-l-[#5e8553]", chip: "bg-[#dde7d5] text-[#3f5c38]", label: "text-[#5e8553]" },
} as const;
