"use client";

import { useState } from "react";
import { OVERVIEW, PROJECT_MODULES } from "@/lib/modules";
import { moduleIcon } from "@/lib/icons";

// Back-end-läge per modul — gör konsolideringen mot Supabase synlig.
const MODULE_BACKEND: Record<string, string> = {
  oversikt: "Supabase",
  smartprep: "Statisk (fixtur)",
  projektkarta: "Kartmotor (OL)",
  dokument: "Supabase",
  behorighet: "Supabase",
  tidplan: "Supabase",
  process: "Supabase",
  teknik: "Supabase",
  leverabler: "Supabase",
  sammanfattning: "Supabase",
  mangd: "Supabase",
  risk: "Statisk",
  arbetsmiljo: "Statisk",
  omraden: "Statisk",
  genomforande: "Statisk",
  fragor: "Statisk",
  kontrollplan: "Statisk",
  moten: "Statisk",
};

function backendChip(label: string): string {
  if (label === "Supabase") return "bg-success-bg text-success-text";
  if (label.startsWith("Kartmotor")) return "bg-accent-bg text-accent-text";
  if (label.startsWith("Statisk")) return "bg-secondary text-ink-2";
  return "bg-secondary text-ink-3"; // platshållare
}

function StatusChip({ live }: { live: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        live ? "bg-[#dde7d5] text-[#3f5c38]" : "bg-secondary text-ink-3"
      }`}
    >
      {live ? "Live" : "Snart"}
    </span>
  );
}

type View = "kort" | "lista";

export default function ModuleCatalog() {
  const [view, setView] = useState<View>("kort");
  const modules = [OVERVIEW, ...PROJECT_MODULES];

  return (
    <>
      <div className="mb-1 mt-10 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5e8553]">
          Project OS — moduler
        </h2>
        <div className="flex items-center gap-1 rounded-md border border-border bg-panel p-0.5 text-[13px]">
          {(["kort", "lista"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 capitalize ${
                view === v ? "bg-secondary font-medium text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <p className="text-ink-2 mb-3 text-sm">
        Vad vi har i Project OS i dag. Syfte framåt: konsolidera till stabila komponenter mot Supabase.
      </p>

      {view === "kort" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const I = moduleIcon(m.key);
            const backend = MODULE_BACKEND[m.key] ?? "Platshållare";
            return (
              <div key={m.key} className="rounded-lg border border-border bg-panel p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#dde7d5] text-[#3f5c38]">
                    <I size={18} strokeWidth={1.75} />
                  </span>
                  <StatusChip live={m.status === "live"} />
                </div>
                <div className="mt-3 font-medium">{m.label}</div>
                <p className="text-ink-2 mt-0.5 text-[12px] leading-snug">{m.blurb}</p>
                <div className="mt-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${backendChip(backend)}`}>
                    {backend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-panel">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-medium">Modul</th>
                <th className="px-3 py-2 font-medium">Beskrivning</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Back-end</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const I = moduleIcon(m.key);
                const backend = MODULE_BACKEND[m.key] ?? "Platshållare";
                return (
                  <tr key={m.key} className="border-b border-border align-top last:border-0 hover:bg-secondary/30">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        <I size={15} strokeWidth={1.75} className="text-[#5e8553]" />
                        {m.label}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-3 py-2 text-ink-2">{m.blurb}</td>
                    <td className="px-3 py-2">
                      <StatusChip live={m.status === "live"} />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${backendChip(backend)}`}>
                        {backend}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
