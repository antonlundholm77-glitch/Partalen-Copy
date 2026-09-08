// Exempelanvändare för Part-plattformen (utan Supabase).
// Ersätts av DB-data när AUTH_ENABLED = true.

import type { Role, UnitRole } from "@/lib/types";

export interface PreviewPerson {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin?: boolean;
  systemRole?: string;
}

export const PREVIEW_PEOPLE: PreviewPerson[] = [
  { id: "admin", name: "Part Admin", email: "admin@partgroup.se", isPlatformAdmin: true },
  { id: "pm", name: "Projektledare", email: "pm@partgroup.se" },
];

export interface OrgMembership {
  personId: string;
  orgId: string;
  role: Role;
}

export const ORG_MEMBERSHIPS: OrgMembership[] = [
  { personId: "pm", orgId: "part-group", role: "owner" },
];

export interface UnitMembership {
  personId: string;
  unitId: string;
  role: UnitRole;
}

export const UNIT_MEMBERSHIPS: UnitMembership[] = [
  { personId: "pm", unitId: "partalen", role: "manager" },
];

export interface PendingInvite {
  email: string;
  orgId: string;
  unitId?: string;
  role: string;
}

export const PENDING_INVITES: PendingInvite[] = [];

export function personById(id: string): PreviewPerson | undefined {
  return PREVIEW_PEOPLE.find((p) => p.id === id);
}

export function orgMembers(orgId: string): { person: PreviewPerson; role: Role }[] {
  return ORG_MEMBERSHIPS.filter((m) => m.orgId === orgId)
    .map((m) => ({ person: personById(m.personId)!, role: m.role }))
    .filter((x) => x.person);
}

export function unitMembers(unitId: string): { person: PreviewPerson; role: UnitRole }[] {
  return UNIT_MEMBERSHIPS.filter((m) => m.unitId === unitId)
    .map((m) => ({ person: personById(m.personId)!, role: m.role }))
    .filter((x) => x.person);
}

export function platformPeople(): PreviewPerson[] {
  return PREVIEW_PEOPLE.filter((p) => p.isPlatformAdmin);
}

export function unitInvites(unitId: string): PendingInvite[] {
  return PENDING_INVITES.filter((i) => i.unitId === unitId);
}

export function orgInvites(orgId: string): PendingInvite[] {
  return PENDING_INVITES.filter((i) => i.orgId === orgId && !i.unitId);
}
