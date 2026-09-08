// Gantt-vy: horisontella staplar per fas över månadsrutnät.
// Startdatum chain:as från föregående fas completion_date (faserna är
// sekventiella när man sorterar på completion_date). Genomgående
// aktiviteter (heuristik: namnet innehåller "GENOMGÅENDE") visas som en
// separat heldragen stapel som spänner hela projektet.

"use client";

import { useMemo, useState } from "react";
import type { PmPhase } from "@/lib/db/deliverables";

interface ComputedPhase {
  phase: PmPhase;
  startDate: Date;
  endDate: Date;
  startOffsetPct: number; // 0–100
  widthPct: number; // 0–100
  isContinuous: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function statusColors(status: string): { bg: string; bar: string; fill: string } {
  switch (status) {
    case "completed":
      return { bg: "#dcfce7", bar: "#16a34a", fill: "#16a34a" };
    case "in-progress":
      return { bg: "#fef3c7", bar: "#d97706", fill: "#f59e0b" };
    default:
      return { bg: "#e0f2fe", bar: "#0c4a6e", fill: "#0ea5e9" };
  }
}

export default function PhaseGantt({
  phases,
  projectName,
  projectStart,
}: {
  phases: PmPhase[];
  projectName: string;
  // Valfri override; annars härleds till första fasens completion - 2 mån.
  projectStart?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { computed, months, rangeStart, rangeEnd } = useMemo(() => {
    const withDates = phases.filter((p) => p.completion_date);
    if (withDates.length === 0) {
      return {
        computed: [] as ComputedPhase[],
        months: [] as { label: string; year: number }[],
        rangeStart: new Date(),
        rangeEnd: new Date(),
      };
    }

    // Sortera kronologiskt på completion_date för chain
    const sorted = [...withDates].sort(
      (a, b) =>
        new Date(a.completion_date!).getTime() - new Date(b.completion_date!).getTime(),
    );

    // Projektstart: explicit prop annars första completion minus 2 mån
    const firstCompletion = new Date(sorted[0].completion_date!);
    const inferredStart = new Date(firstCompletion);
    inferredStart.setMonth(inferredStart.getMonth() - 2);
    const startOfRange = projectStart ? new Date(projectStart) : inferredStart;

    const lastCompletion = new Date(sorted[sorted.length - 1].completion_date!);
    const endOfRange = new Date(lastCompletion);
    endOfRange.setDate(endOfRange.getDate() + 7); // liten marginal

    const rangeMs = endOfRange.getTime() - startOfRange.getTime();

    // Chain start/end per fas
    let prevEnd = startOfRange;
    const result: ComputedPhase[] = sorted.map((p) => {
      const isContinuous = /genomgående|löpande|continuous/i.test(p.name);
      const completion = new Date(p.completion_date!);

      let start: Date;
      let end: Date;
      if (isContinuous) {
        start = startOfRange;
        end = endOfRange;
      } else {
        start = prevEnd;
        end = completion;
        prevEnd = completion;
      }

      const startOffsetPct = ((start.getTime() - startOfRange.getTime()) / rangeMs) * 100;
      const widthPct = ((end.getTime() - start.getTime()) / rangeMs) * 100;

      return {
        phase: p,
        startDate: start,
        endDate: end,
        startOffsetPct,
        widthPct,
        isContinuous,
      };
    });

    // Originalordning från pm_phases sort_order (etappnummer)
    result.sort((a, b) => a.phase.sort_order - b.phase.sort_order);

    // Generera månadsetiketter
    const monthList: { label: string; year: number }[] = [];
    const cursor = new Date(startOfRange.getFullYear(), startOfRange.getMonth(), 1);
    while (cursor <= endOfRange) {
      monthList.push({
        label: MONTH_NAMES[cursor.getMonth()],
        year: cursor.getFullYear(),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      computed: result,
      months: monthList,
      rangeStart: startOfRange,
      rangeEnd: endOfRange,
    };
  }, [phases, projectStart]);

  if (computed.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-ink-3">
        Inga faser med avslutsdatum att rita.
      </div>
    );
  }

  // Gruppera månader per år för dubbel header
  const yearGroups: { year: number; count: number }[] = [];
  months.forEach((m) => {
    const last = yearGroups[yearGroups.length - 1];
    if (last && last.year === m.year) last.count += 1;
    else yearGroups.push({ year: m.year, count: 1 });
  });

  const LEFT_COL = 220; // px för fasnamnen
  const ROW_H = 40;

  return (
    <div className="bg-surface">
      <div className="border-b border-border bg-surface px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
          Tidplan · Gantt
        </p>
        <h1 className="mt-1 text-2xl font-medium text-ink-1">{projectName}</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-[13px]">
          <span className="text-ink-3">
            Period:{" "}
            <span className="font-medium text-ink-1">
              {fmtDate(rangeStart)} → {fmtDate(rangeEnd)}
            </span>
          </span>
          <span className="text-ink-3">
            Etapper: <span className="font-medium text-ink-1">{computed.length}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-6">
        <div className="min-w-[900px] rounded-lg border border-border bg-white">
          {/* Header — år */}
          <div
            className="flex border-b border-border bg-surface-2 text-[11px] font-medium text-ink-3"
            style={{ paddingLeft: LEFT_COL }}
          >
            {yearGroups.map((yg, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-r border-border py-1.5 last:border-r-0"
                style={{ flex: yg.count }}
              >
                {yg.year}
              </div>
            ))}
          </div>

          {/* Header — månader */}
          <div
            className="flex border-b border-border bg-surface-1 text-[10px] font-medium uppercase tracking-wider text-ink-3"
            style={{ paddingLeft: LEFT_COL }}
          >
            {months.map((m, i) => (
              <div
                key={i}
                className="flex flex-1 items-center justify-center border-r border-border/60 py-1.5 last:border-r-0"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Rader */}
          <div className="relative">
            {computed.map((c, idx) => {
              const colors = statusColors(c.phase.status);
              const isHover = hoverIdx === idx;
              return (
                <div
                  key={c.phase.id}
                  className="flex border-b border-border/60 last:border-b-0 hover:bg-surface-1/60"
                  style={{ height: ROW_H }}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {/* Vänster: etapp + namn */}
                  <div
                    className="flex shrink-0 items-center gap-3 border-r border-border px-3"
                    style={{ width: LEFT_COL }}
                  >
                    <span className="font-mono text-[11px] font-semibold text-ink-3">
                      {c.phase.stage.padStart(2, "0")}
                    </span>
                    <span className="truncate text-[12.5px] font-medium text-ink-1">
                      {c.phase.name}
                    </span>
                  </div>

                  {/* Höger: stapel */}
                  <div className="relative flex-1">
                    {/* Månads-rutnät */}
                    <div className="absolute inset-0 flex">
                      {months.map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-border/40 last:border-r-0"
                        />
                      ))}
                    </div>

                    {/* Stapel */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded"
                      style={{
                        left: `${c.startOffsetPct}%`,
                        width: `${Math.max(c.widthPct, 0.5)}%`,
                        height: c.isContinuous ? 10 : 22,
                        background: c.isContinuous
                          ? `repeating-linear-gradient(135deg, ${colors.bg}, ${colors.bg} 4px, transparent 4px, transparent 8px)`
                          : colors.bg,
                        border: `1px solid ${colors.bar}`,
                      }}
                    >
                      {/* Framstegs-fyllning */}
                      {!c.isContinuous && c.phase.progress > 0 && (
                        <div
                          className="h-full rounded-l"
                          style={{
                            width: `${c.phase.progress}%`,
                            background: colors.fill,
                            opacity: 0.7,
                          }}
                        />
                      )}
                      {/* Etiketten visas vid hover eller om stapeln är bred nog */}
                      {!c.isContinuous && c.widthPct > 8 && (
                        <span
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 font-mono text-[10px] font-semibold"
                          style={{ color: colors.bar, left: 4 }}
                        >
                          {fmtDate(c.endDate)}
                        </span>
                      )}
                    </div>

                    {/* Hover-tooltip */}
                    {isHover && (
                      <div
                        className="pointer-events-none absolute z-10 rounded-md border border-border bg-white p-2 shadow-lg"
                        style={{
                          left: `min(${c.startOffsetPct + c.widthPct / 2}%, calc(100% - 220px))`,
                          top: ROW_H,
                          minWidth: 200,
                        }}
                      >
                        <div className="text-[12px] font-semibold text-ink-1">
                          Etapp {c.phase.stage} · {c.phase.name}
                        </div>
                        <div className="mt-1 text-[11px] text-ink-3">
                          {c.isContinuous
                            ? "Genomgående aktivitet (hela projektet)"
                            : `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`}
                        </div>
                        {!c.isContinuous && (
                          <div className="mt-0.5 text-[11px] text-ink-3">
                            Framsteg: <span className="font-medium text-ink-1">{c.phase.progress}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-3">
          <LegendChip label="Kommande" bg="#e0f2fe" border="#0c4a6e" />
          <LegendChip label="Pågående" bg="#fef3c7" border="#d97706" />
          <LegendChip label="Avslutad" bg="#dcfce7" border="#16a34a" />
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-6"
              style={{
                background:
                  "repeating-linear-gradient(135deg, #e0f2fe, #e0f2fe 4px, transparent 4px, transparent 8px)",
                border: "1px solid #0c4a6e",
              }}
            />
            Genomgående
          </span>
        </div>
      </div>
    </div>
  );
}

function LegendChip({
  label,
  bg,
  border,
}: {
  label: string;
  bg: string;
  border: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-3 w-6 rounded"
        style={{ background: bg, border: `1px solid ${border}` }}
      />
      {label}
    </span>
  );
}
