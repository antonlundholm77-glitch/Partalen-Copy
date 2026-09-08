// Ljus projekt-hero för portal-kunder (Partalen-stilen).
// Läser samma ProjectHero-data som BrandedHero men renderar i samma ljusa
// stil som PartalenWelcome: vit/ljusgrå bakgrund, subtilt grid-mönster,
// mono-eyebrow med accent-prick, mörkblå display-titel, ljusa stats-kort.

import type { ProjectHero, ResolvedBrand } from "@/lib/branding/types";

export default function PartalenProjectHero({
  hero,
  brand,
}: {
  hero: ProjectHero;
  brand: ResolvedBrand;
}) {
  const primary = brand.colors.primary;
  const accent = brand.colors.accent;
  const platformName = brand.displayName ?? brand.name;

  return (
    <div className="relative overflow-hidden px-8 pb-10 pt-12" style={{ background: "#f7f8fa" }}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(30,58,138,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,138,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {(hero.eyebrow ?? platformName) && (
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{ borderColor: `${primary}1f`, background: "#fff" }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: accent,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: primary,
                fontWeight: 600,
              }}
            >
              {hero.eyebrow ?? platformName}
            </span>
          </div>
        )}

        <h1
          style={{
            fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
            fontWeight: 300,
            fontSize: "clamp(36px, 5vw, 60px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: primary,
            margin: "24px 0 12px",
          }}
        >
          {hero.title}
        </h1>

        {hero.subtitle && (
          <p
            style={{
              fontFamily: "var(--font-body, var(--sans, ui-sans-serif))",
              fontSize: "clamp(15px, 1.2vw, 18px)",
              lineHeight: 1.55,
              color: "#475569",
              maxWidth: "62ch",
              margin: "0 0 22px",
            }}
          >
            {hero.subtitle}
          </p>
        )}

        {hero.chips && hero.chips.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center gap-2">
            {hero.chips.map((chip) => (
              <Chip key={chip} color={primary} accent={accent}>
                {chip}
              </Chip>
            ))}
          </div>
        )}

        {hero.stats && hero.stats.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              maxWidth: 920,
            }}
          >
            {hero.stats.map((s) => (
              <div
                key={s.label}
                className="rounded border bg-white"
                style={{ borderColor: "#e2e8f0", padding: "14px 16px" }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
                    fontWeight: 300,
                    fontSize: 28,
                    lineHeight: 1.1,
                    color: primary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginTop: 4,
                    fontWeight: 600,
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

function Chip({
  children,
  color,
  accent,
}: {
  children: React.ReactNode;
  color: string;
  accent: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded border bg-white px-2.5 py-1"
      style={{ borderColor: "#e2e8f0" }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: accent,
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          fontWeight: 600,
        }}
      >
        {children}
      </span>
    </span>
  );
}
