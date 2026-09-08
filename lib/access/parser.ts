// Portat från PM Cloud src/lib/access/parseAccessCode.ts.
//
// Grammatik: {TEKNIK}-{B1}[-{B2}][-{ROLL}]
// - TEKNIK, B1 obligatoriska
// - B2 (AVT/AVTB/UTF) valfri
// - ROLL valfri
// - Position 3 kan vara antingen B2 eller ROLL — parsern matchar B2 först.

import {
  isValidDiscipline,
  isValidPermissionLevel,
  isValidCommercialAccess,
  isValidRole,
} from "./constants";

export interface ParsedAccessCode {
  raw: string;
  discipline: string;
  permissionLevel: string;
  commercialAccess?: string;
  role?: string;
}

export type ParseResult =
  | { ok: true; parsed: ParsedAccessCode }
  | { ok: false; errors: string[]; raw: string };

export function parseAccessCode(input: unknown): ParseResult {
  if (typeof input !== "string") {
    return { ok: false, errors: ["Kod måste vara en sträng"], raw: String(input ?? "") };
  }

  const raw = input.trim().toUpperCase();
  if (!raw) {
    return { ok: false, errors: ["Kod saknas eller är tom"], raw };
  }

  const parts = raw.split("-").filter(Boolean);

  if (parts.length < 2) {
    return {
      ok: false,
      errors: ['Kod måste innehålla minst teknikområde och behörighet (t.ex. "P-INT")'],
      raw,
    };
  }
  if (parts.length > 4) {
    return {
      ok: false,
      errors: ["Kod får ha högst 4 segment: {TEKNIK}-{B1}-{B2}-{ROLL}"],
      raw,
    };
  }

  const errors: string[] = [];
  const [discipline, b1, third, fourth] = parts;

  if (!isValidDiscipline(discipline)) errors.push(`Okänt teknikområde: "${discipline}"`);
  if (!isValidPermissionLevel(b1)) errors.push(`Okänd behörighet (B1): "${b1}"`);

  let commercialAccess: string | undefined;
  let role: string | undefined;

  if (third !== undefined) {
    if (isValidCommercialAccess(third)) {
      commercialAccess = third;
      if (fourth !== undefined) {
        if (isValidRole(fourth)) role = fourth;
        else errors.push(`Okänd roll: "${fourth}"`);
      }
    } else if (fourth !== undefined) {
      errors.push(
        `Tredje segmentet "${third}" är inte en avtalsbehörighet (AVT/AVTB/UTF). ` +
          `Kontrollera ordningen: {TEKNIK}-{B1}-{B2}-{ROLL}.`,
      );
    } else {
      if (isValidRole(third)) role = third;
      else errors.push(`Okänt segment: "${third}" är varken avtalsbehörighet eller roll`);
    }
  }

  if (errors.length > 0) return { ok: false, errors, raw };

  return {
    ok: true,
    parsed: {
      raw,
      discipline,
      permissionLevel: b1,
      ...(commercialAccess && { commercialAccess }),
      ...(role && { role }),
    },
  };
}

// Bygger kod-sträng utan validering. Använd parseAccessCode för validering.
export function formatAccessCode(parts: {
  discipline: string;
  permissionLevel: string;
  commercialAccess?: string;
  role?: string;
}): string {
  const segments = [parts.discipline, parts.permissionLevel];
  if (parts.commercialAccess) segments.push(parts.commercialAccess);
  if (parts.role) segments.push(parts.role);
  return segments.join("-").toUpperCase();
}
