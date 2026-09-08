"use client";

// Injicerar brandens CSS-variabler + laddar Google Fonts dynamiskt.
// Komponenter använder var(--font-display), var(--font-mono),
// var(--brand-primary), var(--brand-accent) för att ärva brand.
//
// Theme styr nuvarande inte annat än ett data-attribut på root — kan
// senare användas i en .dark-theme-overlay om vi vill ha PM Cloud-stil
// mörk yta för hela kund-portalen.

import { useEffect } from "react";
import type { ResolvedBrand } from "@/lib/branding/types";

const GOOGLE_FONT_WEIGHTS = "300;400;500;600;700";

export default function BrandStyleInjector({ brand }: { brand: ResolvedBrand }) {
  const families: string[] = [];
  const seen = new Set<string>();
  for (const f of [brand.fonts?.display, brand.fonts?.body, brand.fonts?.mono]) {
    if (f && !seen.has(f)) {
      seen.add(f);
      families.push(f);
    }
  }
  const googleFontsUrl = families.length ? buildGoogleFontsUrl(families) : null;

  useEffect(() => {
    if (brand.theme) {
      document.documentElement.dataset.brandTheme = brand.theme;
    } else {
      delete document.documentElement.dataset.brandTheme;
    }
    return () => {
      delete document.documentElement.dataset.brandTheme;
    };
  }, [brand.theme]);

  // Skriv både brand-specifika vars (--font-*) för komponenter med inline-styles
  // OCH plattformens baseline-vars (--display/--sans/--mono) så Tailwind-klasserna
  // font-display, font-sans, font-mono automatiskt ärver brand-typsnitten.
  const lines: string[] = [];
  lines.push(`--brand-primary: ${brand.colors.primary};`);
  lines.push(`--brand-accent: ${brand.colors.accent};`);
  if (brand.fonts?.display) {
    const v = `'${brand.fonts.display}', var(--ff-display, ui-sans-serif)`;
    lines.push(`--font-display: ${v};`);
    lines.push(`--display: ${v};`);
  }
  if (brand.fonts?.body) {
    const v = `'${brand.fonts.body}', var(--ff-body, ui-sans-serif)`;
    lines.push(`--font-body: ${v};`);
    lines.push(`--sans: ${v};`);
  }
  if (brand.fonts?.mono) {
    const v = `'${brand.fonts.mono}', ui-monospace, monospace`;
    lines.push(`--font-mono: ${v};`);
    lines.push(`--mono: ${v};`);
  }
  // Portal-kunder (Partalen m.fl.) får kallare PM Cloud-stil bakgrund istället
  // för plattformens jordnära beige. Sidebar använder --bg-panel (vit) och
  // påverkas inte. Bara body-bakgrunden + secondary-toner byts.
  if (brand.portalMode) {
    lines.push(`--bg: #f7f8fa;`);
    lines.push(`--bg-secondary: #eef0f4;`);
  }
  const css = `:root {\n  ${lines.join("\n  ")}\n}`;

  return (
    <>
      {googleFontsUrl && (
        // eslint-disable-next-line @next/next/no-css-tags
        <link rel="stylesheet" href={googleFontsUrl} />
      )}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}

function buildGoogleFontsUrl(families: string[]): string {
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@${GOOGLE_FONT_WEIGHTS}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
