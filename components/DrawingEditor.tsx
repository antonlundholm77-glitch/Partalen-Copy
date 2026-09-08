"use client";

// Redigerbar renritning: växlingsbar/släckbar bakgrund + symbollager (SVG) ovanpå.
// Observationer, objekt (noder), ledningar och fritext kan dras, läggas till och tas
// bort. Ledningar kan knytas till noder. Zoom/pan, konstant symbolstorlek, justerbar
// textstorlek, opacitet, PDF-export. Sparas i localStorage. Verktygsraden är samlad
// i tematiska menyer (Bakgrund/Lager/Visning/Mer).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Video,
  Boxes,
  Spline,
  Type,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  FileDown,
  MoreHorizontal,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type {
  Drawing,
  DrawingObservation,
  DrawingNode,
  DrawingPipe,
  DrawingPoint,
  DrawingText,
  Certainty,
} from "@/lib/project-content";

type Tool = "select" | "obs" | "node" | "pipe" | "text";
type Selection = { kind: "obs" | "node" | "pipe" | "text"; id: string } | null;
type DragRef = { kind: "obs" | "node" | "pipe" | "plabel" | "text"; id: string; vi?: number } | null;
type PanRef = { sx: number; sy: number; vx: number; vy: number; moved: boolean } | null;
type View = { z: number; x: number; y: number };

const VBW = 1000;
const ZMIN = 0.3;
const ZMAX = 6;

const CERT_COLOR: Record<Certainty, string> = {
  kant: "#5e8553",
  tolkat: "#b5532a",
  osakert: "#b03636",
};
const OBS_COLOR = { kopplad: "#5e8553", stopp: "#b03636", ny: "#b5532a" } as const;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function clampZoom(z: number) {
  return Math.max(ZMIN, Math.min(ZMAX, z));
}
function clampText(t: number) {
  return Math.max(0.6, Math.min(2.5, t));
}

export default function DrawingEditor({
  unitName,
  storageKey,
  initial,
}: {
  unitName: string;
  storageKey: string;
  initial: Drawing;
}) {
  const VBH = Math.round((VBW * initial.h) / initial.w);

  const [obs, setObs] = useState<DrawingObservation[]>(initial.observations);
  const [nodes, setNodes] = useState<DrawingNode[]>(initial.nodes);
  const [pipes, setPipes] = useState<DrawingPipe[]>(initial.pipes);
  const [texts, setTexts] = useState<DrawingText[]>(initial.texts ?? []);
  const [tool, setTool] = useState<Tool>("select");
  const [sel, setSel] = useState<Selection>(null);
  const [draft, setDraft] = useState<DrawingPoint[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [bgId, setBgId] = useState(initial.backgrounds[0]?.id);
  const [bgOff, setBgOff] = useState(false);
  const [layers, setLayers] = useState({ obs: true, node: true, pipe: true, text: true });
  const [textScale, setTextScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef>(null);
  const panRef = useRef<PanRef>(null);
  const lastPt = useRef<DrawingPoint>({ x: 0, y: 0 });

  const bg = initial.backgrounds.find((b) => b.id === bgId) ?? initial.backgrounds[0];

  // Punktupplösning: en punkt bunden till en nod följer nodens läge.
  const nodeById = (id?: string) => (id ? nodes.find((n) => n.id === id) : undefined);
  const rx = (pt: DrawingPoint) => nodeById(pt.node)?.x ?? pt.x;
  const ry = (pt: DrawingPoint) => nodeById(pt.node)?.y ?? pt.y;
  const findNodeNear = (pt: DrawingPoint) =>
    nodes.find((n) => Math.abs((pt.x - n.x) * VBW) < 72 && Math.abs((pt.y - n.y) * VBH) < 30);

  // Ladda sparat läge efter mount (undviker SSR-mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.observations)) setObs(d.observations);
        if (Array.isArray(d.nodes)) setNodes(d.nodes);
        if (Array.isArray(d.pipes)) setPipes(d.pipes);
        if (Array.isArray(d.texts)) setTexts(d.texts);
        if (typeof d.textScale === "number") setTextScale(d.textScale);
        if (typeof d.opacity === "number") setOpacity(d.opacity);
      }
    } catch {
      /* strunta i trasig localStorage */
    }
    setLoaded(true);
  }, [storageKey]);

  // Spara vid ändring (efter att vi laddat).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ v: 1, observations: obs, nodes, pipes, texts, textScale, opacity }),
      );
    } catch {
      /* ignore */
    }
  }, [loaded, storageKey, obs, nodes, pipes, texts, textScale, opacity]);

  // --- zoom ---
  const zoomAtClient = useCallback((clientX: number, clientY: number, factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const cx = clientX - r.left;
    const cy = clientY - r.top;
    setView((v) => {
      const z = clampZoom(v.z * factor);
      const k = z / v.z;
      return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  const zoomByCenter = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAtClient],
  );

  const resetView = useCallback(() => setView({ z: 1, x: 0, y: 0 }), []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      zoomAtClient(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAtClient]);

  const toNorm = useCallback((clientX: number, clientY: number): DrawingPoint => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: clamp01((clientX - r.left) / r.width), y: clamp01((clientY - r.top) / r.height) };
  }, []);

  const nextObsId = useCallback(() => {
    let max = 0;
    for (const o of obs) {
      const m = /(\d+)/.exec(o.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `OBS-${String(max + 1).padStart(3, "0")}`;
  }, [obs]);

  // --- pekare på bakgrunden (svg) ---
  function onBackgroundPointerDown(e: React.PointerEvent) {
    if (tool === "select") {
      panRef.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const p = toNorm(e.clientX, e.clientY);
    if (tool === "obs") {
      const id = nextObsId();
      setObs((a) => [...a, { id, x: p.x, y: p.y, status: "ny" }]);
      setSel({ kind: "obs", id });
      setTool("select");
    } else if (tool === "node") {
      const id = `n-${crypto.randomUUID().slice(0, 6)}`;
      setNodes((a) => [...a, { id, label: "Nytt objekt", kind: "Objekt", x: p.x, y: p.y, certainty: "tolkat" }]);
      setSel({ kind: "node", id });
      setTool("select");
    } else if (tool === "pipe") {
      setDraft((d) => [...(d ?? []), p]);
    } else if (tool === "text") {
      const id = `t-${crypto.randomUUID().slice(0, 6)}`;
      setTexts((a) => [...a, { id, x: p.x, y: p.y, text: "Text" }]);
      setSel({ kind: "text", id });
      setTool("select");
    }
  }

  function startDrag(e: React.PointerEvent, ref: NonNullable<DragRef>) {
    if (tool !== "select") return;
    e.stopPropagation();
    dragRef.current = ref;
    // En etikett (plabel) hör till sin ledning → markera ledningen.
    setSel({ kind: ref.kind === "plabel" ? "pipe" : ref.kind, id: ref.id });
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onSvgPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (d) {
      const p = toNorm(e.clientX, e.clientY);
      lastPt.current = p;
      if (d.kind === "obs") setObs((a) => a.map((o) => (o.id === d.id ? { ...o, x: p.x, y: p.y } : o)));
      else if (d.kind === "node") setNodes((a) => a.map((n) => (n.id === d.id ? { ...n, x: p.x, y: p.y } : n)));
      else if (d.kind === "pipe" && d.vi !== undefined)
        setPipes((a) =>
          a.map((pi) =>
            // dra ett hörn → frikoppla ev. nodbindning (knyts ev. om vid släpp)
            pi.id === d.id ? { ...pi, points: pi.points.map((pt, i) => (i === d.vi ? { x: p.x, y: p.y } : pt)) } : pi,
          ),
        );
      else if (d.kind === "plabel")
        setPipes((a) => a.map((pi) => (pi.id === d.id ? { ...pi, labelPos: p } : pi)));
      else if (d.kind === "text")
        setTexts((a) => a.map((t) => (t.id === d.id ? { ...t, x: p.x, y: p.y } : t)));
      return;
    }
    const pan = panRef.current;
    if (pan) {
      const dx = e.clientX - pan.sx;
      const dy = e.clientY - pan.sy;
      if (!pan.moved && Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
      setView((v) => ({ ...v, x: pan.vx + dx, y: pan.vy + dy }));
    }
  }

  function onSvgPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (d) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      // Släpp ett lednings-hörn på en nod → knyt ihop dem.
      if (d.kind === "pipe" && d.vi !== undefined) {
        const near = findNodeNear(lastPt.current);
        if (near) {
          const vi = d.vi;
          setPipes((a) =>
            a.map((pi) =>
              pi.id === d.id
                ? { ...pi, points: pi.points.map((pt, i) => (i === vi ? { node: near.id, x: near.x, y: near.y } : pt)) }
                : pi,
            ),
          );
        }
      }
      dragRef.current = null;
      return;
    }
    if (panRef.current) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      if (!panRef.current.moved) setSel(null); // klick i tomrum → avmarkera
      panRef.current = null;
    }
  }

  function finishDraft() {
    if (draft && draft.length >= 2) {
      const id = `p-${crypto.randomUUID().slice(0, 6)}`;
      setPipes((a) => [...a, { id, certainty: "tolkat", label: "Ny ledning", points: draft }]);
      setSel({ kind: "pipe", id });
    }
    setDraft(null);
    setTool("select");
  }

  const deleteSelected = useCallback(() => {
    if (!sel) return;
    if (sel.kind === "obs") setObs((a) => a.filter((o) => o.id !== sel.id));
    else if (sel.kind === "node") setNodes((a) => a.filter((n) => n.id !== sel.id));
    else if (sel.kind === "pipe") setPipes((a) => a.filter((p) => p.id !== sel.id));
    else if (sel.kind === "text") setTexts((a) => a.filter((t) => t.id !== sel.id));
    setSel(null);
  }, [sel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        setDraft(null);
        setTool("select");
        setSel(null);
      } else if (e.key === "+" || e.key === "=") {
        zoomByCenter(1.2);
      } else if (e.key === "-") {
        zoomByCenter(1 / 1.2);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, deleteSelected, zoomByCenter]);

  function reset() {
    setObs(initial.observations);
    setNodes(initial.nodes);
    setPipes(initial.pipes);
    setTexts(initial.texts ?? []);
    setSel(null);
    setDraft(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  // Tömmer ritningens symbollager helt (bakgrund och vy-inställningar lämnas).
  // Bekräftelse eftersom det är destruktivt och inte återställs av Återställ
  // (som hämtar initialbilden).
  function clearDrawing() {
    if (typeof window !== "undefined" && !window.confirm("Tömma ritningen? Alla observationer, objekt, ledningar och texter tas bort.")) {
      return;
    }
    setObs([]);
    setNodes([]);
    setPipes([]);
    setTexts([]);
    setSel(null);
    setDraft(null);
  }

  // Bygg SVG-markup för synliga lager (för PDF-export). Sizes vid 100 %.
  function layersMarkup(): string {
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const PX = (n: number) => (n * VBW).toFixed(1);
    const PY = (n: number) => (n * VBH).toFixed(1);
    let out = "";
    if (layers.pipe)
      for (const p of pipes) {
        const col = CERT_COLOR[p.certainty];
        const pts = p.points.map((pt) => `${PX(rx(pt))},${PY(ry(pt))}`).join(" ");
        const mid = p.points[Math.floor((p.points.length - 1) / 2)];
        const da = p.certainty === "kant" ? "" : ` stroke-dasharray="10 7"`;
        out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"${da}/>`;
        if (p.issue === "stopp" && mid)
          out += `<circle cx="${PX(rx(mid))}" cy="${PY(ry(mid))}" r="7" fill="#b03636" stroke="#fff" stroke-width="2"/>`;
        if (p.label && mid) {
          const lx = p.labelPos?.x ?? rx(mid);
          const ly = p.labelPos?.y ?? clamp01(ry(mid) - 0.02);
          out += `<text x="${(lx * VBW).toFixed(1)}" y="${(ly * VBH).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${(13 * textScale).toFixed(1)}" fill="#555" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(p.label)}</text>`;
        }
      }
    if (layers.node)
      for (const n of nodes) {
        const col = CERT_COLOR[n.certainty ?? "kant"];
        const fs = 15 * textScale;
        const padX = 7;
        const padY = 3.5;
        const w = Math.max(n.label.length * fs * 0.6 + padX * 2, fs * 2);
        const h = fs + padY * 2;
        const tx = (n.x * VBW - w / 2).toFixed(1);
        const ty = (n.y * VBH - h / 2).toFixed(1);
        const da = n.certainty === "kant" || !n.certainty ? "" : ` stroke-dasharray="6 4"`;
        out += `<g transform="translate(${tx} ${ty})"><rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="#ffffff" stroke="${col}" stroke-width="2"${da}/><text x="${(w / 2).toFixed(1)}" y="${(h / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fs.toFixed(1)}" font-weight="600" fill="#2b2b2b">${esc(n.label)}</text></g>`;
      }
    if (layers.obs)
      for (const o of obs) {
        const col = OBS_COLOR[o.status ?? "kopplad"];
        const short = (/(\d+)/.exec(o.id)?.[1] ?? "•").replace(/^0+/, "") || "0";
        out += `<g transform="translate(${PX(o.x)} ${PY(o.y)})"><circle r="15" fill="${col}" stroke="#fff" stroke-width="2.5"/><text text-anchor="middle" y="5" font-size="${(14 * textScale).toFixed(1)}" font-weight="700" fill="#fff">${esc(short)}</text></g>`;
      }
    if (layers.text)
      for (const t of texts) {
        const fs = 14 * textScale * (t.size ?? 1);
        const lines = (t.text || " ").split("\n");
        const tw = Math.max(...lines.map((l) => l.length)) * fs * 0.58;
        const th = lines.length * fs * 1.2;
        const padX = 5;
        const padY = 3;
        out += `<g transform="translate(${PX(t.x)} ${PY(t.y)})"><rect x="${-padX}" y="${-padY}" width="${(tw + padX * 2).toFixed(1)}" height="${(th + padY * 2).toFixed(1)}" rx="4" fill="#ffffff" fill-opacity="0.7"/>`;
        lines.forEach((ln, i) => {
          out += `<text x="0" y="${(i * fs * 1.2 + fs * 0.5).toFixed(1)}" dominant-baseline="central" font-size="${fs.toFixed(1)}" fill="#2b2b2b">${esc(ln)}</text>`;
        });
        out += `</g>`;
      }
    return out;
  }

  // PDF-rendering: bygg en SVG (bakgrund + synliga lager) och skriv ut → spara som PDF.
  async function exportPdf() {
    let imgTag = `<rect width="${VBW}" height="${VBH}" fill="#ffffff"/>`;
    if (!bgOff && bg) {
      try {
        const res = await fetch(bg.src);
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        imgTag = `<image href="${dataUrl}" x="0" y="0" width="${VBW}" height="${VBH}" preserveAspectRatio="none" opacity="${opacity}"/>`;
      } catch {
        /* faller tillbaka till vit bakgrund */
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VBW} ${VBH}">${imgTag}${layersMarkup()}</svg>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${unitName} – renritning</title>` +
        `<style>@page{size:auto;margin:8mm}html,body{margin:0;padding:0}svg{width:100%;height:auto;display:block}</style>` +
        `</head><body>${svg}</body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  }

  const X = (n: number) => n * VBW;
  const Y = (n: number) => n * VBH;
  // Konstant skärmstorlek på symboler: motverka zoomens skalning.
  const s = 1 / view.z;
  const dash = (a: number, b: number) => `${a * s} ${b * s}`;

  const btn = "rounded-md border px-2.5 py-1 text-[12px] transition";
  const btnIdle = "border-border bg-panel text-ink-2 hover:bg-secondary hover:text-ink";
  const btnOn = "border-[#5e8553] bg-[#dde7d5] font-medium text-[#3f5c38]";
  const segOn = "bg-[#dde7d5] font-medium text-[#3f5c38]";
  const segIdle = "bg-panel text-ink-2 hover:bg-secondary";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Verktygsrad — tematiska grupper/menyer */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-2.5">
        <span className="mr-1 text-[13px] font-medium">Renritning</span>

        {/* Verktyg (primära) */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-panel p-0.5">
          {([
            ["select", "Välj", MousePointer2],
            ["obs", "Observation", Video],
            ["node", "Objekt", Boxes],
            ["pipe", "Ledning", Spline],
            ["text", "Text", Type],
          ] as [Tool, string, LucideIcon][]).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => {
                setTool(t);
                if (t !== "pipe") setDraft(null);
              }}
              title={label}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition ${tool === t ? segOn : segIdle}`}
            >
              <Icon size={15} strokeWidth={1.75} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Bakgrund ▾ */}
        <Menu icon={ImageIcon} label="Bakgrund">
          <MenuLabel>Visa bakgrund</MenuLabel>
          {initial.backgrounds.map((b) => (
            <MenuItem
              key={b.id}
              active={!bgOff && bg.id === b.id}
              onClick={() => {
                setBgOff(false);
                setBgId(b.id);
              }}
            >
              {b.label}
            </MenuItem>
          ))}
          <MenuItem active={bgOff} onClick={() => setBgOff(true)}>
            Av — visa bara symboler
          </MenuItem>
          <div className="my-1 border-t border-border" />
          <div className="px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between text-[11px] text-ink-3">
              <span>Opacitet</span>
              <span className="tabular-nums">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              disabled={bgOff}
              className="h-1.5 w-full cursor-pointer accent-[#5e8553] disabled:opacity-40"
            />
          </div>
        </Menu>

        {/* Lager ▾ */}
        <Menu icon={Layers} label="Lager">
          <MenuLabel>Visa lager</MenuLabel>
          {([
            ["obs", "Observationer"],
            ["node", "Objekt"],
            ["pipe", "Ledningar"],
            ["text", "Text"],
          ] as [keyof typeof layers, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-ink-2 transition hover:bg-secondary hover:text-ink"
            >
              {layers[k] ? <Eye size={15} /> : <EyeOff size={15} className="opacity-50" />}
              <span className={layers[k] ? "" : "opacity-50 line-through"}>{label}</span>
            </button>
          ))}
        </Menu>

        {/* Visning ▾ (zoom + textstorlek) */}
        <Menu icon={SlidersHorizontal} label="Visning">
          <MenuLabel>Zoom</MenuLabel>
          <div className="flex items-center gap-1 px-2 py-1">
            <button onClick={() => zoomByCenter(1 / 1.2)} className={`${btn} ${btnIdle} px-2`} aria-label="Zooma ut">−</button>
            <button onClick={resetView} className={`${btn} ${btnIdle} flex-1 tabular-nums`} title="Återställ vy">
              {Math.round(view.z * 100)}%
            </button>
            <button onClick={() => zoomByCenter(1.2)} className={`${btn} ${btnIdle} px-2`} aria-label="Zooma in">+</button>
          </div>
          <MenuLabel>Textstorlek</MenuLabel>
          <div className="flex items-center gap-1 px-2 py-1">
            <button onClick={() => setTextScale((t) => clampText(t / 1.15))} className={`${btn} ${btnIdle} px-2`} aria-label="Mindre text">A−</button>
            <button onClick={() => setTextScale(1)} className={`${btn} ${btnIdle} flex-1 tabular-nums`} title="Återställ textstorlek">
              {Math.round(textScale * 100)}%
            </button>
            <button onClick={() => setTextScale((t) => clampText(t * 1.15))} className={`${btn} ${btnIdle} px-2`} aria-label="Större text">A+</button>
          </div>
        </Menu>

        {/* Höger: kontext + åtgärder */}
        <div className="ml-auto flex items-center gap-1.5">
          {draft && (
            <>
              <span className="text-ink-3 text-[12px]">{draft.length} punkt(er)</span>
              <button onClick={finishDraft} className={`${btn} ${btnOn}`}>
                Slutför ledning
              </button>
            </>
          )}
          {sel && (
            <button onClick={deleteSelected} className={`${btn} ${btnIdle}`}>
              Ta bort
            </button>
          )}
          <button onClick={exportPdf} className={`${btn} ${btnIdle} flex items-center gap-1.5`} title="Rendera PDF av nuvarande vy">
            <FileDown size={15} strokeWidth={1.75} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <Menu icon={MoreHorizontal} align="right">
            <button
              onClick={reset}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-ink-2 transition hover:bg-secondary hover:text-ink"
            >
              <RotateCcw size={15} /> Återställ ritning
            </button>
            <button
              onClick={clearDrawing}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[#b03636] transition hover:bg-[#fbe9e7]"
            >
              <Trash2 size={15} /> Rensa ritning
            </button>
          </Menu>
        </div>
      </div>

      {tool !== "select" && (
        <div className="border-b border-border bg-[#f7faf5] px-6 py-1.5 text-[12px] text-[#3f5c38]">
          {tool === "obs" && "Klicka i ritningen för att placera en observation."}
          {tool === "node" && "Klicka i ritningen för att placera ett objekt (OA, pumpgrop …)."}
          {tool === "pipe" &&
            "Klicka för att lägga ledningens punkter — klicka på en nod för att knyta ihop. Tryck ”Slutför ledning” (Esc avbryter)."}
          {tool === "text" && "Klicka i ritningen för att lägga ett fritextfält. Redigera texten i panelen till höger."}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Ritning + symbollager (zoom/pan-yta) */}
        <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden bg-secondary/40">
          <div
            className="absolute left-0 top-0 w-full bg-white shadow-elev1"
            style={{
              aspectRatio: `${initial.w} / ${initial.h}`,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
              transformOrigin: "0 0",
            }}
          >
            {!bgOff && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bg.src}
                alt={`${bg.label} – ${unitName}`}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
                style={{ opacity }}
                draggable={false}
              />
            )}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VBW} ${VBH}`}
              className={`absolute inset-0 h-full w-full ${
                tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
              }`}
              onPointerDown={onBackgroundPointerDown}
              onPointerMove={onSvgPointerMove}
              onPointerUp={onSvgPointerUp}
              onDoubleClick={() => draft && finishDraft()}
            >
              {/* Ledningar */}
              {layers.pipe &&
                pipes.map((p) => {
                  const selected = sel?.kind === "pipe" && sel.id === p.id;
                  const col = CERT_COLOR[p.certainty];
                  const pts = p.points.map((pt) => `${X(rx(pt))},${Y(ry(pt))}`).join(" ");
                  const mid = p.points[Math.floor((p.points.length - 1) / 2)];
                  return (
                    <g key={p.id}>
                      <polyline
                        points={pts}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={18 * s}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          if (tool === "select") setSel({ kind: "pipe", id: p.id });
                        }}
                      />
                      <polyline
                        points={pts}
                        fill="none"
                        stroke={col}
                        strokeWidth={(selected ? 5 : 3.5) * s}
                        strokeDasharray={p.certainty === "kant" ? undefined : dash(10, 7)}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        pointerEvents="none"
                      />
                      {p.issue === "stopp" && mid && (
                        <circle cx={X(rx(mid))} cy={Y(ry(mid))} r={7 * s} fill="#b03636" stroke="#fff" strokeWidth={2 * s} pointerEvents="none" />
                      )}
                      {p.label && mid && (() => {
                        const lp = p.labelPos ?? { x: rx(mid), y: clamp01(ry(mid) - 0.02) };
                        return (
                          <g
                            transform={`translate(${X(lp.x)} ${Y(lp.y)})`}
                            className={tool === "select" ? "cursor-grab" : ""}
                            onPointerDown={(e) => startDrag(e, { kind: "plabel", id: p.id })}
                          >
                            <text
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={13 * s * textScale}
                              fill="#555"
                              stroke="#ffffff"
                              strokeWidth={3 * s}
                              strokeLinejoin="round"
                            >
                              {p.label}
                            </text>
                            <text textAnchor="middle" dominantBaseline="middle" fontSize={13 * s * textScale} fill="#555">
                              {p.label}
                            </text>
                          </g>
                        );
                      })()}
                      {selected &&
                        p.points.map((pt, i) => (
                          <circle
                            key={i}
                            cx={X(rx(pt))}
                            cy={Y(ry(pt))}
                            r={7 * s}
                            fill="#fff"
                            stroke={col}
                            strokeWidth={2.5 * s}
                            className="cursor-grab"
                            onPointerDown={(e) => startDrag(e, { kind: "pipe", id: p.id, vi: i })}
                          />
                        ))}
                    </g>
                  );
                })}

              {/* Pågående ledning (draft) */}
              {draft && draft.length > 0 && (
                <g pointerEvents="none">
                  {draft.length > 1 && (
                    <polyline
                      points={draft.map((pt) => `${X(rx(pt))},${Y(ry(pt))}`).join(" ")}
                      fill="none"
                      stroke="#b5532a"
                      strokeWidth={3.5 * s}
                      strokeDasharray={dash(10, 7)}
                    />
                  )}
                  {draft.map((pt, i) => (
                    <circle key={i} cx={X(rx(pt))} cy={Y(ry(pt))} r={5 * s} fill="#b5532a" />
                  ))}
                </g>
              )}

              {/* Objekt-noder */}
              {layers.node &&
                nodes.map((n) => {
                  const selected = sel?.kind === "node" && sel.id === n.id;
                  const col = CERT_COLOR[n.certainty ?? "kant"];
                  // Innehållsbaserad storlek: följer textlängd + textstorlek, tajt runt texten.
                  const fs = 15 * s * textScale;
                  const padX = 7 * s;
                  const padY = 3.5 * s;
                  const w = Math.max(n.label.length * fs * 0.6 + padX * 2, fs * 2);
                  const h = fs + padY * 2;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${X(n.x) - w / 2} ${Y(n.y) - h / 2})`}
                      className={tool === "pipe" ? "cursor-pointer" : tool === "select" ? "cursor-grab" : ""}
                      onPointerDown={(e) => {
                        if (tool === "pipe") {
                          // klicka på nod medan du ritar ledning → ankra punkten till noden
                          e.stopPropagation();
                          setDraft((dd) => [...(dd ?? []), { node: n.id, x: n.x, y: n.y }]);
                          return;
                        }
                        startDrag(e, { kind: "node", id: n.id });
                      }}
                    >
                      {tool === "pipe" && (
                        <rect
                          x={-6 * s}
                          y={-6 * s}
                          width={w + 12 * s}
                          height={h + 12 * s}
                          rx={12 * s}
                          fill="none"
                          stroke="#5e8553"
                          strokeWidth={1.5 * s}
                          strokeDasharray={dash(4, 3)}
                        />
                      )}
                      <rect
                        width={w}
                        height={h}
                        rx={5 * s}
                        fill="#ffffff"
                        stroke={col}
                        strokeWidth={(selected ? 3 : 2) * s}
                        strokeDasharray={n.certainty === "kant" || !n.certainty ? undefined : dash(6, 4)}
                        opacity={0.96}
                      />
                      <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={600} fill="#2b2b2b">
                        {n.label}
                      </text>
                    </g>
                  );
                })}

              {/* Observationer */}
              {layers.obs &&
                obs.map((o) => {
                  const selected = sel?.kind === "obs" && sel.id === o.id;
                  const col = OBS_COLOR[o.status ?? "kopplad"];
                  const short = (/(\d+)/.exec(o.id)?.[1] ?? "•").replace(/^0+/, "") || "0";
                  return (
                    <g
                      key={o.id}
                      transform={`translate(${X(o.x)} ${Y(o.y)})`}
                      className={tool === "select" ? "cursor-grab" : ""}
                      onPointerDown={(e) => startDrag(e, { kind: "obs", id: o.id })}
                    >
                      {selected && <circle r={20 * s} fill="none" stroke={col} strokeWidth={2 * s} opacity={0.5} />}
                      <circle r={15 * s} fill={col} stroke="#fff" strokeWidth={2.5 * s} />
                      <text textAnchor="middle" y={5 * s} fontSize={14 * s * textScale} fontWeight={700} fill="#fff">
                        {short}
                      </text>
                    </g>
                  );
                })}

              {/* Fritextfält */}
              {layers.text &&
                texts.map((t) => {
                  const selected = sel?.kind === "text" && sel.id === t.id;
                  const fs = 14 * s * textScale * (t.size ?? 1);
                  const lines = (t.text || " ").split("\n");
                  const tw = Math.max(...lines.map((l) => l.length)) * fs * 0.58;
                  const th = lines.length * fs * 1.2;
                  const padX = 5 * s;
                  const padY = 3 * s;
                  return (
                    <g
                      key={t.id}
                      transform={`translate(${X(t.x)} ${Y(t.y)})`}
                      className={tool === "select" ? "cursor-grab" : ""}
                      onPointerDown={(e) => startDrag(e, { kind: "text", id: t.id })}
                    >
                      <rect
                        x={-padX}
                        y={-padY}
                        width={tw + padX * 2}
                        height={th + padY * 2}
                        rx={4 * s}
                        fill="#ffffff"
                        fillOpacity={0.7}
                        stroke={selected ? "#5e8553" : "transparent"}
                        strokeWidth={selected ? 2 * s : 0}
                      />
                      {lines.map((ln, i) => (
                        <text key={i} x={0} y={i * fs * 1.2 + fs * 0.5} dominantBaseline="central" fontSize={fs} fill="#2b2b2b">
                          {ln}
                        </text>
                      ))}
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {/* Inspektör */}
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-border bg-panel px-4 py-4">
          {sel ? (
            <Inspector
              sel={sel}
              obs={obs}
              nodes={nodes}
              pipes={pipes}
              texts={texts}
              onObs={(id, patch) => setObs((a) => a.map((o) => (o.id === id ? { ...o, ...patch } : o)))}
              onNode={(id, patch) => setNodes((a) => a.map((n) => (n.id === id ? { ...n, ...patch } : n)))}
              onPipe={(id, patch) => setPipes((a) => a.map((p) => (p.id === id ? { ...p, ...patch } : p)))}
              onText={(id, patch) => setTexts((a) => a.map((t) => (t.id === id ? { ...t, ...patch } : t)))}
              onDelete={deleteSelected}
            />
          ) : (
            <div className="text-[12px] leading-relaxed text-ink-3">
              <p className="font-medium text-ink-2">Inget valt</p>
              <p className="mt-1">Välj en symbol för att redigera, eller använd verktygen för att lägga till.</p>
              <ul className="mt-3 space-y-1">
                <li>· Dra symbol för att flytta</li>
                <li>· Dra bakgrunden för att panorera</li>
                <li>· Hjul / +− för att zooma</li>
                <li>· Ledning → klicka på nod för att knyta ihop</li>
                <li>· Markera + Delete tar bort</li>
                <li>· Ändringar sparas i webbläsaren</li>
              </ul>
              <div className="mt-4 grid grid-cols-1 gap-1 text-[11px]">
                <Legend color={OBS_COLOR.kopplad}>Observation · kopplad</Legend>
                <Legend color={OBS_COLOR.stopp}>Observation · stopp</Legend>
                <Legend color={CERT_COLOR.kant}>Ledning · känt</Legend>
                <Legend color={CERT_COLOR.tolkat} dashed>Ledning · tolkat</Legend>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Menu({
  icon: Icon,
  label,
  align = "left",
  children,
}: {
  icon: LucideIcon;
  label?: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition ${
          open
            ? "border-[#5e8553] bg-[#dde7d5] text-[#3f5c38]"
            : "border-border bg-panel text-ink-2 hover:bg-secondary hover:text-ink"
        }`}
      >
        <Icon size={15} strokeWidth={1.75} />
        {label && <span className="hidden md:inline">{label}</span>}
        <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-1 min-w-[210px] rounded-lg border border-border bg-panel p-1.5 shadow-elev1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">{children}</div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-[13px] transition ${
        active ? "bg-[#dde7d5] font-medium text-[#3f5c38]" : "text-ink-2 hover:bg-secondary hover:text-ink"
      }`}
    >
      <span>{children}</span>
    </button>
  );
}

function Legend({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-2">
      <svg width="22" height="8" aria-hidden>
        <line x1="0" y1="4" x2="22" y2="4" stroke={color} strokeWidth="3" strokeDasharray={dashed ? "5 3" : undefined} />
      </svg>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-surface px-2 py-1 text-[13px] text-ink outline-none focus:border-[#5e8553]";

function Inspector({
  sel,
  obs,
  nodes,
  pipes,
  texts,
  onObs,
  onNode,
  onPipe,
  onText,
  onDelete,
}: {
  sel: NonNullable<Selection>;
  obs: DrawingObservation[];
  nodes: DrawingNode[];
  pipes: DrawingPipe[];
  texts: DrawingText[];
  onObs: (id: string, patch: Partial<DrawingObservation>) => void;
  onNode: (id: string, patch: Partial<DrawingNode>) => void;
  onPipe: (id: string, patch: Partial<DrawingPipe>) => void;
  onText: (id: string, patch: Partial<DrawingText>) => void;
  onDelete: () => void;
}) {
  const certaintySelect = (value: Certainty, on: (c: Certainty) => void) => (
    <select className={inputCls} value={value} onChange={(e) => on(e.target.value as Certainty)}>
      <option value="kant">Känt</option>
      <option value="tolkat">Tolkat</option>
      <option value="osakert">Osäkert</option>
    </select>
  );

  let body: React.ReactNode = null;
  if (sel.kind === "obs") {
    const o = obs.find((x) => x.id === sel.id);
    if (o)
      body = (
        <div className="space-y-3">
          <Field label="ID">
            <input className={inputCls} value={o.id} onChange={(e) => onObs(o.id, { id: e.target.value })} />
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={o.status ?? "kopplad"}
              onChange={(e) => onObs(o.id, { status: e.target.value as DrawingObservation["status"] })}
            >
              <option value="kopplad">Kopplad</option>
              <option value="stopp">Stopp</option>
              <option value="ny">Ny</option>
            </select>
          </Field>
          <Field label="Notering">
            <input
              className={inputCls}
              value={o.label ?? ""}
              placeholder="frivillig text"
              onChange={(e) => onObs(o.id, { label: e.target.value })}
            />
          </Field>
        </div>
      );
  } else if (sel.kind === "node") {
    const n = nodes.find((x) => x.id === sel.id);
    if (n)
      body = (
        <div className="space-y-3">
          <Field label="Namn">
            <input className={inputCls} value={n.label} onChange={(e) => onNode(n.id, { label: e.target.value })} />
          </Field>
          <Field label="Typ">
            <input className={inputCls} value={n.kind} onChange={(e) => onNode(n.id, { kind: e.target.value })} />
          </Field>
          <Field label="Säkerhet">{certaintySelect(n.certainty ?? "kant", (c) => onNode(n.id, { certainty: c }))}</Field>
        </div>
      );
  } else if (sel.kind === "text") {
    const t = texts.find((x) => x.id === sel.id);
    if (t)
      body = (
        <div className="space-y-3">
          <Field label="Text">
            <textarea
              className={`${inputCls} h-24 resize-none`}
              value={t.text}
              onChange={(e) => onText(t.id, { text: e.target.value })}
              placeholder="Skriv fritext…"
            />
          </Field>
          <Field label="Storlek">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onText(t.id, { size: clampText((t.size ?? 1) / 1.15) })}
                className="rounded border border-border px-2 py-1 text-[12px] text-ink-2 hover:bg-secondary"
              >
                A−
              </button>
              <span className="text-ink-3 w-10 text-center text-[12px] tabular-nums">{Math.round((t.size ?? 1) * 100)}%</span>
              <button
                onClick={() => onText(t.id, { size: clampText((t.size ?? 1) * 1.15) })}
                className="rounded border border-border px-2 py-1 text-[12px] text-ink-2 hover:bg-secondary"
              >
                A+
              </button>
            </div>
          </Field>
          <p className="text-[11px] text-ink-3">Radbrytning med Enter. Påverkas även av global textstorlek.</p>
        </div>
      );
  } else {
    const p = pipes.find((x) => x.id === sel.id);
    if (p)
      body = (
        <div className="space-y-3">
          <Field label="Etikett">
            <input className={inputCls} value={p.label ?? ""} onChange={(e) => onPipe(p.id, { label: e.target.value })} />
          </Field>
          <Field label="Säkerhet">{certaintySelect(p.certainty, (c) => onPipe(p.id, { certainty: c }))}</Field>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={p.issue === "stopp"}
              onChange={(e) => onPipe(p.id, { issue: e.target.checked ? "stopp" : undefined })}
            />
            Markera stopp
          </label>
          <p className="text-[11px] text-ink-3">Markera ledningen för att dra dess hörn, eller släpp ett hörn på en nod för att knyta ihop.</p>
        </div>
      );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          {sel.kind === "obs" ? "Observation" : sel.kind === "node" ? "Objekt" : sel.kind === "text" ? "Text" : "Ledning"}
        </span>
        <button onClick={onDelete} className="rounded border border-border px-1.5 py-0.5 text-[11px] text-ink-2 hover:bg-secondary">
          Ta bort
        </button>
      </div>
      {body}
    </div>
  );
}
