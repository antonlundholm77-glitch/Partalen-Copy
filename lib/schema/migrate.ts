// Forward-migrering + validering av ett inkommande ProjectDoc-JSON.
// All versionslogik bor HÄR: läs raw.schemaVersion, kör migrationer upp till
// CURRENT, validera sedan med zod. v1 är no-op. Nyare version än CURRENT avvisas.

import { CURRENT_SCHEMA_VERSION, ProjectDocSchema, type ProjectDoc } from "./project-doc";

export type ParseResult =
  | { ok: true; doc: ProjectDoc }
  | { ok: false; errors: string[] };

// Migrering från version N → N+1. Lägg till när schemaVersion bumpas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (d: any) => any> = {
  // 1: (d) => ({ ...d, schemaVersion: 2, /* ...transform... */ }),
};

export function migrateToLatest(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["JSON är inte ett objekt."] };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = raw;
  let version: number =
    typeof data.schemaVersion === "number" ? data.schemaVersion : 1;

  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `schemaVersion ${version} är nyare än vad appen stödjer (${CURRENT_SCHEMA_VERSION}). Uppdatera appen.`,
      ],
    };
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      return { ok: false, errors: [`Saknar migrering från schemaVersion ${version}.`] };
    }
    data = step(data);
    version += 1;
  }

  const parsed = ProjectDocSchema.safeParse({ ...data, schemaVersion: CURRENT_SCHEMA_VERSION });
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }
  return { ok: true, doc: parsed.data };
}
