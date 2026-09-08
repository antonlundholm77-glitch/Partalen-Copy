"use client";

import { useMemo, useState } from "react";
import type { AmaCode, MfRow, TbEntry } from "@/lib/types";
import {
  buildNodeMap,
  formatAmount,
  formatPrice,
  formatQty,
  getBreadcrumb,
  getDescendants,
  getInherited,
  roots,
  type NodeMap,
} from "@/lib/tree";

export default function ProjectExplorer({
  codes,
  tb,
  mf,
}: {
  codes: AmaCode[];
  tb: TbEntry[];
  mf: MfRow[];
}) {
  const map = useMemo(() => buildNodeMap(codes, tb, mf), [codes, tb, mf]);
  const topCodes = useMemo(() => roots(map), [map]);

  // Förvälj en kod med mängdrader så detaljpanelen visar något direkt.
  const initial = useMemo(() => {
    const withMf = codes.find((c) => map[c.code]?.mf.length);
    return withMf?.code ?? topCodes[0] ?? null;
  }, [codes, map, topCodes]);

  const [selected, setSelected] = useState<string | null>(initial);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([...topCodes, ...(initial ? getBreadcrumb(map, initial) : [])]),
  );

  // Markera + auto-expandera vägen ner till noden så den syns i trädet.
  const handleSelect = (code: string) => {
    setSelected(code);
    setExpanded((prev) => new Set([...prev, ...getBreadcrumb(map, code)]));
  };

  if (codes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-ink-3">
        <div>
          <p className="text-ink-2">Inget AMA-kodträd inläst för projektet än.</p>
          <p className="mt-1 text-sm">
            Importera FFU/mängdförteckning för att fylla trädet — kommer i nästa
            iteration.
          </p>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (code: string) =>
    !q ||
    code.toLowerCase().includes(q) ||
    map[code].title.toLowerCase().includes(q);

  return (
    <div className="grid h-full grid-cols-[360px_1fr] overflow-hidden">
      {/* Trädpanel */}
      <aside className="flex flex-col overflow-hidden border-r border-border bg-panel">
        <div className="border-b border-border p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök kod eller titel…"
            className="w-full rounded-md border border-border-strong bg-secondary px-3 py-2 text-[13px] outline-none focus:border-accent focus:bg-panel"
          />
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          {topCodes.map((c) => (
            <TreeBranch
              key={c}
              code={c}
              depth={0}
              map={map}
              selected={selected}
              expanded={expanded}
              matches={matches}
              hasQuery={!!q}
              onSelect={handleSelect}
              onToggle={(code) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  next.has(code) ? next.delete(code) : next.add(code);
                  return next;
                })
              }
            />
          ))}
        </div>
      </aside>

      {/* Detaljpanel */}
      <section className="overflow-y-auto bg-bg px-8 pb-12 pt-6">
        {selected ? (
          <Detail map={map} code={selected} onNavigate={handleSelect} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-3">
            <span className="text-4xl opacity-40">⌘</span>
            <span>Välj en kod i trädet.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function TreeBranch({
  code,
  depth,
  map,
  selected,
  expanded,
  matches,
  hasQuery,
  onSelect,
  onToggle,
}: {
  code: string;
  depth: number;
  map: NodeMap;
  selected: string | null;
  expanded: Set<string>;
  matches: (c: string) => boolean;
  hasQuery: boolean;
  onSelect: (c: string) => void;
  onToggle: (c: string) => void;
}) {
  const n = map[code];
  const kids = n.children;
  const isOpen = hasQuery || expanded.has(code);

  // Vid sökning: visa noden om den eller någon ättling matchar.
  const descMatch =
    hasQuery && (matches(code) || getDescendants(map, code).some(matches));
  if (hasQuery && !descMatch) return null;

  const hasMf = n.mf.length > 0;

  return (
    <>
      <div
        onClick={() => onSelect(code)}
        className={`relative mx-1.5 my-px flex cursor-pointer select-none items-center gap-1 rounded px-2 py-1 text-[12.5px] ${
          selected === code
            ? "bg-accent-bg font-medium text-accent-text"
            : "hover:bg-secondary"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (kids.length) onToggle(code);
          }}
          className={`flex w-4 flex-shrink-0 items-center justify-center text-[9px] text-ink-3 ${
            kids.length ? "" : "invisible"
          }`}
        >
          {isOpen ? "▼" : "▶"}
        </span>
        <span className="tnum whitespace-nowrap font-medium">{code}</span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-ink-2">
          {n.title}
        </span>
        {hasMf && (
          <span className="flex items-center gap-1 whitespace-nowrap text-[10.5px] text-ink-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-text" />
            {n.mf.length} mr
          </span>
        )}
      </div>
      {isOpen &&
        kids.map((ch) => (
          <TreeBranch
            key={ch}
            code={ch}
            depth={depth + 1}
            map={map}
            selected={selected}
            expanded={expanded}
            matches={matches}
            hasQuery={hasQuery}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

function Detail({
  map,
  code,
  onNavigate,
}: {
  map: NodeMap;
  code: string;
  onNavigate: (c: string) => void;
}) {
  const n = map[code];
  const inherited = getInherited(map, code);
  const hasOwnTb = !!n.tb?.trim();
  const descs = getDescendants(map, code);
  const isLeaf = n.children.length === 0;

  const ownAmt = n.mf.reduce((s, r) => s + (r.amount ?? 0), 0);
  const mfTotal = [code, ...descs].reduce(
    (s, c) => s + map[c].mf.reduce((a, r) => a + (r.amount ?? 0), 0),
    0,
  );
  const mfCount = [code, ...descs].reduce((s, c) => s + map[c].mf.length, 0);

  const crumbs = getBreadcrumb(map, code);

  const tbBlocks = [
    ...(hasOwnTb ? [{ kind: "own" as const, code, title: n.title, text: n.tb! }] : []),
    ...inherited.map((i) => ({ kind: "inherited" as const, ...i })),
  ];

  return (
    <div className="max-w-3xl">
      {/* Brödsmulor */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-3">/</span>}
            <span
              onClick={() => c !== code && onNavigate(c)}
              className={
                c === code
                  ? "font-medium text-ink"
                  : "cursor-pointer hover:text-accent hover:underline"
              }
            >
              {c}
            </span>
          </span>
        ))}
      </div>

      <h1 className="mb-1.5 text-[22px] font-medium leading-tight tracking-tight">
        {n.title}
      </h1>
      <p className="mb-4 text-[12.5px] text-ink-3">
        {n.code} ·{" "}
        {isLeaf
          ? "Lövnod · arbetsutförande"
          : `Mellannod · ${n.children.length} underliggande koder`}
      </p>

      {/* Statistik */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-md bg-secondary px-4 py-2.5 text-xs">
        {isLeaf || n.mf.length > 0 ? (
          <>
            <Stat label="Mängdrader" value={String(n.mf.length)} />
            <Stat label="Belopp" value={formatAmount(ownAmt)} />
            <Stat label="Ärvda krav" value={String(inherited.length)} />
          </>
        ) : (
          <>
            <Stat label="Underliggande koder" value={String(descs.length)} />
            <Stat label="Mängdrader (totalt)" value={String(mfCount)} />
            <Stat label="Belopp (totalt)" value={formatAmount(mfTotal)} />
          </>
        )}
      </div>

      {/* Mängder */}
      {n.mf.length > 0 && (
        <Section title="Mängder" meta={`${n.mf.length} ${n.mf.length === 1 ? "rad" : "rader"}`}>
          <table className="w-full border-collapse overflow-hidden rounded-lg border border-border bg-panel text-[13px]">
            <thead>
              <tr>
                {["Beskrivning", "Enhet", "Mängd", "Á-pris", "Belopp"].map((h, i) => (
                  <th
                    key={h}
                    className={`bg-secondary px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-3 ${
                      i >= 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {n.mf.map((r: MfRow) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2.5 align-top">{r.description}</td>
                  <td className="px-3 py-2.5 align-top text-ink-2">{r.unit ?? "—"}</td>
                  <td className="tnum px-3 py-2.5 text-right align-top font-medium">
                    {r.quantity != null ? formatQty(r.quantity) : "—"}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right align-top text-ink-2">
                    {r.unit_price != null ? formatPrice(r.unit_price) : "—"}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right align-top font-medium">
                    {r.amount != null ? formatAmount(r.amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Projektspecifika krav (TB) */}
      {tbBlocks.length > 0 && (
        <Section
          title="Projektspecifika krav (TB)"
          meta={`${tbBlocks.length} ${tbBlocks.length === 1 ? "paragraf" : "paragrafer"}`}
        >
          <div className="grid gap-2.5">
            {tbBlocks.map((b, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3.5 ${
                  b.kind === "own"
                    ? "border-accent-bg bg-accent-bg"
                    : "border-border bg-secondary"
                }`}
              >
                <div className="mb-1.5">
                  <span
                    onClick={() => b.kind === "inherited" && onNavigate(b.code)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-medium ${
                      b.kind === "own"
                        ? "bg-accent text-white"
                        : "cursor-pointer bg-secondary text-ink-2 hover:bg-border"
                    }`}
                  >
                    {b.kind === "own" ? `egen TB · ${b.code}` : `ärvd · ${b.code}`}
                  </span>
                </div>
                <p
                  className={`m-0 whitespace-pre-wrap text-[13.5px] leading-relaxed ${
                    b.kind === "inherited" ? "text-ink-2" : "text-ink"
                  }`}
                >
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Kontrollpunkter (AMA-krav) — användarens egen transformation, aldrig AMA-text */}
      <Section title="Kontrollpunkter (AMA-krav)">
        <div className="rounded-lg border border-border bg-panel px-4 py-4 text-[13px] text-ink-2">
          <strong className="text-ink">
            Ingen AMA-checklista uppladdad för denna kod.
          </strong>
          <br />
          Användaren omvandlar AMA-krav från sin licensierade utgåva till
          JSON-checklistor och laddar upp dem här. SmartPrep visar aldrig
          AMA-text — bara användarens transformation.
        </div>
      </Section>

      {/* Underliggande koder */}
      {n.children.length > 0 && (
        <Section title="Underliggande koder" meta={`${n.children.length} barn`}>
          <div className="grid gap-1.5">
            {n.children.map((ch) => (
              <div
                key={ch}
                onClick={() => onNavigate(ch)}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-panel px-4 py-3 transition hover:border-border-strong"
              >
                <span className="tnum font-medium">{ch}</span>
                <span className="text-ink-2">{map[ch].title}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="tnum font-medium text-ink">{value}</span>
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="m-0 text-[15px] font-medium tracking-tight">{title}</h2>
        {meta && <span className="text-xs text-ink-2">{meta}</span>}
      </div>
      {children}
    </section>
  );
}
