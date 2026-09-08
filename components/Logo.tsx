import type { CSSProperties } from "react";

// Plattformens logotyp — molekyl + ordmärke.
// Molekylen är ren currentColor; ordmärket "Part" + accent-fet "Plattform".

type LogoMarkProps = { size?: number; color?: string; className?: string; title?: string };

export function LogoMark({
  size = 26,
  color = "var(--accent-bright, var(--accent))",
  className,
  title,
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ color, display: "block" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round">
        <line x1="58" y1="60" x2="88" y2="30" />
        <line x1="58" y1="60" x2="98" y2="66" />
        <line x1="58" y1="60" x2="60" y2="96" />
        <line x1="58" y1="60" x2="22" y2="74" />
        <line x1="58" y1="60" x2="34" y2="30" />
      </g>
      <g fill="currentColor">
        <circle cx="88" cy="30" r="10" />
        <circle cx="98" cy="66" r="9" />
        <circle cx="60" cy="96" r="9" />
        <circle cx="22" cy="74" r="10" />
        <circle cx="34" cy="30" r="8" />
        <circle cx="58" cy="60" r="13" />
      </g>
    </svg>
  );
}

type LogoProps = {
  size?: number;
  markColor?: string;
  textSize?: number | string;
  className?: string;
  style?: CSSProperties;
};

export function Logo({
  size = 24,
  markColor = "var(--accent)",
  textSize,
  className,
  style,
}: LogoProps) {
  const wmStyle: CSSProperties = {
    fontWeight: 600,
    letterSpacing: "0.005em",
    lineHeight: 1,
    fontSize: textSize ?? Math.round(size * 0.72),
  };
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5em", ...style }}
    >
      <LogoMark size={size} color={markColor} />
      <span className="font-display text-ink" style={wmStyle}>
        Part<b style={{ fontWeight: 700, color: "var(--accent)" }}>alen</b>
      </span>
    </span>
  );
}
