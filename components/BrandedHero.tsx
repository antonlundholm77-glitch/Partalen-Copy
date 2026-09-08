// Data-driven projekthero. Renderar samma visuella stil som PartalenHero
// (PM Cloud-influerad) men läser sin konfiguration från ResolvedBrand.hero
// (lagrad i gf_project_content.content.ui.brand.hero).

import type { ProjectHero } from "@/lib/branding/types";

export default function BrandedHero({ hero }: { hero: ProjectHero }) {
  const colors =
    hero.gradient && hero.gradient.length >= 2
      ? hero.gradient
      : ["#0284C7", "#1D4ED8", "#003366"];
  const gradientCss = `linear-gradient(135deg, ${colors
    .map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`)
    .join(", ")})`;
  const darkBackground = colors[colors.length - 1];

  return (
    <div className="relative overflow-hidden px-8 py-12" style={{ background: gradientCss }}>
      {/* Bakgrundsmönster */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(45deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {hero.eyebrow && (
          <p
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.75)",
              margin: 0,
            }}
          >
            {hero.eyebrow}
          </p>
        )}

        <h1
          style={{
            fontFamily: "var(--font-display, var(--ff-display, ui-sans-serif))",
            fontWeight: 300,
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: "#fff",
            margin: hero.eyebrow ? "12px 0 8px" : "0 0 8px",
          }}
        >
          {hero.title}
        </h1>

        {hero.subtitle && (
          <p
            style={{
              fontFamily: "var(--font-display, var(--ff-display, ui-sans-serif))",
              fontWeight: 300,
              fontSize: "clamp(15px, 1.3vw, 19px)",
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.82)",
              maxWidth: "56ch",
              margin: "0 0 24px",
            }}
          >
            {hero.subtitle}
          </p>
        )}

        {hero.chips && hero.chips.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {hero.chips.map((chip) => (
              <HeroChip key={chip}>{chip}</HeroChip>
            ))}
          </div>
        )}

        {hero.stats && hero.stats.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 1,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.18)",
              maxWidth: 920,
            }}
          >
            {hero.stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: hexToRgba(darkBackground, 0.85),
                  padding: "14px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display, var(--ff-display, ui-sans-serif))",
                    fontWeight: 300,
                    fontSize: 28,
                    lineHeight: 1.1,
                    color: "#fff",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.7)",
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#fff",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.22)",
        padding: "5px 10px",
      }}
    >
      {children}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
