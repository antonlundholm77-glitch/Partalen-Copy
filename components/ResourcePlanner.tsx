"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HORIZON,
  RESOURCE_ROSTER,
  SEED_ALLOCATIONS,
  WEEKLY_CAPACITY,
  initials,
  type Granularity,
  type PlanCustomerGroup,
  type PlanResource,
} from "@/lib/resource-planning";
import {
  setAllocation,
  clearAllocationsFor,
} from "@/app/actions/resource-allocations";

// Resursplaneringsvy: Kund ▸ Uppdrag ▸ Resurs på en tidsaxel (veckor/månader/
// kvartal). Beläggning anges i timmar/vecka och färgas mot 40h kapacitet.
// Redigeringar sparas i localStorage (ingen backend ännu).

// v3 — efter att DB blev canonical lagrar localStorage bara UI-state (vilka
// resurser som "lagts till" på ett uppdrag utan timmar än, samt vy-preferenser).
// alloc-mapen läses uteslutande från gf_resource_allocations via props.
const LS_KEY = "gf-resource-planning-v3";
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];
const COL_W: Record<Granularity, number> = { week: 54, month: 68, quarter: 88 };
const LABEL_W = 300;
const WEEKS_GENERATED = 80; // täcker upp till 6 kvartal framåt

// ── tidshjälpare ──────────────────────────────────────────────────────────
function startOfISOWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // måndag = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function isoWeek(d: Date): { year: number; week: number } {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dayNum + 3); // närmaste torsdag
  const firstThu = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((x.getTime() - firstThu.getTime()) / 6.048e8);
  return { year: x.getUTCFullYear(), week };
}

interface Week {
  id: string;
  start: Date;
  week: number;
  year: number;
  monthIdx: number;
  quarter: number;
}

interface Bucket {
  id: string;
  label: string;
  sub: string;
  bandKey: string;
  bandLabel: string;
  weekIds: string[];
}

// ── färgning ─────────────────────────────────────────────────────────────
function cellBg(hours: number, cap = WEEKLY_CAPACITY): string | undefined {
  if (!hours) return undefined;
  const r = hours / cap;
  if (r > 1.001) return "rgba(168,57,43,0.18)";
  return `rgba(94,133,83,${(0.1 + 0.45 * Math.min(r, 1)).toFixed(2)})`;
}

function summaryBg(hours: number, cap = WEEKLY_CAPACITY): string {
  if (!hours) return "transparent";
  const r = hours / cap;
  if (r > 1.001) return "rgba(168,57,43,0.28)";
  if (r > 0.95) return "rgba(154,106,30,0.24)";
  return `rgba(94,133,83,${(0.14 + 0.42 * r).toFixed(2)})`;
}

type AllocMap = Record<string, number>;
const aKey = (res: string, unit: string, week: string) => `${res}|${unit}|${week}`;
const addedKey = (unit: string, res: string) => `${unit}|${res}`;

export default function ResourcePlanner({
  groups,
  resources = RESOURCE_ROSTER,
  initialAllocations,
  initialAdded,
  projectIdByUnitKey,
}: {
  groups: PlanCustomerGroup[];
  resources?: PlanResource[];
  // Initial state från gf_resource_allocations (server-side fetch).
  // Tom map = ingen DB-data (eller RLS blockade) → seed-fallback gäller.
  initialAllocations?: AllocMap;
  initialAdded?: string[];
  // unitKey → project_id-lookup. Används av server-actionvägen för att
  // översätta UI:ns "<orgSlug>/<projectSlug>"-nyckel till gf_projects.id.
  projectIdByUnitKey?: Record<string, string>;
}) {
  // Lokala helpers som speglar capacityOf/resourceById från lib men respekterar
  // props-listan (kan vara DB-data, fixture-fallback eller tom).
  const capacityOf = (id: string): number =>
    resources.find((r) => r.id === id)?.capacity ?? WEEKLY_CAPACITY;
  const resourceById = (id: string): PlanResource | undefined =>
    resources.find((r) => r.id === id);
  const TEAM_CAPACITY = resources.reduce(
    (s, r) => s + (r.capacity ?? WEEKLY_CAPACITY),
    0,
  );
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"project" | "resource">("project");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [alloc, setAlloc] = useState<AllocMap>({});
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showEmpty, setShowEmpty] = useState<Set<string>>(new Set());

  // Tidsaxel — förankrad till måndagen i innevarande ISO-vecka (klientens "nu").
  const weeks = useMemo<Week[]>(() => {
    const base = startOfISOWeek(new Date());
    const out: Week[] = [];
    for (let i = 0; i < WEEKS_GENERATED; i++) {
      const start = new Date(base);
      start.setDate(base.getDate() + i * 7);
      const { year, week } = isoWeek(start);
      out.push({
        id: `${year}-W${week}`,
        start,
        week,
        year,
        monthIdx: start.getMonth(),
        quarter: Math.floor(start.getMonth() / 3) + 1,
      });
    }
    return out;
  }, []);

  // Initial startbild: DB-allokeringar (om finns) + offset-baserad seed-fallback.
  // SEED_ALLOCATIONS är just nu tom — canonical state är gf_resource_allocations.
  // Vi behåller seed-loopen för dev-fallback om någon vill demo:a utan DB.
  const seed = useMemo(() => {
    const a: AllocMap = { ...(initialAllocations ?? {}) };
    const ad = new Set<string>(initialAdded ?? []);
    for (const s of SEED_ALLOCATIONS) {
      for (let o = s.from; o <= s.to; o++) {
        const w = weeks[o];
        if (!w) continue;
        a[aKey(s.resourceId, s.unitKey, w.id)] = s.hours;
      }
      ad.add(addedKey(s.unitKey, s.resourceId));
    }
    return { a, ad };
  }, [weeks, initialAllocations, initialAdded]);

  // Fäll ihop kunder som saknar planerade resurser.
  const collapsedFor = (ad: Set<string>) => {
    const c = new Set<string>();
    for (const g of groups) {
      const has = g.uppdrag.some((u) => [...ad].some((k) => k.startsWith(`${u.key}|`)));
      if (!has) c.add(g.id);
    }
    return c;
  };

  // Initial state: alloc från DB (via props/seed), added unioneras med
  // localStorage så lokalt tillagda men ännu otimrade resurser överlever
  // reload. Vy-preferenser (mode/granularity) läses också ur localStorage.
  useEffect(() => {
    const ad = new Set(seed.ad);
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          added?: string[];
          mode?: "project" | "resource";
          granularity?: Granularity;
        };
        if (parsed.added) for (const k of parsed.added) ad.add(k);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.granularity) setGranularity(parsed.granularity);
      }
    } catch {
      /* trasig localStorage → ignorera */
    }
    setAlloc(seed.a);
    setAdded(ad);
    setCollapsed(collapsedFor(ad));
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, groups]);

  // Persist endast UI-state — alloc-mapen ägs av DB.
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ added: [...added], mode, granularity }),
    );
  }, [added, mode, granularity, mounted]);

  // Buckets per upplösning.
  const buckets = useMemo<Bucket[]>(() => {
    if (granularity === "week") {
      return weeks.slice(0, HORIZON.week).map((w) => ({
        id: w.id,
        label: `v${w.week}`,
        sub: "",
        bandKey: `${w.year}-${w.monthIdx}`,
        bandLabel: `${MONTHS[w.monthIdx]} ${String(w.year).slice(2)}`,
        weekIds: [w.id],
      }));
    }
    const groupKey = (w: Week) =>
      granularity === "month" ? `${w.year}-${w.monthIdx}` : `${w.year}-Q${w.quarter}`;
    const order: string[] = [];
    const map = new Map<string, Week[]>();
    for (const w of weeks) {
      const k = groupKey(w);
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k)!.push(w);
    }
    return order.slice(0, HORIZON[granularity]).map((k) => {
      const ws = map.get(k)!;
      const w0 = ws[0];
      return {
        id: k,
        label: granularity === "month" ? MONTHS[w0.monthIdx] : `Q${w0.quarter}`,
        sub: String(w0.year),
        bandKey: String(w0.year),
        bandLabel: String(w0.year),
        weekIds: ws.map((w) => w.id),
      };
    });
  }, [weeks, granularity]);

  // Sammanslagna band-celler för översta huvudraden (samma månad/år slås ihop).
  const bands = useMemo(() => {
    const out: { label: string; span: number; key: string }[] = [];
    for (const b of buckets) {
      const last = out[out.length - 1];
      if (last && last.key === b.bandKey) last.span += 1;
      else out.push({ label: b.bandLabel, span: 1, key: b.bandKey });
    }
    return out;
  }, [buckets]);

  // Platt uppdragslista (med kundnamn) — basen för resursorienterade vyn.
  const allUppdrag = useMemo(
    () =>
      groups.flatMap((g) =>
        g.uppdrag.map((u) => ({ ...u, customerName: g.name, customerId: g.id })),
      ),
    [groups],
  );

  const colW = COL_W[granularity];

  // ── värden ───────────────────────────────────────────────────────────────
  // Bucketens värde = summa timmar över dess veckor. Veckovy (1 vecka) → veckans
  // h/v; månad/kvartal → summerade timmar för hela perioden.
  const value = (res: string, unit: string, b: Bucket): number => {
    let sum = 0;
    for (const w of b.weekIds) sum += alloc[aKey(res, unit, w)] ?? 0;
    return sum;
  };

  // Kapacitet för en bucket = veckokapacitet × antal veckor i perioden.
  const weeksOf = (b: Bucket) => b.weekIds.length;
  const capFor = (weeklyCap: number, b: Bucket) => weeklyCap * weeksOf(b);
  const pctOf = (hours: number, weeklyCap: number, b: Bucket) =>
    Math.round((hours / capFor(weeklyCap, b)) * 100);

  const setValue = (res: string, unit: string, b: Bucket, hours: number) => {
    setAlloc((prev) => {
      const next = { ...prev };
      for (const w of b.weekIds) {
        const k = aKey(res, unit, w);
        if (hours > 0) next[k] = hours;
        else delete next[k];
      }
      return next;
    });
  };

  // Persistera en cellinmatning till DB. Anropas onBlur så vi får en RTT
  // per fokusexit, inte per tangenttryck. Optimistisk update sker redan
  // via setValue — om server fails loggar vi men behåller local state
  // (DB-värdet vinner vid nästa sidladdning).
  const persistCell = async (res: string, unit: string, weekId: string, hours: number) => {
    const projectId = projectIdByUnitKey?.[unit];
    if (!projectId) {
      // Uppdrag saknar DB-projekt (t.ex. fixture-only kurser) — skippa tyst.
      return;
    }
    const m = /^(\d{4})-W(\d{1,2})$/.exec(weekId);
    if (!m) {
      console.error("[ResourcePlanner] kunde inte parsa weekId:", weekId);
      return;
    }
    const isoYear = parseInt(m[1], 10);
    const isoWeek = parseInt(m[2], 10);
    const res2 = await setAllocation({ resourceId: res, projectId, isoYear, isoWeek, hours });
    if (!res2.ok) {
      console.error("[ResourcePlanner] setAllocation misslyckades:", res2.error);
    }
  };

  const resourcesOn = (unit: string): string[] =>
    resources.filter((r) => added.has(addedKey(unit, r.id))).map((r) => r.id);

  const uppdragTotal = (unit: string, b: Bucket): number =>
    resourcesOn(unit).reduce((s, r) => s + value(r, unit, b), 0);

  const resourceTotal = (res: string, b: Bucket): number =>
    groups
      .flatMap((g) => g.uppdrag)
      .reduce((s, u) => s + value(res, u.key, b), 0);

  const customerTotal = (g: PlanCustomerGroup, b: Bucket): number =>
    g.uppdrag.reduce((s, u) => s + uppdragTotal(u.key, b), 0);

  const grandTotal = (b: Bucket): number =>
    groups.reduce((s, g) => s + customerTotal(g, b), 0);

  // Enhetsetikett: veckovy visar h/v, grova vyer summerade timmar.
  const unitLabel = granularity === "week" ? "h/v" : "h";

  // Innevarande bucket (den som innehåller dagens vecka) — för "idag"-markören.
  const nowId = weeks[0]?.id;
  const isNow = (b: Bucket) => b.weekIds.includes(nowId);
  const nowAccent = (b: Bucket) => (isNow(b) ? " border-l-2 border-l-[#6d6930]" : "");

  // Beläggning redigeras bara på veckonivå — grova vyer (månad/kvartal) visar
  // aggregat read-only så veckodetaljer aldrig skrivs över av en grovinmatning.
  const editable = granularity === "week";

  const renderCell = (rid: string, unitKey: string, b: Bucket) => {
    const v = value(rid, unitKey, b);
    const wc = capacityOf(rid);
    if (!editable) {
      const avg = v ? Math.round(v / weeksOf(b)) : 0;
      return (
        <td
          key={b.id}
          className={`tnum border-b border-r border-border text-center text-[12px] text-ink-2${nowAccent(b)}`}
          style={{ width: colW, backgroundColor: cellBg(v, capFor(wc, b)) }}
          title={
            v
              ? `${v} h totalt · ${pctOf(v, wc, b)}% · snitt ${avg} h/v · redigera i veckovy`
              : "Redigera i veckovy"
          }
        >
          {v || ""}
        </td>
      );
    }
    return (
      <td
        key={b.id}
        className={`border-b border-r border-border p-0${nowAccent(b)}`}
        style={{ width: colW, backgroundColor: cellBg(v, capFor(wc, b)) }}
      >
        <input
          inputMode="numeric"
          value={v || ""}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            setValue(rid, unitKey, b, Number.isFinite(n) ? n : 0);
          }}
          onBlur={(e) => {
            // Editable är true bara i veckovy → bucket har exakt en weekId.
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            const hours = Number.isFinite(n) ? n : 0;
            void persistCell(rid, unitKey, b.weekIds[0], hours);
          }}
          className="tnum h-7 w-full bg-transparent text-center text-[12px] text-ink outline-none focus:bg-[#eae8d0]/60"
        />
      </td>
    );
  };

  const addResource = (unit: string, res: string) =>
    setAdded((prev) => new Set(prev).add(addedKey(unit, res)));

  const removeResource = (unit: string, res: string) => {
    setAdded((prev) => {
      const n = new Set(prev);
      n.delete(addedKey(unit, res));
      return n;
    });
    setAlloc((prev) => {
      const next: AllocMap = {};
      const prefix = `${res}|${unit}|`;
      for (const k of Object.keys(prev)) if (!k.startsWith(prefix)) next[k] = prev[k];
      return next;
    });
    const projectId = projectIdByUnitKey?.[unit];
    if (projectId) {
      void clearAllocationsFor(res, projectId).then((r) => {
        if (!r.ok) console.error("[ResourcePlanner] clearAllocationsFor:", r.error);
      });
    }
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-3">
        Laddar resursplanering…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Verktygsrad */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-6 py-2.5">
        <div className="inline-flex rounded-md border border-border bg-panel p-0.5">
          {(["project", "resource"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-2.5 py-1 text-[12px] font-medium transition ${
                mode === m ? "bg-[#f5e5d9] text-[#8a3f20]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {m === "project" ? "Projektvy" : "Resursvy"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border bg-panel p-0.5">
          {(["week", "month", "quarter"] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`rounded px-2.5 py-1 text-[12px] font-medium transition ${
                granularity === g
                  ? "bg-[#eae8d0] text-[#4f4b22]"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {g === "week" ? "Veckor" : g === "month" ? "Månader" : "Kvartal"}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-ink-3">
          {editable ? (
            <>
              Beläggning i <strong className="font-medium text-ink-2">h/vecka</strong> mot
              kapacitet (heltid {WEEKLY_CAPACITY}h)
            </>
          ) : (
            <>
              <strong className="font-medium text-ink-2">Summerade timmar</strong> per period mot
              kapacitet
            </>
          )}
        </span>
        <Legend />
        {!editable && (
          <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[11px] text-warn">
            Redigera i veckovy
          </span>
        )}
      </div>

      {/* Raster */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-separate border-spacing-0 text-[12px]">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 border-b border-r border-border bg-secondary px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-3"
                style={{ width: LABEL_W, minWidth: LABEL_W }}
              >
                {mode === "project" ? "Kund · Uppdrag · Resurs" : "Resurs · Uppdrag"}
              </th>
              {bands.map((band, i) => (
                <th
                  key={`${band.label}-${i}`}
                  colSpan={band.span}
                  className="sticky top-0 z-20 border-b border-r border-border bg-secondary px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-3"
                >
                  {band.label}
                </th>
              ))}
            </tr>
            <tr>
              {buckets.map((b) => {
                const now = isNow(b);
                return (
                  <th
                    key={b.id}
                    className={`sticky z-20 border-b border-r border-border px-1 py-1 text-center ${
                      now
                        ? "bg-[#eae8d0] font-semibold text-[#4f4b22] border-l-2 border-l-[#6d6930]"
                        : "bg-secondary font-medium text-ink-2"
                    }`}
                    style={{ top: 26, width: colW, minWidth: colW }}
                    title={`${b.sub ? `${b.label} ${b.sub}` : b.label}${now ? " · idag" : ""}`}
                  >
                    {b.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {mode === "project" ? (
              <Fragmentish>
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.id);
              const visible = g.uppdrag.filter(
                (u) => resourcesOn(u.key).length > 0 || showEmpty.has(g.id),
              );
              const emptyCount = g.uppdrag.length - g.uppdrag.filter((u) => resourcesOn(u.key).length > 0).length;
              return (
                <Fragmentish key={g.id}>
                  {/* Kund-rad */}
                  <tr>
                    <td
                      className="sticky left-0 z-10 cursor-pointer border-b border-r border-border bg-[#f5e5d9] px-3 py-1.5"
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                      onClick={() => toggle(collapsed, setCollapsed, g.id)}
                    >
                      <span className="flex items-center gap-1.5">
                        <Caret open={!isCollapsed} />
                        <span className="font-semibold text-[#8a3f20]">{g.name}</span>
                        <span className="text-[11px] text-[#b5532a]/70">
                          {g.uppdrag.length} uppdrag
                        </span>
                      </span>
                    </td>
                    {buckets.map((b) => {
                      const t = customerTotal(g, b);
                      return (
                        <td
                          key={b.id}
                          className={`tnum border-b border-r border-border bg-[#f5e5d9]/40 text-center text-[11px] font-semibold text-[#8a3f20]${nowAccent(b)}`}
                          style={{ width: colW }}
                          title={t ? `${g.name}: ${t} ${unitLabel}` : undefined}
                        >
                          {t || ""}
                        </td>
                      );
                    })}
                  </tr>

                  {!isCollapsed &&
                    visible.map((u) => {
                      const resIds = resourcesOn(u.key);
                      const availableToAdd = resources.filter(
                        (r) => !added.has(addedKey(u.key, r.id)),
                      );
                      return (
                        <Fragmentish key={u.key}>
                          {/* Uppdrag-rad (aggregat) */}
                          <tr>
                            <td
                              className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-7 pr-3"
                              style={{ width: LABEL_W, minWidth: LABEL_W }}
                            >
                              <span className="font-medium text-[#3f5c38]">{u.name}</span>
                              {u.program && (
                                <span className="ml-1.5 text-[10px] text-ink-3">· {u.program}</span>
                              )}
                            </td>
                            {buckets.map((b) => {
                              const t = uppdragTotal(u.key, b);
                              return (
                                <td
                                  key={b.id}
                                  className={`tnum border-b border-r border-border text-center text-[11px] text-ink-3${nowAccent(b)}`}
                                  style={{ width: colW, backgroundColor: t ? "rgba(94,133,83,0.06)" : undefined }}
                                >
                                  {t || ""}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Resurs-rader (redigerbara) */}
                          {resIds.map((rid) => {
                            const r = resourceById(rid);
                            return (
                              <tr key={rid} className="group">
                                <td
                                  className="sticky left-0 z-10 border-b border-r border-border bg-panel py-0.5 pl-12 pr-2"
                                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Avatar name={r?.name ?? rid} consultant={!!r?.role} />
                                    <span className="truncate text-ink-2">{r?.name ?? rid}</span>
                                    {r?.role && (
                                      <span className="rounded bg-[#f5e5d9] px-1 text-[9px] font-medium text-[#8a3f20]">
                                        {r.role}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeResource(u.key, rid)}
                                      title="Ta bort resurs från uppdraget"
                                      className="ml-auto text-ink-3 opacity-0 transition hover:text-danger group-hover:opacity-100"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                </td>
                                {buckets.map((b) => renderCell(rid, u.key, b))}
                              </tr>
                            );
                          })}

                          {/* Lägg till resurs */}
                          <tr>
                            <td
                              className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-12 pr-2"
                              style={{ width: LABEL_W, minWidth: LABEL_W }}
                            >
                              {availableToAdd.length > 0 ? (
                                <select
                                  value=""
                                  onChange={(e) => e.target.value && addResource(u.key, e.target.value)}
                                  className="w-full rounded border border-dashed border-border bg-transparent px-1.5 py-0.5 text-[11px] text-ink-3 hover:border-border-strong"
                                >
                                  <option value="">+ Lägg till resurs…</option>
                                  {availableToAdd.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11px] text-ink-3">Alla resurser tillagda</span>
                              )}
                            </td>
                            {buckets.map((b) => (
                              <td key={b.id} className="border-b border-r border-border" style={{ width: colW }} />
                            ))}
                          </tr>
                        </Fragmentish>
                      );
                    })}

                  {/* Visa/dölj tomma uppdrag */}
                  {!isCollapsed && emptyCount > 0 && (
                    <tr>
                      <td
                        className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-7 pr-3"
                        style={{ width: LABEL_W, minWidth: LABEL_W }}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(showEmpty, setShowEmpty, g.id)}
                          className="text-[11px] text-ink-3 hover:text-ink"
                        >
                          {showEmpty.has(g.id)
                            ? "Dölj uppdrag utan planering"
                            : `+ ${emptyCount} uppdrag utan planering`}
                        </button>
                      </td>
                      {buckets.map((b) => (
                        <td key={b.id} className="border-b border-r border-border" style={{ width: colW }} />
                      ))}
                    </tr>
                  )}
                </Fragmentish>
              );
            })}

            {/* ── Sammanställning: beläggning per resurs ── */}
            <tr>
              <td
                colSpan={buckets.length + 1}
                className="sticky left-0 z-10 border-b border-border bg-secondary px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-[#6d6930]"
              >
                Beläggning per resurs · summa över alla uppdrag (h/v mot {WEEKLY_CAPACITY}h)
              </td>
            </tr>
            {resources.map((r) => (
              <tr key={r.id}>
                <td
                  className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-4 pr-3"
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                >
                  <span className="flex items-center gap-1.5">
                    <Avatar name={r.name} consultant={!!r.role} />
                    <span className="text-ink-2">{r.name}</span>
                    <span className="ml-auto text-[10px] text-ink-3">{capacityOf(r.id)}h/v</span>
                  </span>
                </td>
                {buckets.map((b) => {
                  const t = resourceTotal(r.id, b);
                  const wc = capacityOf(r.id);
                  return (
                    <td
                      key={b.id}
                      className={`tnum border-b border-r border-border text-center text-[11px] font-medium${nowAccent(b)}`}
                      style={{ width: colW, backgroundColor: summaryBg(t, capFor(wc, b)) }}
                      title={`${t} ${unitLabel} · ${pctOf(t, wc, b)}%`}
                    >
                      {t || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
              </Fragmentish>
            ) : (
              <Fragmentish>
                {/* ── Resursorienterad vy: Resurs ▸ Uppdrag ── */}
                {resources.map((r) => {
                  const rid = r.id;
                  const isCollapsed = collapsed.has(`res:${rid}`);
                  const myUppdrag = allUppdrag.filter((u) => added.has(addedKey(u.key, rid)));
                  const hasAvailable = allUppdrag.some((u) => !added.has(addedKey(u.key, rid)));
                  return (
                    <Fragmentish key={rid}>
                      {/* Resurs-rad (kapacitet) */}
                      <tr>
                        <td
                          className="sticky left-0 z-10 cursor-pointer border-b border-r border-border bg-[#eae8d0] px-3 py-1.5"
                          style={{ width: LABEL_W, minWidth: LABEL_W }}
                          onClick={() => toggle(collapsed, setCollapsed, `res:${rid}`)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Caret open={!isCollapsed} />
                            <Avatar name={r.name} consultant={!!r.role} />
                            <span className="font-semibold text-[#4f4b22]">{r.name}</span>
                            {r.role && (
                              <span className="rounded bg-[#f5e5d9] px-1 text-[9px] font-medium text-[#8a3f20]">
                                {r.role}
                              </span>
                            )}
                            <span className="text-[11px] text-[#6d6930]">
                              {myUppdrag.length} uppdrag
                            </span>
                            <span className="ml-auto text-[10px] text-[#6d6930]">
                              {capacityOf(rid)}h/v
                            </span>
                          </span>
                        </td>
                        {buckets.map((b) => {
                          const t = resourceTotal(rid, b);
                          const wc = capacityOf(rid);
                          return (
                            <td
                              key={b.id}
                              className={`tnum border-b border-r border-border text-center text-[11px] font-semibold${nowAccent(b)}`}
                              style={{ width: colW, backgroundColor: summaryBg(t, capFor(wc, b)) }}
                              title={`${t} ${unitLabel} · ${pctOf(t, wc, b)}%`}
                            >
                              {t || ""}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Uppdrag-rader (redigerbara) */}
                      {!isCollapsed &&
                        myUppdrag.map((u) => (
                          <tr key={u.key} className="group">
                            <td
                              className="sticky left-0 z-10 border-b border-r border-border bg-panel py-0.5 pl-9 pr-2"
                              style={{ width: LABEL_W, minWidth: LABEL_W }}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="truncate">
                                  <span className="text-[11px] text-[#b5532a]">{u.customerName}</span>
                                  <span className="text-ink-3"> · </span>
                                  <span className="text-ink-2">{u.name}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeResource(u.key, rid)}
                                  title="Ta bort uppdrag från resursen"
                                  className="ml-auto text-ink-3 opacity-0 transition hover:text-danger group-hover:opacity-100"
                                >
                                  ✕
                                </button>
                              </span>
                            </td>
                            {buckets.map((b) => renderCell(rid, u.key, b))}
                          </tr>
                        ))}

                      {/* Lägg till uppdrag */}
                      {!isCollapsed && (
                        <tr>
                          <td
                            className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-9 pr-2"
                            style={{ width: LABEL_W, minWidth: LABEL_W }}
                          >
                            {hasAvailable ? (
                              <select
                                value=""
                                onChange={(e) => e.target.value && addResource(e.target.value, rid)}
                                className="w-full rounded border border-dashed border-border bg-transparent px-1.5 py-0.5 text-[11px] text-ink-3 hover:border-border-strong"
                              >
                                <option value="">+ Lägg till uppdrag…</option>
                                {groups.map((g) => {
                                  const opts = g.uppdrag.filter(
                                    (u) => !added.has(addedKey(u.key, rid)),
                                  );
                                  if (!opts.length) return null;
                                  return (
                                    <optgroup key={g.id} label={g.name}>
                                      {opts.map((u) => (
                                        <option key={u.key} value={u.key}>
                                          {u.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                })}
                              </select>
                            ) : (
                              <span className="text-[11px] text-ink-3">Alla uppdrag tillagda</span>
                            )}
                          </td>
                          {buckets.map((b) => (
                            <td key={b.id} className="border-b border-r border-border" style={{ width: colW }} />
                          ))}
                        </tr>
                      )}
                    </Fragmentish>
                  );
                })}

                {/* Sammanställning: beläggning per kund */}
                <tr>
                  <td
                    colSpan={buckets.length + 1}
                    className="sticky left-0 z-10 border-b border-border bg-secondary px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-[#b5532a]"
                  >
                    Beläggning per kund · summa över alla resurser (h/v)
                  </td>
                </tr>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td
                      className="sticky left-0 z-10 border-b border-r border-border bg-panel py-1 pl-4 pr-3"
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#f5e5d9] text-[9px] font-semibold text-[#8a3f20]">
                          {g.name.charAt(0)}
                        </span>
                        <span className="text-ink-2">{g.name}</span>
                      </span>
                    </td>
                    {buckets.map((b) => {
                      const t = customerTotal(g, b);
                      return (
                        <td
                          key={b.id}
                          className={`tnum border-b border-r border-border text-center text-[11px] font-medium text-[#8a3f20]${nowAccent(b)}`}
                          style={{ width: colW, backgroundColor: t ? "rgba(181,83,42,0.10)" : undefined }}
                          title={t ? `${g.name}: ${t} ${unitLabel}` : undefined}
                        >
                          {t || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragmentish>
            )}

            {/* Totalrad — alla timmar, mot hela teamets kapacitet */}
            <tr>
              <td
                className="sticky left-0 z-10 border-b border-r border-border bg-[#eae8d0] py-1.5 pl-4 pr-3"
                style={{ width: LABEL_W, minWidth: LABEL_W }}
              >
                <span className="font-semibold text-[#4f4b22]">
                  Totalt · alla uppdrag
                </span>
                <span className="ml-1.5 text-[10px] text-[#6d6930]">
                  mot {TEAM_CAPACITY}h ({resources.length} resurser)
                </span>
              </td>
              {buckets.map((b) => {
                const t = grandTotal(b);
                return (
                  <td
                    key={b.id}
                    className={`tnum border-b border-r border-border text-center text-[11px] font-semibold text-[#4f4b22]${nowAccent(b)}`}
                    style={{ width: colW, backgroundColor: summaryBg(t, capFor(TEAM_CAPACITY, b)) }}
                    title={`${t} ${unitLabel} · ${pctOf(t, TEAM_CAPACITY, b)}% av teamet`}
                  >
                    {t || ""}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Renderar barn utan extra DOM-nod (tabellrader får inte wrappas i en div).
function Fragmentish({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[#b5532a] transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Avatar({ name, consultant }: { name: string; consultant: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
        consultant ? "bg-[#f5e5d9] text-[#8a3f20]" : "bg-[#eae8d0] text-[#4f4b22]"
      }`}
    >
      {initials(name)}
    </span>
  );
}

function Legend() {
  const dot = (bg: string) => (
    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: bg }} />
  );
  return (
    <span className="flex items-center gap-3 text-[11px] text-ink-3">
      <span className="flex items-center gap-1">{dot("rgba(94,133,83,0.45)")} ledig</span>
      <span className="flex items-center gap-1">{dot("rgba(154,106,30,0.5)")} ~full</span>
      <span className="flex items-center gap-1">{dot("rgba(168,57,43,0.5)")} över</span>
    </span>
  );
}
