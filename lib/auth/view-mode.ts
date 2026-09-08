// ViewMode — härlett tillstånd som styr UI-rendering. RLS skyddar data;
// ViewMode skyddar UX (vad användaren ser av plattformsstrukturen).
//
//   internal  — plattformsadmin: plattformens default-brand, alla kunder, /intern/*
//   customer  — kundadmin/member: kund-brand, kundens projekt, ingen plattformsbrand
//   project   — endast inbjuden till projekt: kund-brand, bara sitt projekt

export type ViewMode = "internal" | "customer" | "project";

export interface ViewModeContext {
  isPlatformAdmin: boolean;
  orgMembershipCount: number; // antal gf_memberships
  unitMembershipCount: number; // antal gf_unit_members
}

export function deriveViewMode(ctx: ViewModeContext): ViewMode {
  if (ctx.isPlatformAdmin) return "internal";
  if (ctx.orgMembershipCount > 0) return "customer";
  return "project";
}
