// Datakälla (seam). Just nu STATISK testdata ur fixturerna, så hela appen
// (även de inloggade /c- och /intern-vyerna) går att jobba med visuellt utan
// back-end. När vi går full back-end byts implementationen här inuti till
// Supabase-queries — sidorna som anropar funktionerna ändras inte.

import {
  PREVIEW_CUSTOMERS,
  getCustomer as _getCustomer,
  getUnit as _getUnit,
  type PreviewCustomer,
  type PreviewUnit,
} from "@/lib/preview-projects";
import {
  PREVIEW_PEOPLE,
  platformPeople as _platformPeople,
  orgMembers as _orgMembers,
  unitMembers as _unitMembers,
  orgInvites as _orgInvites,
  unitInvites as _unitInvites,
} from "@/lib/preview-people";
import fixture from "@/lib/preview-fixture.json";
import type { AmaCode, MfRow, TbEntry } from "@/lib/types";

export type { PreviewCustomer as Customer, PreviewUnit as Unit };

export const customers = PREVIEW_CUSTOMERS;
export const getCustomer = _getCustomer;
export const getUnit = _getUnit;

export const platformPeople = _platformPeople;
export const orgMembers = _orgMembers;
export const unitMembers = _unitMembers;
export const orgInvites = _orgInvites;
export const unitInvites = _unitInvites;
export { PREVIEW_PEOPLE };

// Gemensamt projekt-schema-objekt (ProjectDoc), assemblat från fixturerna ovan.
// Sömmen för en framtida Supabase-källa: byt kroppen i lib/project-doc.ts utan
// att anropssidor ändras.
export { getProjectDoc, buildProjectDoc } from "@/lib/project-doc";

export function customerStubs() {
  return customers.map((c) => ({ id: c.id, name: c.name }));
}

// Alla enheter grupperade per kund — för den globala projektväljaren i headern,
// där man kan välja projekt/kurs på tvären och få kunden ifylld.
export function unitGroups() {
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    unitNoun: c.unitNoun,
    unitNounPlural: c.unitNounPlural,
    units: c.units.map((u) => ({ id: u.id, name: u.name })),
  }));
}

// AMA-data (TB/MF + kodträd) för en enhet. Enheter utan data → tomt (ärligt).
export function getAmaData(unit: PreviewUnit): {
  codes: AmaCode[];
  tb: TbEntry[];
  mf: MfRow[];
} {
  if (!unit.hasData) return { codes: [], tb: [], mf: [] };
  return {
    codes: fixture.codes as AmaCode[],
    tb: fixture.tb as TbEntry[],
    mf: fixture.mf as MfRow[],
  };
}
