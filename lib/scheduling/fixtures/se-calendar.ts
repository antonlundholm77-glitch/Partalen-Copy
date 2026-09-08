// Svensk standardkalender — speglar migration 0019 seed.
//
// Används i UI när DB-migrationen inte är applicerad ännu, eller när
// klient-komponenter behöver räkna mot kalender utan server-roundtrip.
// L1/L2-data — strukturell definition + helgdagslista över ett antal år.

import type { WorkingCalendar } from "../types";

export const SE_STANDARD: WorkingCalendar = {
  ref: "se-standard",
  name: "Svensk arbetskalender (standard)",
  description: "Mån–fre, 8h per dag, svenska helgdagar 2026–2028.",
  workingDays: [1, 2, 3, 4, 5],
  workingHoursPerDay: 8,
  exceptions: [
    // 2026
    { date: "2026-01-01", type: "holiday", label: "Nyårsdagen" },
    { date: "2026-01-06", type: "holiday", label: "Trettondedag jul" },
    { date: "2026-04-03", type: "holiday", label: "Långfredagen" },
    { date: "2026-04-05", type: "holiday", label: "Påskdagen" },
    { date: "2026-04-06", type: "holiday", label: "Annandag påsk" },
    { date: "2026-05-01", type: "holiday", label: "Första maj" },
    { date: "2026-05-14", type: "holiday", label: "Kristi himmelsfärd" },
    { date: "2026-06-06", type: "holiday", label: "Sveriges nationaldag" },
    { date: "2026-06-19", type: "holiday", label: "Midsommarafton" },
    { date: "2026-06-20", type: "holiday", label: "Midsommardagen" },
    { date: "2026-10-31", type: "holiday", label: "Alla helgons dag" },
    { date: "2026-12-24", type: "holiday", label: "Julafton" },
    { date: "2026-12-25", type: "holiday", label: "Juldagen" },
    { date: "2026-12-26", type: "holiday", label: "Annandag jul" },
    { date: "2026-12-31", type: "holiday", label: "Nyårsafton" },
    // 2027
    { date: "2027-01-01", type: "holiday", label: "Nyårsdagen" },
    { date: "2027-01-06", type: "holiday", label: "Trettondedag jul" },
    { date: "2027-03-26", type: "holiday", label: "Långfredagen" },
    { date: "2027-03-28", type: "holiday", label: "Påskdagen" },
    { date: "2027-03-29", type: "holiday", label: "Annandag påsk" },
    { date: "2027-05-01", type: "holiday", label: "Första maj" },
    { date: "2027-05-06", type: "holiday", label: "Kristi himmelsfärd" },
    { date: "2027-06-06", type: "holiday", label: "Sveriges nationaldag" },
    { date: "2027-06-25", type: "holiday", label: "Midsommarafton" },
    { date: "2027-06-26", type: "holiday", label: "Midsommardagen" },
    { date: "2027-11-06", type: "holiday", label: "Alla helgons dag" },
    { date: "2027-12-24", type: "holiday", label: "Julafton" },
    { date: "2027-12-25", type: "holiday", label: "Juldagen" },
    { date: "2027-12-26", type: "holiday", label: "Annandag jul" },
    { date: "2027-12-31", type: "holiday", label: "Nyårsafton" },
    // 2028
    { date: "2028-01-01", type: "holiday", label: "Nyårsdagen" },
    { date: "2028-01-06", type: "holiday", label: "Trettondedag jul" },
    { date: "2028-04-14", type: "holiday", label: "Långfredagen" },
    { date: "2028-04-16", type: "holiday", label: "Påskdagen" },
    { date: "2028-04-17", type: "holiday", label: "Annandag påsk" },
    { date: "2028-05-01", type: "holiday", label: "Första maj" },
    { date: "2028-05-25", type: "holiday", label: "Kristi himmelsfärd" },
    { date: "2028-06-06", type: "holiday", label: "Sveriges nationaldag" },
    { date: "2028-06-23", type: "holiday", label: "Midsommarafton" },
    { date: "2028-06-24", type: "holiday", label: "Midsommardagen" },
    { date: "2028-11-04", type: "holiday", label: "Alla helgons dag" },
    { date: "2028-12-24", type: "holiday", label: "Julafton" },
    { date: "2028-12-25", type: "holiday", label: "Juldagen" },
    { date: "2028-12-26", type: "holiday", label: "Annandag jul" },
    { date: "2028-12-31", type: "holiday", label: "Nyårsafton" },
  ],
};
