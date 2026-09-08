// Client-säkra typer + default-konstant för brand. Server-funktionen
// getBrand() ligger i lib/db/branding.ts och importerar från denna fil.
// Den separationen behövs så att client-komponenter (Shell, TopBar,
// BrandedLogo) kan referera ResolvedBrand utan att webpack drar med
// next/headers via @supabase/ssr.

export interface BrandColors {
  primary: string;
  accent: string;
  background?: string;
}

export interface BrandWordmark {
  text: string;
}

// Färgat block med en bokstav (t.ex. "P") som visas före wordmarken.
// Används av portal-kunder med stark visuell identitet (jfr Partalens P-block).
export interface BrandLogoBlock {
  letter: string;
  background: string;
  color: string;
}

export interface BrandLogo {
  type: "wordmark" | "image" | "block";
  wordmark?: BrandWordmark;
  url?: string;
  alt?: string;
  block?: BrandLogoBlock;
}

export interface ProjectHeroStat {
  value: string;
  label: string;
}

export interface ProjectHero {
  variant: "pmcloud" | "default";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  gradient?: string[];
  chips?: string[];
  stats?: ProjectHeroStat[];
}

export interface BrandFonts {
  // Primära Google Fonts-namn (eller systemfont). Kan vara odefinierad → ärver
  // plattformens baseline. Anges som ren font-familjenamn ("Roboto", "JetBrains Mono").
  display?: string;
  body?: string;
  mono?: string;
}

export interface ResolvedBrand {
  source: "platform" | "customer";
  // name = kund-namnet (för breadcrumb/admin). displayName = vad som visas i
  // logga/header om kunden white-labelat plattformen (t.ex. "Partalen" för
  // Part Group). Default till name om displayName saknas.
  name: string;
  displayName?: string;
  shortName: string;
  logo: BrandLogo;
  colors: BrandColors;
  attribution: boolean;
  attributionText?: string;
  portalMode?: boolean;
  // Vilken landningskomponent som ska användas för kundens /c/<org>-yta.
  // Default = CustomerOverview. "partalen-welcome" = Partalen-portalen.
  landingTemplate?: string;
  fonts?: BrandFonts;
  theme?: "light" | "dark";
  hero?: ProjectHero;
}

export const DEFAULT_BRAND: ResolvedBrand = {
  source: "platform",
  name: "Part Plattform",
  shortName: "PP",
  logo: {
    type: "wordmark",
    wordmark: { text: "Part Plattform" },
  },
  colors: {
    primary: "#6d6930",
    accent: "#b5532a",
  },
  attribution: false,
};
