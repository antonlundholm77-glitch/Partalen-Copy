// Brand-aware logo. För plattformens default-brand → använd LogoMark + ordmärket.
// För kund-brand → wordmark, image, eller block (färgad bokstav + wordmark)
// beroende på vad som finns i brand-data.

import type { CSSProperties } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import type { ResolvedBrand } from "@/lib/branding/types";

export default function BrandedLogo({
  brand,
  size = 24,
}: {
  brand: ResolvedBrand;
  size?: number;
}) {
  if (brand.source === "platform") {
    return <Logo size={size} />;
  }

  // Image-baserad logo
  if (brand.logo.type === "image" && brand.logo.url) {
    const wordmark = brand.logo.wordmark?.text;
    const parts = wordmark ? splitForAccent(wordmark) : null;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5em" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logo.url}
          alt={brand.logo.alt ?? brand.displayName ?? brand.name}
          style={{ height: size, width: "auto", display: "block" }}
        />
        {parts && (
          <span
            className="font-display text-ink"
            style={{ fontWeight: 600, letterSpacing: "0.005em", lineHeight: 1, fontSize: Math.round(size * 0.72) }}
          >
            {parts.head}
            {parts.accent && (
              <b style={{ fontWeight: 700, color: brand.colors.accent }}>{parts.accent}</b>
            )}
          </span>
        )}
      </span>
    );
  }

  // Block-logo (P-block + wordmark) — för portal-kunder med stark identitet
  if (brand.logo.type === "block" && brand.logo.block) {
    const block = brand.logo.block;
    const wordmarkText = brand.logo.wordmark?.text ?? brand.displayName ?? brand.name;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6em" }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size + 6,
            height: size + 6,
            background: block.background,
            color: block.color,
            fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
            fontWeight: 700,
            fontSize: Math.round((size + 6) * 0.55),
            letterSpacing: "-0.02em",
            borderRadius: 2,
          }}
        >
          {block.letter}
        </span>
        <span
          className="font-display"
          style={{
            fontWeight: 600,
            letterSpacing: "-0.005em",
            lineHeight: 1,
            fontSize: Math.round(size * 0.8),
            color: brand.colors.primary,
          }}
        >
          {wordmarkText}
        </span>
      </span>
    );
  }

  // Default — wordmark med litet monogram-block i kundens primärfärg
  const text = brand.logo.wordmark?.text ?? brand.displayName ?? brand.name;
  const parts = splitForAccent(text);
  const wmStyle: CSSProperties = {
    fontWeight: 600,
    letterSpacing: "0.005em",
    lineHeight: 1,
    fontSize: Math.round(size * 0.72),
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5em" }}>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: 4,
          background: brand.colors.primary,
          color: "#fff",
          fontWeight: 700,
          fontSize: Math.round(size * 0.45),
          letterSpacing: "0.02em",
        }}
      >
        {brand.shortName}
      </span>
      <span className="font-display text-ink" style={wmStyle}>
        {parts.head}
        {parts.accent && (
          <b style={{ fontWeight: 700, color: brand.colors.accent }}>{parts.accent}</b>
        )}
      </span>
    </span>
  );
}

function splitForAccent(text: string): { head: string; accent?: string } {
  const idx = text.lastIndexOf(" ");
  if (idx < 0) return { head: text };
  return { head: text.slice(0, idx + 1), accent: text.slice(idx + 1) };
}

export { LogoMark };
