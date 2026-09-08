// Assembler: bygger ett validerat ProjectDoc från de (för närvarande statiska)
// fixturerna. Detta är sömmen där en framtida Supabase-källa kopplas in — samma
// funktion, annan kropp. Importerar bara leaf-moduler (inte lib/data.ts) så ingen
// cykel uppstår; lib/data.ts re-exporterar getProjectDoc.

import fixture from "@/lib/preview-fixture.json";
import { getCustomer, getUnit, PREVIEW_CUSTOMERS } from "@/lib/preview-projects";
import { unitMembers, unitInvites } from "@/lib/preview-people";
import { assignment } from "@/lib/assignments";
import { projectContent } from "@/lib/project-content";
import {
  CURRENT_SCHEMA_VERSION,
  ProjectDocSchema,
  projectKey,
  type ProjectDoc,
} from "@/lib/schema/project-doc";
import type { AmaCode, MfRow, TbEntry } from "@/lib/types";

// AMA-data-gate — speglar lib/data.getAmaData: delad fixtur, bara om hasData.
function amaFor(hasData: boolean): ProjectDoc["ama"] {
  if (!hasData) return { codes: [], tb: [], mf: [] };
  return {
    codes: fixture.codes as AmaCode[],
    tb: fixture.tb as TbEntry[],
    mf: fixture.mf as MfRow[],
  };
}

// Assemblar ProjectDoc för en enhet. Returnerar undefined om enheten saknas.
export function getProjectDoc(org: string, unit: string): ProjectDoc | undefined {
  const customer = getCustomer(org);
  const u = getUnit(org, unit);
  if (!customer || !u) return undefined;

  const doc: ProjectDoc = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    identity: { org, unit },
    metadata: {
      name: u.name,
      meta: u.meta,
      hasData: u.hasData,
      kind: customer.kind,
      ...(u.program !== undefined ? { program: u.program } : {}),
      ...(u.edition !== undefined ? { edition: u.edition } : {}),
      ...(u.phase !== undefined ? { phase: u.phase } : {}),
      ...(u.status !== undefined ? { status: u.status } : {}),
    },
    content: projectContent(org, unit) ?? {},
    ama: amaFor(u.hasData),
    modules: {
      ...(u.moduleGroups ? { groups: u.moduleGroups } : {}),
      ...(u.portal ? { portal: u.portal } : {}),
    },
    team: {
      members: unitMembers(unit).map((m) => ({ personId: m.person.id, role: m.role })),
      invites: unitInvites(unit).map((i) => ({ email: i.email, role: i.role })),
      ...(assignment(org, unit) ? { assignment: assignment(org, unit)! } : {}),
    },
  };

  // Validera mot schemat. Vid drift: logga i dev, returnera best-effort (doc är
  // redan byggd från typade källor, så detta fångar bara schema-glidning).
  const result = ProjectDocSchema.safeParse(doc);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        `[getProjectDoc] ${projectKey(org, unit)} validering misslyckades:`,
        result.error.issues,
      );
    }
    return doc;
  }
  return result.data;
}

// Alias — i statiskt läge är "bygg för export/seed" samma som "läs".
export const buildProjectDoc = getProjectDoc;

// Dev-svep: assemblar + validerar ALLA enheter. Returnerar lista över problem
// (tom = allt validerar). Använd från ett dev-skript eller admin-yta.
export function validateAllProjectDocs(): { key: string; errors: string[] }[] {
  const problems: { key: string; errors: string[] }[] = [];
  for (const c of PREVIEW_CUSTOMERS) {
    for (const u of c.units) {
      const doc = getProjectDoc(c.id, u.id);
      if (!doc) {
        problems.push({ key: projectKey(c.id, u.id), errors: ["kunde inte assemblas"] });
        continue;
      }
      const res = ProjectDocSchema.safeParse(doc);
      if (!res.success) {
        problems.push({
          key: projectKey(c.id, u.id),
          errors: res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
        });
      }
    }
  }
  return problems;
}
