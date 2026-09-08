"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ProjectStub {
  id: string;
  name: string;
}

export interface UnitGroup {
  id: string; // kund-id
  name: string; // kundnamn
  unitNoun: string;
  unitNounPlural: string;
  units: ProjectStub[];
}

// Global dropdown i headern: visa ALLA projekt grupperade per kund och
// hoppa direkt dit — kunden fylls i via routen. Visas alltid; utan vald enhet
// står "Välj projekt". Inom samma kund bevaras aktuell modul (segment).
export default function ProjectSwitcher({
  base,
  currentCustomerId,
  currentProjectId,
  groups,
}: {
  base: string; // "/c"
  currentCustomerId?: string;
  currentProjectId?: string;
  groups: UnitGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fall tillbaka på senast besökt projekt per kund (samma minne som Sidebar
  // använder) så att triggern fortsätter visa projektet när man traverserar
  // tillbaka till kundnivån.
  const [rememberedProjectId, setRememberedProjectId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!currentCustomerId) {
      setRememberedProjectId(undefined);
      return;
    }
    const key = `gf-last-project:${currentCustomerId}`;
    if (currentProjectId) {
      localStorage.setItem(key, currentProjectId);
      setRememberedProjectId(currentProjectId);
    } else {
      setRememberedProjectId(localStorage.getItem(key) ?? undefined);
    }
  }, [currentCustomerId, currentProjectId]);
  const effectiveProjectId = currentProjectId ?? rememberedProjectId;

  // Är en kund vald visas bara den kundens enheter; annars allt grupperat
  // (så man kan välja projekt/kurs på tvären från landningen).
  const visibleGroups = currentCustomerId
    ? groups.filter((g) => g.id === currentCustomerId)
    : groups;

  // Aktuell enhet (för triggerns etikett) över alla grupper — använd minnet
  // som fallback så namnet ligger kvar tänt på kundnivån.
  const current = groups
    .flatMap((g) => g.units.map((u) => ({ ...u, custId: g.id })))
    .find((u) => u.custId === currentCustomerId && u.id === effectiveProjectId);

  // Modulväg att bevara vid byte inom samma kund.
  const curBase =
    currentCustomerId && currentProjectId
      ? `${base}/${currentCustomerId}/${currentProjectId}`
      : "";
  const segment = curBase && pathname.startsWith(curBase) ? pathname.slice(curBase.length) : "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] hover:bg-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#5e8553]" />
        <strong className={current ? "font-medium text-ink" : "font-medium text-ink-3"}>
          {current?.name ?? "Välj projekt"}
        </strong>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1 max-h-[70vh] w-80 overflow-y-auto rounded-md border border-border bg-panel py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {currentCustomerId
                ? `Byt ${visibleGroups[0]?.unitNoun ?? "projekt"}`
                : "Projekt"}
            </div>
            {visibleGroups.map((g) => (
              <div key={g.id} className="mt-0.5">
                {!currentCustomerId && (
                  <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-0.5 text-[11px] font-semibold text-[#8a3f20]">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-[#f5e5d9] text-[9px] font-semibold text-[#8a3f20]">
                      {g.name.charAt(0)}
                    </span>
                    <span className="truncate">{g.name}</span>
                  </div>
                )}
                {g.units.length === 0 ? (
                  <div className={`pb-1 pr-3 text-[12px] italic text-ink-3 ${currentCustomerId ? "px-3" : "pl-8"}`}>
                    inga {g.unitNounPlural.toLowerCase()} än
                  </div>
                ) : (
                  g.units.map((u) => {
                    const active = g.id === currentCustomerId && u.id === currentProjectId;
                    const keepSeg = g.id === currentCustomerId ? segment : "";
                    return (
                      <Link
                        key={`${g.id}/${u.id}`}
                        href={`${base}/${g.id}/${u.id}${keepSeg}`}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between gap-2 py-1.5 pr-3 text-[13px] hover:bg-secondary ${
                          currentCustomerId ? "pl-3" : "pl-8"
                        } ${active ? "font-medium text-accent" : "text-ink"}`}
                      >
                        <span className="truncate">{u.name}</span>
                        {active && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
