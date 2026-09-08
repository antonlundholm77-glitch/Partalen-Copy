// Schematisk, tolkad vy över objekt och flöden när koordinater saknas. Visar
// samband och flödesriktning, inte verklig geometri. Osäkerhet markeras tydligt
// (känt / tolkat / osäkert) + stopp. Server-renderad SVG.

import type { Certainty, SchematicEdge, SchematicNode } from "@/lib/project-content";

const W = 168; // nodbredd
const H = 56; // nodhöjd
const VB_W = 820;
const VB_H = 520;

const COLOR: Record<Certainty, string> = {
  kant: "#5e8553", // grön
  tolkat: "#b5532a", // terrakotta
  osakert: "#b03636", // röd
};
const FILL: Record<Certainty, string> = {
  kant: "#eef3ea",
  tolkat: "#f7ece4",
  osakert: "#f7e9e9",
};
const DASH: Record<Certainty, string | undefined> = {
  kant: undefined,
  tolkat: "7 5",
  osakert: "2 5",
};

function center(n: SchematicNode) {
  return { cx: n.x + W / 2, cy: n.y + H / 2 };
}

// Punkt på nodens kant i riktning mot (toward), så pilen hamnar utanför boxen.
function edgePoint(n: SchematicNode, toward: { cx: number; cy: number }) {
  const { cx, cy } = center(n);
  const dx = toward.cx - cx;
  const dy = toward.cy - cy;
  const hw = W / 2 + 4;
  const hh = H / 2 + 4;
  const t = Math.min(
    Math.abs(dx) < 1e-6 ? Infinity : hw / Math.abs(dx),
    Math.abs(dy) < 1e-6 ? Infinity : hh / Math.abs(dy),
  );
  return { x: cx + dx * t, y: cy + dy * t };
}

export default function SchematicMap({
  intro,
  nodes,
  edges,
}: {
  intro?: string;
  nodes: SchematicNode[];
  edges: SchematicEdge[];
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-medium tracking-tight">Karta</h1>
        <p className="text-ink-3 mt-0.5 text-sm">Schematisk vy — objekt, flöden och osäkra lägen</p>
        {intro && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{intro}</p>}

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-panel">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-auto w-full"
            role="img"
            aria-label="Schematisk vy över ledningssystemet"
          >
            <defs>
              {(["kant", "tolkat", "osakert"] as Certainty[]).map((c) => (
                <marker
                  key={c}
                  id={`arrow-${c}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L10 5 L0 10 z" fill={COLOR[c]} />
                </marker>
              ))}
            </defs>

            {/* Kanter (flöden) */}
            {edges.map((e, i) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              const p1 = edgePoint(a, center(b));
              const p2 = edgePoint(b, center(a));
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;
              const col = COLOR[e.certainty];
              return (
                <g key={i}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={col}
                    strokeWidth={2}
                    strokeDasharray={DASH[e.certainty]}
                    markerEnd={`url(#arrow-${e.certainty})`}
                  />
                  {e.issue === "stopp" && (
                    <circle cx={mx} cy={my} r={6} fill="#b03636" stroke="#fff" strokeWidth={1.5} />
                  )}
                  {e.label && (
                    <text x={mx} y={my - 10} textAnchor="middle" fontSize="12" fill="#6b6b6b">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Noder */}
            {nodes.map((n) => (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={W}
                  height={H}
                  rx={8}
                  fill={FILL[n.certainty]}
                  stroke={COLOR[n.certainty]}
                  strokeWidth={1.5}
                  strokeDasharray={n.certainty === "kant" ? undefined : "5 4"}
                />
                <text
                  x={n.x + W / 2}
                  y={n.y + (n.sub ? 24 : 32)}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="#2b2b2b"
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text x={n.x + W / 2} y={n.y + 40} textAnchor="middle" fontSize="11" fill="#7a7a7a">
                    {n.sub}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Teckenförklaring */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-2">
          <Legend color={COLOR.kant}>Känt läge</Legend>
          <Legend color={COLOR.tolkat} dashed>Tolkat läge</Legend>
          <Legend color={COLOR.osakert} dashed>Osäkert läge</Legend>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border border-white bg-[#b03636]" />
            Stopp
          </span>
        </div>
      </div>
    </div>
  );
}

function Legend({
  color,
  dashed,
  children,
}: {
  color: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="26" height="8" aria-hidden>
        <line
          x1="0"
          y1="4"
          x2="26"
          y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "5 3" : undefined}
        />
      </svg>
      {children}
    </span>
  );
}
