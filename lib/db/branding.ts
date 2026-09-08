// Brand-resolution. Hämtar kund-brand från gf_org_content och eventuell
// projekt-override från gf_project_content. Cachas per request.
//
// Default = plattformens egen brand när orgSlug saknas eller viewMode =
// internal utan org-kontext.
//
// OBS: Denna fil är server-only (importerar lib/supabase/server som drar
// next/headers). Client-komponenter ska importera typerna från
// `lib/branding/types` istället.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ViewMode } from "@/lib/auth/view-mode";
import {
  DEFAULT_BRAND,
  type BrandColors,
  type BrandFonts,
  type BrandLogo,
  type ProjectHero,
  type ResolvedBrand,
} from "@/lib/branding/types";

// Re-export så befintliga import-paths fortsätter fungera i server-kod.
export {
  DEFAULT_BRAND,
  type BrandColors,
  type BrandFonts,
  type BrandLogo,
  type ProjectHero,
  type ResolvedBrand,
};

const CUSTOMER_DEFAULTS = {
  primary: "#475569",
  accent: "#3b82f6",
};

// JSONB-strukturen vi förväntar oss (matchar seed-skriptet).
type OrgContentBrand = {
  name?: string;
  displayName?: string;
  shortName?: string;
  logo?: BrandLogo;
  colors?: Partial<BrandColors>;
  attribution?: boolean;
  attributionText?: string;
  portalMode?: boolean;
  landingTemplate?: string;
  fonts?: BrandFonts;
  theme?: "light" | "dark";
};

type ProjectContentBrand = {
  hero?: ProjectHero;
};

export interface GetBrandOptions {
  viewMode: ViewMode;
  orgSlug?: string;
  projectSlug?: string;
}

export const getBrand = cache(
  async (opts: GetBrandOptions): Promise<ResolvedBrand> => {
    if (!opts.orgSlug) return DEFAULT_BRAND;

    const supabase = await createClient();

    const orgRes = await supabase
      .from("gf_organizations")
      .select("id, name, slug")
      .eq("slug", opts.orgSlug)
      .maybeSingle();
    const org = orgRes.data as { id: string; name: string; slug: string | null } | null;
    if (!org) return DEFAULT_BRAND;

    const [orgContentRes, projectIdRes] = await Promise.all([
      supabase
        .from("gf_org_content")
        .select("content")
        .eq("org_id", org.id)
        .maybeSingle(),
      opts.projectSlug
        ? supabase
            .from("gf_projects")
            .select("id")
            .eq("org_id", org.id)
            .eq("slug", opts.projectSlug)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const orgContent = (orgContentRes.data as { content: { brand?: OrgContentBrand } } | null)
      ?.content;
    const orgBrand = orgContent?.brand;

    const brand: ResolvedBrand = {
      source: "customer",
      name: orgBrand?.name ?? org.name,
      displayName: orgBrand?.displayName,
      shortName: orgBrand?.shortName ?? deriveShortName(org.name),
      logo:
        orgBrand?.logo ??
        ({
          type: "wordmark",
          wordmark: { text: orgBrand?.name ?? org.name },
        } as BrandLogo),
      colors: {
        primary: orgBrand?.colors?.primary ?? CUSTOMER_DEFAULTS.primary,
        accent: orgBrand?.colors?.accent ?? CUSTOMER_DEFAULTS.accent,
      },
      attribution: orgBrand?.attribution ?? false,
      attributionText: orgBrand?.attributionText,
      portalMode: orgBrand?.portalMode === true,
      landingTemplate: orgBrand?.landingTemplate,
      fonts: orgBrand?.fonts,
      theme: orgBrand?.theme,
    };

    if (opts.projectSlug) {
      const project = (projectIdRes.data as { id: string } | null) ?? null;
      if (project) {
        const pcRes = await supabase
          .from("gf_project_content")
          .select("content")
          .eq("project_id", project.id)
          .maybeSingle();
        const pc = (pcRes.data as { content: { ui?: { brand?: ProjectContentBrand } } } | null)
          ?.content;
        const hero = pc?.ui?.brand?.hero;
        if (hero) brand.hero = hero;
      }
    }

    return brand;
  },
);

function deriveShortName(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
