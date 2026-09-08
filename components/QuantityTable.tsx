// Mängdförteckning (MF) AMA 23 — visar pm_quantity_items grupperat per
// sektion (B/C/D/P/Y) med rad-totaler och sektions-/projekttotaler.

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PmQuantityItem } from "@/lib/db/project-extras";

const SECTION_LABELS: Record<string, string> = {
  B: "B — Förarbeten, hjälparbeten, sanering, demontering, rivning, röjning",
  C: "C — Terrassering, pålning, markförstärkning, lager i mark",
  D: "D — Marköverbyggnader, anläggningskompletteringar",
  P: "P — Apparater, ledningar i rörsystem",
  Y: "Y — Märkning, kontroll, dokumentation",
};

function formatSek(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(n);
}

interface SectionGroup {
  code: string;
  label: string;
  items: PmQuantityItem[];
  total: number;
  unpriced: number;
}

export default function QuantityTable({
  items,
  projectName,
}: {
  items: PmQuantityItem[];
  projectName: string;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(Object.keys(SECTION_LABELS)),
  );

  const groups: SectionGroup[] = useMemo(() => {
    const byCode = new Map<string, PmQuantityItem[]>();
    items.forEach((it) => {
      const key = it.ama_code ?? "Övrigt";
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key)!.push(it);
    });
    return Array.from(byCode.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, group]) => {
        const total = group.reduce((s, it) => s + (it.total ?? 0), 0);
        const unpriced = group.filter((it) => it.total === null).length;
        return {
          code,
          label: SECTION_LABELS[code] ?? code,
          items: group,
          total,
          unpriced,
        };
      });
  }, [items]);

  const projectTotal = groups.reduce((s, g) => s + g.total, 0);
  const totalUnpriced = items.filter((it) => it.total === null).length;

  function toggle(code: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="border-b border-border bg-surface px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
          Mängdförteckning · AMA Anläggning 23
        </p>
        <h1 className="mt-1 text-2xl font-medium text-ink-1">{projectName}</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-[13px]">
          <span className="text-ink-3">Sektioner: <span className="font-medium text-ink-1">{groups.length}</span></span>
          <span className="text-ink-3">Rader: <span className="font-medium text-ink-1">{items.length}</span></span>
          <span className="text-ink-3">Klumpsumma utan pris: <span className="font-medium text-ink-1">{totalUnpriced}</span></span>
          <span className="ml-auto text-ink-3">
            Summa med pris:{" "}
            <span className="font-semibold text-ink-1">{formatSek(projectTotal)}</span>
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        {groups.map((g) => {
          const isOpen = openSections.has(g.code);
          return (
            <section
              key={g.code}
              className="overflow-hidden rounded-lg border border-border bg-white"
            >
              <button
                type="button"
                onClick={() => toggle(g.code)}
                className="flex w-full items-center gap-3 border-b border-border bg-surface-2 px-4 py-3 text-left hover:bg-surface-1 transition"
              >
                {isOpen ? (
                  <ChevronDown size={16} className="text-ink-3" strokeWidth={2} />
                ) : (
                  <ChevronRight size={16} className="text-ink-3" strokeWidth={2} />
                )}
                <span className="text-[13px] font-semibold text-ink-1">{g.label}</span>
                <span className="ml-auto flex items-baseline gap-3 text-[12px]">
                  <span className="text-ink-3">{g.items.length} rader</span>
                  <span className="font-semibold text-ink-1">{formatSek(g.total)}</span>
                </span>
              </button>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-1 text-left text-ink-3">
                        <th className="px-3 py-2 font-medium">AMA-kod</th>
                        <th className="px-3 py-2 font-medium">Beskrivning</th>
                        <th className="px-3 py-2 text-right font-medium">Mängd</th>
                        <th className="px-3 py-2 font-medium">Enhet</th>
                        <th className="px-3 py-2 text-right font-medium">À-pris</th>
                        <th className="px-3 py-2 text-right font-medium">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((it) => (
                        <tr
                          key={it.id}
                          className="border-b border-border/60 last:border-b-0 hover:bg-surface-1/60"
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-ink-2">
                            {it.sub_code ?? it.ama_code}
                          </td>
                          <td className="px-3 py-2 text-ink-1">{it.description}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                            {formatNumber(it.quantity)}
                          </td>
                          <td className="px-3 py-2 text-ink-3">{it.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                            {formatSek(it.unit_price)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-ink-1">
                            {formatSek(it.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-2 font-semibold text-ink-1">
                        <td colSpan={5} className="px-3 py-2 text-right">
                          Sektion {g.code} totalt
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatSek(g.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        <div className="rounded-lg border border-ink-1 bg-ink-1 px-4 py-3 text-white">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium">Totalt prissatt MF</span>
            <span className="text-lg font-semibold tabular-nums">{formatSek(projectTotal)}</span>
          </div>
          <p className="mt-1 text-[11px] opacity-70">
            Resterande poster är klumpsummor utan satt pris och visas separat per sektion ovan.
          </p>
        </div>
      </div>
    </div>
  );
}
