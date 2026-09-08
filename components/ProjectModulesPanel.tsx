"use client";

// Verktygsväljare per projekt. Togglar gf_project_modules-overrides. Saknas
// override → modul-default visas (live/soon-tillstånd från lib/modules).
// Override "av" → modulen göms i Sidebar/Launchpad (kräver att consumers
// läser overrides — se uppdatering av lib/data/Sidebar).

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { PROJECT_MODULES, type NavItem } from "@/lib/modules";
import {
  setProjectModuleEnabled,
  clearProjectModuleOverride,
  type ModuleActionResult,
} from "@/app/actions/project-modules";

export default function ProjectModulesPanel({
  orgSlug,
  projectSlug,
  unitKind,
  overrides,
}: {
  orgSlug: string;
  projectSlug: string;
  unitKind: "entreprenad";
  overrides: Record<string, boolean>; // module_id → enabled (saknas = default)
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(
    null,
  );

  void unitKind;
  const catalog: NavItem[] = PROJECT_MODULES;
  // Behörighets-modulen styrs separat (alltid på). Filtrera bort.
  const togglable = catalog.filter((m) => m.key !== "behorighet");

  function run(action: () => Promise<ModuleActionResult>, msg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) setFeedback({ kind: "ok", msg });
      else setFeedback({ kind: "error", msg: res.error });
    });
  }

  function effectiveState(moduleId: string): "default" | "on" | "off" {
    if (!(moduleId in overrides)) return "default";
    return overrides[moduleId] ? "on" : "off";
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={
            feedback.kind === "ok"
              ? "rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800"
              : "rounded border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800"
          }
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {togglable.map((m) => {
          const state = effectiveState(m.key);
          const isOff = state === "off";
          return (
            <div
              key={m.key}
              className={`rounded-lg border bg-surface p-3 transition ${
                isOff ? "border-border opacity-60" : "border-border-2"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.label}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10.5px] uppercase tracking-wide text-ink-3">
                      {m.status === "live" ? "Live" : "Snart"}
                    </span>
                    {state !== "default" && (
                      <span className="rounded bg-accent-bg px-1.5 py-0.5 text-[10.5px] text-accent-text">
                        Override
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-fg-3">{m.blurb}</p>
                </div>
                <div className="shrink-0">
                  <select
                    disabled={pending}
                    value={state}
                    onChange={(e) => {
                      const next = e.target.value as "default" | "on" | "off";
                      if (next === "default") {
                        run(
                          () => clearProjectModuleOverride(orgSlug, projectSlug, m.key),
                          `${m.label}: återgår till default.`,
                        );
                      } else {
                        run(
                          () =>
                            setProjectModuleEnabled(
                              orgSlug,
                              projectSlug,
                              m.key,
                              next === "on",
                            ),
                          `${m.label}: ${next === "on" ? "påslagen" : "avstängd"}.`,
                        );
                      }
                    }}
                    className="rounded border border-border bg-surface px-2 py-[5px] text-[12.5px]"
                  >
                    <option value="default">Default</option>
                    <option value="on">På</option>
                    <option value="off">Av</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-fg-3">
        <strong>Default</strong> = följer modulens generella tillgänglighet (Live/Snart).{" "}
        <strong>På</strong> tvingar på, <strong>Av</strong> gömmer modulen för projektet.
      </p>
    </div>
  );
}
