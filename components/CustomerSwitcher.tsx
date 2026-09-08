"use client";

import { useState } from "react";
import Link from "next/link";

export interface CustomerStub {
  id: string;
  name: string;
}

// Diskret dropdown i headern för att välja/växla kund. Visas alltid — utan vald
// kund står "Välj kund". Länkar till kundens landning.
export default function CustomerSwitcher({
  custBase,
  currentId,
  customers,
}: {
  custBase: string;
  currentId?: string;
  customers: CustomerStub[];
}) {
  const [open, setOpen] = useState(false);
  const current = currentId ? customers.find((c) => c.id === currentId) : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] hover:bg-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#f5e5d9] text-[10px] font-semibold text-[#8a3f20]">
          {(current?.name ?? "?").charAt(0)}
        </span>
        <strong className={current ? "font-medium text-ink" : "font-medium text-ink-3"}>
          {current?.name ?? "Välj kund"}
        </strong>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1 max-h-[70vh] w-72 overflow-y-auto rounded-md border border-border bg-panel py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {current ? "Byt kund" : "Välj kund"}
            </div>
            {customers.map((c) => {
              const active = c.id === currentId;
              return (
                <Link
                  key={c.id}
                  href={`${custBase}/${c.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-[13px] hover:bg-secondary ${
                    active ? "font-medium text-accent" : "text-ink"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
