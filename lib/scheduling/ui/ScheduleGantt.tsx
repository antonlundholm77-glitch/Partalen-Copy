// Gantt-komponent för Tidplan-modulen.
//
// Visualisering:
//   - Hierarki via parentUid: top-level summaries blir sektionshuvuden
//     (grön bakgrund), depth-1 summaries blir mellanrubriker
//   - Paket-staplar färgas per disciplin (CIV/GW/UG)
//   - Position = planned_start → planned_end om sett, annars CPM:s ES/EF
//   - TODAY-markör som vertikal grön linje
//   - Hover-tooltip kvar med CPM-detaljer
//
// Komponenten är generell: en platt tidplan (inga parentUid) renderas
// som vanlig lista, en hierarkisk visar sektionsrubriker.

"use client";

import { useMemo, useState } from "react";
import type { Task } from "../types";
import type { ComputedTaskSchedule } from "../cpm";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

// Fasfärger för Gantt-sektioner
const PHASE_GREEN = "#3F6730";
const PHASE_GREEN_SOFT = "#BDE3AF";
const PHASE_GREEN_MID = "#87BE73";
const TODAY_COLOR = "#B83227";

const DISCIPLINE_COLORS: Record<string, { bar: string; fill: string; border: string }> = {
  CIV: { bar: "#5C6B2A", fill: "#eef2dc", border: "#3a4519" },
  GW:  { bar: "#8B6F47", fill: "#f5ecdf", border: "#5a4729" },
  UG:  { bar: PHASE_GREEN, fill: "#dcebd2", border: "#284820" },
  GEO: { bar: "#B85C38", fill: "#fbe5d8", border: "#7a3d24" },
  PL:  { bar: "#3A4750", fill: "#dee2e6", border: "#22282d" },
  MARK:{ bar: "#5C6B2A", fill: "#eef2dc", border: "#3a4519" },
  BAR: { bar: "#94363D", fill: "#fadfe2", border: "#5e2227" },
  BEL: { bar: "#C9A227", fill: "#fbf2cf", border: "#7e6418" },
  KOMP:{ bar: "#6E6259", fill: "#e9e6e2", border: "#473f39" },
  DOK: { bar: "#2D5582", fill: "#dbe6f1", border: "#1c3653" },
  P:   { bar: "#5D4A7B", fill: "#e1d9ef", border: "#3a2e4d" },
};
const DEFAULT_DISCIPLINE = { bar: "#0ea5e9", fill: "#e0f2fe", border: "#0c4a6e" };
const CRITICAL_DISCIPLINE = { bar: "#dc2626", fill: "#fef2f2", border: "#991b1b" };

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(iso + "T00:00:00Z"));
}

function diffMs(aIso: string, bIso: string): number {
  return new Date(bIso + "T00:00:00Z").getTime() - new Date(aIso + "T00:00:00Z").getTime();
}

function todayIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

// Härled disciplin-kod ur task. Direkt fält först, sen "Sweco · CIV"-mönstret
// i responsible som mellansteg tills vi seedat disciplineCode.
function getDisciplineCode(t: Task): string | undefined {
  if (t.disciplineCode) return t.disciplineCode;
  const m = t.responsible?.match(/\b(CIV|GW|UG|GEO|MARK|BAR|BEL|KOMP|DOK|PL|P|MIX|HYD|RAIL|ROAD|PER|GPL|DH)\b/);
  return m?.[1];
}

interface PreparedTask {
  task: Task;
  cpm: ComputedTaskSchedule;
  depth: number;
  ancestorUids: string[];
  hasChildren: boolean;
  isContinuous: boolean;
  isMilestone: boolean;
  isSummary: boolean;
  startOffsetPct: number;
  widthPct: number;
  discCode?: string;
}

export interface ScheduleGanttProps {
  tasks: Task[];
  cpmByUid: Record<string, ComputedTaskSchedule>;
  projectStart: string;
  projectFinish: string;
  scheduleName: string;
  customerName?: string;
  badge?: string;
}

export default function ScheduleGantt({
  tasks,
  cpmByUid,
  projectStart,
  projectFinish,
  scheduleName,
  customerName,
  badge,
}: ScheduleGanttProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<"year" | "quarter" | "month">("month");

  const { prepared, months, yearGroups, rangeStartIso, rangeEndIso, todayPct } = useMemo(() => {
    // Rangestart = max(idag, projektstart) - 14 dagar. Vi tittar framåt; historik
    // före idag är inte längre intressant för operativt arbete.
    const today = todayIso();
    const effectiveStartIso = projectStart > today ? projectStart : today;
    const startBuffer = new Date(effectiveStartIso + "T00:00:00Z");
    startBuffer.setUTCDate(startBuffer.getUTCDate() - 14);
    const endBuffer = new Date(projectFinish + "T00:00:00Z");
    endBuffer.setUTCDate(endBuffer.getUTCDate() + 14);
    const rs = new Date(Date.UTC(startBuffer.getUTCFullYear(), startBuffer.getUTCMonth(), 1));
    const re = new Date(Date.UTC(endBuffer.getUTCFullYear(), endBuffer.getUTCMonth() + 1, 0));
    const rangeStartIsoLocal = rs.toISOString().slice(0, 10);
    const rangeEndIsoLocal = re.toISOString().slice(0, 10);
    const rangeMs = re.getTime() - rs.getTime();

    const monthList: { label: string; year: number }[] = [];
    const cursor = new Date(rs);
    while (cursor <= re) {
      monthList.push({ label: MONTH_NAMES[cursor.getUTCMonth()], year: cursor.getUTCFullYear() });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const yg: { year: number; count: number }[] = [];
    monthList.forEach((m) => {
      const last = yg[yg.length - 1];
      if (last && last.year === m.year) last.count += 1;
      else yg.push({ year: m.year, count: 1 });
    });

    // Hierarki via parentUid → djup + ancestor-kedja
    const byUid = new Map<string, Task>();
    const childCount = new Map<string, number>();
    for (const t of tasks) byUid.set(t.uid, t);
    for (const t of tasks) {
      if (t.parentUid) {
        childCount.set(t.parentUid, (childCount.get(t.parentUid) ?? 0) + 1);
      }
    }
    function ancestorsOf(t: Task): string[] {
      const chain: string[] = [];
      let cursor: Task | undefined = t;
      const visited = new Set<string>();
      while (cursor?.parentUid && !visited.has(cursor.uid)) {
        visited.add(cursor.uid);
        const parent = byUid.get(cursor.parentUid);
        if (!parent) break;
        chain.push(parent.uid);
        cursor = parent;
      }
      return chain;
    }

    // Förbered tasks med positioner. Använd planned_start/end om finns
    // (matchar t.ex. IFR→IFC-milstolpar), annars CPM:s ES/EF.
    const prep: PreparedTask[] = [];
    for (const t of tasks) {
      const cpm = cpmByUid[t.uid];
      if (!cpm) continue;
      const startIso = t.plannedStart ?? cpm.earlyStart;
      const endIso = t.plannedEnd ?? cpm.earlyFinish;
      const sMs = new Date(startIso + "T00:00:00Z").getTime() - rs.getTime();
      const eMs = new Date(endIso + "T00:00:00Z").getTime() - rs.getTime();
      const startOffsetPct = (sMs / rangeMs) * 100;
      const widthPct = Math.max(((eMs - sMs) / rangeMs) * 100, 0.4);
      const projDays = diffMs(projectStart, projectFinish) / 86400000;
      const taskDays = Math.max(diffMs(startIso, endIso) / 86400000, 0);
      const isContinuous = taskDays >= projDays * 0.8;
      const ancestors = ancestorsOf(t);
      const isSummary = t.type === "summary";
      prep.push({
        task: t,
        cpm,
        depth: ancestors.length,
        ancestorUids: ancestors,
        hasChildren: (childCount.get(t.uid) ?? 0) > 0,
        // Continuous-stilen är bara meningsfull för summaries som spänner
        // hela projektet (t.ex. en genomgående aktivitet). Vanliga
        // paket-tasks ska alltid ha solid stapel.
        isContinuous: isSummary && isContinuous,
        isMilestone: t.type === "milestone",
        isSummary,
        startOffsetPct,
        widthPct,
        discCode: getDisciplineCode(t),
      });
    }

    // Sortera på sortOrder, sen ES
    prep.sort((a, b) =>
      a.task.sortOrder - b.task.sortOrder ||
      a.cpm.earlyStart.localeCompare(b.cpm.earlyStart),
    );

    // TODAY-position
    const tMs = new Date(today + "T00:00:00Z").getTime() - rs.getTime();
    const todayPctLocal = (tMs / rangeMs) * 100;

    return {
      prepared: prep,
      months: monthList,
      yearGroups: yg,
      rangeStartIso: rangeStartIsoLocal,
      rangeEndIso: rangeEndIsoLocal,
      todayPct: todayPctLocal >= 0 && todayPctLocal <= 100 ? todayPctLocal : null,
    };
  }, [tasks, cpmByUid, projectStart, projectFinish]);

  if (prepared.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-ink-3">
        Inga tasks att rita — kontrollera att CPM körts.
      </div>
    );
  }

  const LEFT_COL = 360;
  const ROW_H = 32;
  const SECTION_H = 36;
  const SUB_H = 30;
  // Min-bredd i px per zoom-nivå — kontrollerar tätheten på tidsskalan.
  // Year: hela tidplanen i 1100px (översikt). Quarter: 80px/månad. Month: 140px/månad.
  const MIN_W_BY_ZOOM = { year: 1100, quarter: months.length * 80 + LEFT_COL, month: months.length * 140 + LEFT_COL };
  const innerMinWidth = Math.max(1100, MIN_W_BY_ZOOM[zoom]);
  const showWeekStrip = zoom === "month";
  // Höjd på sticky kalender-header — top-level summaries klistras direkt
  // under den. Exakt matchning: 28 (år) + 28 (månad) + 18 (vecka om finns).
  const calendarHeight = showWeekStrip ? 74 : 56;

  return (
    <div className="grid h-full grid-rows-[auto_1fr] bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-5">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: PHASE_GREEN }}>
            Tidplan · CPM
          </p>
          {badge && (
            <span className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ background: PHASE_GREEN_SOFT, color: "#284820" }}>
              {badge}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-medium text-ink-1">{scheduleName}</h1>
        {customerName && (
          <p className="text-[12px] text-ink-3">{customerName}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px]">
          <span className="text-ink-3">
            Projektstart:{" "}
            <span className="font-medium text-ink-1">{fmtDate(projectStart)}</span>
          </span>
          <span className="text-ink-3">
            Projektslut (beräknat):{" "}
            <span className="font-medium text-ink-1">{fmtDate(projectFinish)}</span>
          </span>
          <span className="text-ink-3">
            Tasks: <span className="font-medium text-ink-1">{prepared.length}</span>
          </span>
          <span className="text-ink-3">
            Kritiska:{" "}
            <span className="font-medium" style={{ color: "#b91c1c" }}>
              {prepared.filter((p) => p.cpm.isCritical).length}
            </span>
          </span>
          {/* Zoom */}
          <span className="ml-auto inline-flex overflow-hidden rounded-md border border-border bg-white text-[11px]">
            {(["year", "quarter", "month"] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className="border-l border-border px-2.5 py-1 first:border-l-0"
                style={{
                  background: zoom === z ? PHASE_GREEN : "transparent",
                  color: zoom === z ? "white" : "#404040",
                  fontWeight: zoom === z ? 600 : 400,
                }}
                title={`Zoom: ${z}`}
              >
                {z === "year" ? "År" : z === "quarter" ? "Kvartal" : "Månad"}
              </button>
            ))}
          </span>
        </div>
      </div>

      {/* Gantt-grid — grid-row 1fr så scroll-container får exakt höjd.
          Sticky inom fungerar pålitligt när containern har bestämd höjd. */}
      <div className="min-h-0 overflow-auto">
        <div style={{ minWidth: innerMinWidth, background: "white", position: "relative" }}>
          {/* Header — år (sticky) */}
          <div
            className="flex border-b border-border bg-surface-2 text-[11px] font-medium text-ink-3"
            style={{ paddingLeft: LEFT_COL, position: "sticky", top: 0, zIndex: 40 }}
          >
            {yearGroups.map((yg, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-r border-border py-1.5 last:border-r-0"
                style={{ flex: yg.count, height: 28 }}
              >
                {yg.year}
              </div>
            ))}
          </div>

          {/* Header — månader (sticky under år) */}
          <div
            className="flex border-b border-border bg-surface-1 text-[10px] font-medium uppercase tracking-wider text-ink-3"
            style={{ paddingLeft: LEFT_COL, position: "sticky", top: 28, zIndex: 40 }}
          >
            {months.map((m, i) => (
              <div
                key={i}
                className="flex flex-1 items-center justify-center border-r border-border/60 py-1.5 last:border-r-0"
                style={{ height: 28 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Header — veckonummer (sticky, bara i month-zoom) */}
          {showWeekStrip && (
            <div
              className="flex border-b border-border bg-white text-[9px] font-mono uppercase tracking-wider text-ink-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
              style={{ paddingLeft: LEFT_COL, position: "sticky", top: 56, zIndex: 40 }}
            >
              {months.map((_, mi) => (
                <div
                  key={mi}
                  className="flex flex-1 border-r border-border/40 last:border-r-0"
                  style={{ height: 18 }}
                >
                  {Array.from({ length: 4 }, (_, wi) => (
                    <div
                      key={wi}
                      className="flex flex-1 items-center justify-center"
                      style={{ borderRight: wi < 3 ? "1px dashed rgba(0,0,0,0.08)" : undefined }}
                    >
                      v{((mi * 4 + wi) % 52) + 1}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Skugga under hela sticky-headern (bara år-rad om inga andra) */}
          {!showWeekStrip && (
            <div
              className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
              style={{ position: "sticky", top: 56, zIndex: 39, height: 0 }}
            />
          )}

          {/* Task-rader */}
          <div className="relative">
            {prepared
              .filter((p) => !p.ancestorUids.some((u) => collapsed.has(u)))
              .map((p) => {
              const isHover = selectedUid === p.task.uid;
              const critical = p.cpm.isCritical;
              const palette = critical
                ? CRITICAL_DISCIPLINE
                : DISCIPLINE_COLORS[p.discCode ?? ""] ?? DEFAULT_DISCIPLINE;
              const isNegFloat = p.cpm.totalFloatDays < 0;

              // Summary-rader: sektionshuvud
              if (p.isSummary) {
                const isTop = p.depth === 0;
                const isCollapsed = collapsed.has(p.task.uid);
                const canToggle = p.hasChildren;
                const toggle = () => {
                  if (!canToggle) return;
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.task.uid)) next.delete(p.task.uid);
                    else next.add(p.task.uid);
                    return next;
                  });
                };
                return (
                  <div
                    key={p.task.uid}
                    className="flex border-b"
                    style={{
                      height: isTop ? SECTION_H : SUB_H,
                      borderColor: isTop ? PHASE_GREEN : "rgba(0,0,0,0.08)",
                      // Top-summaries: solid Sweco-grön. Sub-summaries (CAS, CSP m.fl.):
                      // ljus grön ton — använder solid bakgrund i sticky-läge så
                      // raderna under inte syns igenom.
                      background: isTop ? PHASE_GREEN : "#E8F0E1",
                      color: isTop ? "white" : PHASE_GREEN,
                      cursor: canToggle ? "pointer" : "default",
                      // Top-level summaries klistras under kalendern så man alltid
                      // ser vilken grupp (Hot/Cold/Other Side) man är i.
                      position: isTop ? "sticky" : undefined,
                      top: isTop ? calendarHeight : undefined,
                      zIndex: isTop ? 15 : undefined,
                    }}
                    onClick={toggle}
                  >
                    <div
                      className="flex shrink-0 items-center gap-2 px-3"
                      style={{
                        width: LEFT_COL,
                        paddingLeft: 8 + p.depth * 14,
                        borderRight: isTop ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(63,103,48,0.15)",
                        // Sticky left så task-info-kolumnen alltid syns vid horisontell scroll
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                        background: isTop ? PHASE_GREEN : "#E8F0E1",
                      }}
                    >
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center font-mono text-[10px]"
                        style={{
                          width: 14,
                          opacity: canToggle ? 0.9 : 0.25,
                          transform: isCollapsed ? "none" : "rotate(90deg)",
                          transition: "transform 0.1s ease",
                        }}
                      >
                        ▶
                      </span>
                      <span
                        className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                        style={{ minWidth: 56, opacity: 0.85 }}
                        title={p.task.uid}
                      >
                        {p.task.wbsCode ?? p.task.uid}
                      </span>
                      <span
                        className="truncate text-[12.5px]"
                        style={{ fontWeight: isTop ? 600 : 500 }}
                      >
                        {p.task.name}
                      </span>
                    </div>
                    <div className="relative flex-1">
                      {/* Tunn linje över sektionsspannet — visar dess samlade tidsfönster */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded"
                        style={{
                          left: `${p.startOffsetPct}%`,
                          width: `${p.widthPct}%`,
                          height: isTop ? 4 : 3,
                          background: isTop ? "rgba(255,255,255,0.55)" : PHASE_GREEN,
                          opacity: isTop ? 0.7 : 0.45,
                        }}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.task.uid}
                  className="relative flex border-b border-border/60 hover:bg-surface-1/60"
                  style={{ height: ROW_H, cursor: "pointer" }}
                  onClick={() =>
                    setSelectedUid((u) => (u === p.task.uid ? null : p.task.uid))
                  }
                >
                  {/* Vänster — task info (sticky left så den alltid syns) */}
                  <div
                    className="flex shrink-0 items-center gap-2 border-r border-border"
                    style={{
                      width: LEFT_COL,
                      paddingLeft: 12 + p.depth * 14,
                      paddingRight: 10,
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                      background: "white",
                    }}
                  >
                    {/* WBS-/uid-ref */}
                    <span
                      className="rounded border bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-3"
                      style={{ borderColor: "rgba(0,0,0,0.1)" }}
                      title={p.task.uid}
                    >
                      {p.task.wbsCode ?? p.task.uid}
                    </span>
                    {/* Disciplin-badge */}
                    {p.discCode && (
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-white"
                        style={{ background: palette.bar }}
                      >
                        {p.discCode}
                      </span>
                    )}
                    {/* Namn */}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-1">
                      {p.task.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-3">
                      {p.task.durationDays ?? 0}d
                    </span>
                  </div>

                  {/* Höger — Gantt-bar (overflow hidden så staplar inte sticker
                      ut åt vänster om planned_start ligger före rangeStart) */}
                  <div className="relative flex-1 overflow-hidden">
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
                    {p.isMilestone ? (
                      <div
                        className="absolute top-1/2"
                        style={{
                          left: `${p.startOffsetPct}%`,
                          width: 14, height: 14,
                          background: palette.bar,
                          transform: "translate(-50%, -50%) rotate(45deg)",
                        }}
                        title={`${p.task.name} — ${p.cpm.earlyStart}`}
                      />
                    ) : p.isContinuous ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded"
                        style={{
                          left: `${p.startOffsetPct}%`,
                          width: `${p.widthPct}%`,
                          height: 12,
                          background: `repeating-linear-gradient(135deg, ${palette.fill}, ${palette.fill} 5px, transparent 5px, transparent 10px)`,
                          border: `1px solid ${palette.border}`,
                        }}
                      />
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded"
                        style={{
                          left: `${p.startOffsetPct}%`,
                          width: `${p.widthPct}%`,
                          height: 18,
                          background: palette.fill,
                          border: `${isNegFloat ? 2 : 1}px solid ${palette.border}`,
                          boxShadow: isNegFloat ? "0 0 0 1px #fca5a5" : undefined,
                        }}
                      >
                        {p.task.percentComplete > 0 && (
                          <div
                            className="h-full rounded-l"
                            style={{
                              width: `${p.task.percentComplete}%`,
                              background: palette.bar,
                              opacity: 0.7,
                            }}
                          />
                        )}
                      </div>
                    )}

                  </div>
                  {/* Klick-tooltip — utanför Gantt-cellens overflow-hidden så
                      den inte klipps. Position relateras till row (parent
                      med className="relative ..."). */}
                  {isHover && (
                    <div
                      className="absolute z-40 rounded-md border border-border bg-white p-2.5 shadow-lg"
                      style={{
                        left: LEFT_COL + 12,
                        top: ROW_H,
                        minWidth: 280,
                        maxWidth: 380,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 text-[12px] font-semibold text-ink-1">
                          {p.task.wbsCode ?? p.task.uid} · {p.task.name}
                        </div>
                        <button
                          type="button"
                          aria-label="Stäng"
                          className="shrink-0 rounded text-ink-3 hover:bg-surface-1 hover:text-ink-1"
                          style={{ width: 18, height: 18, lineHeight: "16px", fontSize: 14 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUid(null);
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
                        {p.task.plannedStart && (
                          <>
                            <span>Planerad start</span>
                            <span className="font-medium text-ink-1">{fmtDate(p.task.plannedStart)}</span>
                          </>
                        )}
                        {p.task.plannedEnd && (
                          <>
                            <span>Planerad klar</span>
                            <span className="font-medium text-ink-1">{fmtDate(p.task.plannedEnd)}</span>
                          </>
                        )}
                        <span>ES (Early Start)</span>
                        <span className="text-ink-2">{fmtDate(p.cpm.earlyStart)}</span>
                        <span>EF (Early Finish)</span>
                        <span className="text-ink-2">{fmtDate(p.cpm.earlyFinish)}</span>
                        <span>Duration</span>
                        <span className="font-mono text-ink-2">{p.task.durationDays ?? 0} arbetsdagar</span>
                        <span>Total float</span>
                        <span
                          className="font-mono font-medium"
                          style={{ color: critical ? "#dc2626" : "#16a34a" }}
                        >
                          {p.cpm.totalFloatDays} d
                          {critical && " — KRITISK"}
                          {isNegFloat && " ⚠ konflikt"}
                        </span>
                        {p.discCode && (
                          <>
                            <span>Disciplin</span>
                            <span className="font-mono font-medium" style={{ color: palette.bar }}>
                              {p.discCode}
                            </span>
                          </>
                        )}
                      </div>
                      {p.task.constraint && (
                        <div className="mt-1.5 text-[10px] text-ink-3">
                          Constraint:{" "}
                          <span className="font-mono font-medium text-ink-1">
                            {p.task.constraint.type}
                            {p.task.constraint.date ? ` ${p.task.constraint.date}` : ""}
                          </span>
                        </div>
                      )}
                      {p.task.notes && (
                        <div className="mt-1 text-[10px] italic text-ink-3">{p.task.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* TODAY-markör — sträcker över hela list-höjden */}
            {todayPct !== null && (
              <div
                className="pointer-events-none absolute inset-y-0"
                style={{
                  left: `calc(${LEFT_COL}px + ${todayPct}% * (100% - ${LEFT_COL}px) / 100)`,
                  width: 0,
                }}
              >
                <div
                  className="absolute inset-y-0"
                  style={{
                    width: 2,
                    background: TODAY_COLOR,
                    transform: "translateX(-50%)",
                    opacity: 0.7,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-3">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded"
              style={{ background: DISCIPLINE_COLORS.CIV.fill, border: `1px solid ${DISCIPLINE_COLORS.CIV.border}` }}
            />
            CIV — Civil
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded"
              style={{ background: DISCIPLINE_COLORS.GW.fill, border: `1px solid ${DISCIPLINE_COLORS.GW.border}` }}
            />
            GW — Groundwater
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded"
              style={{ background: DISCIPLINE_COLORS.UG.fill, border: `1px solid ${DISCIPLINE_COLORS.UG.border}` }}
            />
            UG — Underground
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded"
              style={{ background: CRITICAL_DISCIPLINE.fill, border: `1px solid ${CRITICAL_DISCIPLINE.border}` }}
            />
            Kritisk linje
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block"
              style={{ width: 12, height: 12, background: PHASE_GREEN, transform: "rotate(45deg)" }}
            />
            Milstolpe
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block"
              style={{ width: 2, height: 14, background: TODAY_COLOR }}
            />
            Idag
          </span>
        </div>

        <div className="mt-2 text-[10px] text-ink-3">
          Visuellt fönster: {rangeStartIso} → {rangeEndIso}
        </div>
      </div>
    </div>
  );
}
