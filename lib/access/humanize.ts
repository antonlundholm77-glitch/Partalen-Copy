// Portat från PM Cloud src/lib/access/humanize.ts.
//
// Konverterar kod (eller parsed objekt) till mänskligt läsbar text.
// "P-INT-AVTB-EK" → "Projekt- och entreprenadgemensamt / Intern / Begränsad
// avtalsbehörighet / Ekonomi"

import {
  getDiscipline,
  getPermissionLevel,
  getCommercialAccess,
  getProjectRole,
  type CodeEntry,
} from "./constants";
import { parseAccessCode, type ParsedAccessCode } from "./parser";

export type Lang = "sv" | "en";

const label = (entry: CodeEntry | undefined, fallback: string, lang: Lang): string =>
  entry ? (lang === "sv" ? entry.sv : entry.en) : fallback;

export function humanizeParsed(parsed: ParsedAccessCode, lang: Lang = "sv"): string {
  const out: string[] = [];
  out.push(label(getDiscipline(parsed.discipline), parsed.discipline, lang));
  out.push(label(getPermissionLevel(parsed.permissionLevel), parsed.permissionLevel, lang));
  if (parsed.commercialAccess) {
    out.push(label(getCommercialAccess(parsed.commercialAccess), parsed.commercialAccess, lang));
  }
  if (parsed.role) {
    out.push(label(getProjectRole(parsed.role), parsed.role, lang));
  }
  return out.join(" / ");
}

export function humanizeAccessCode(code: string, lang: Lang = "sv"): string {
  const result = parseAccessCode(code);
  if (!result.ok) return code;
  return humanizeParsed(result.parsed, lang);
}

export function describeParts(
  parsed: ParsedAccessCode,
  lang: Lang = "sv",
): {
  discipline: string;
  permissionLevel: string;
  commercialAccess?: string;
  role?: string;
} {
  return {
    discipline: label(getDiscipline(parsed.discipline), parsed.discipline, lang),
    permissionLevel: label(
      getPermissionLevel(parsed.permissionLevel),
      parsed.permissionLevel,
      lang,
    ),
    ...(parsed.commercialAccess && {
      commercialAccess: label(
        getCommercialAccess(parsed.commercialAccess),
        parsed.commercialAccess,
        lang,
      ),
    }),
    ...(parsed.role && {
      role: label(getProjectRole(parsed.role), parsed.role, lang),
    }),
  };
}
