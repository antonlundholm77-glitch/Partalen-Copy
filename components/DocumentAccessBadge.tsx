// Färgkodad badge för klassificeringskod på dokument. Tonen följer B1
// (permission level): intern blå, extern bärnsten, gäst grå, admin lila.
// Hover-title = human-läsbar fullständig beskrivning.

import { parseAccessCode } from "@/lib/access/parser";
import { humanizeAccessCode } from "@/lib/access/humanize";

const TONE: Record<string, { bg: string; color: string; border: string }> = {
  ADMH: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  ADMU: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  INT:  { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  EXT:  { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  GST:  { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
};

const FALLBACK = { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };

export default function DocumentAccessBadge({
  code,
  size = "sm",
}: {
  code: string | null | undefined;
  size?: "sm" | "md";
}) {
  if (!code) return null;
  const parsed = parseAccessCode(code);
  const ok = parsed.ok;
  const b1 = ok ? parsed.parsed.permissionLevel : null;
  const tone = b1 ? TONE[b1] ?? FALLBACK : FALLBACK;
  const title = humanizeAccessCode(code);
  const padding = size === "md" ? "px-2.5 py-0.5" : "px-2 py-0.5";
  const fontSize = size === "md" ? "text-[11.5px]" : "text-[10.5px]";

  return (
    <span
      title={ok ? title : `Ogiltig kod: ${title}`}
      className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase tracking-wider ${padding} ${fontSize}`}
      style={{
        background: tone.bg,
        color: tone.color,
        borderColor: tone.border,
        opacity: ok ? 1 : 0.6,
      }}
    >
      {ok ? parsed.parsed.raw : code}
      {!ok && <span style={{ fontSize: "10px" }}>⚠</span>}
    </span>
  );
}
