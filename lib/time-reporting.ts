// Konstanter och hjälpare för tidrapportering. Aktivitetslistan är hardkodad
// i fas 1 — kan flyttas till tabell när teamet växer.

export const ACTIVITIES = [
  { key: "projektering", label: "Projektering" },
  { key: "mote", label: "Möte" },
  { key: "granskning", label: "Granskning" },
  { key: "uppdragsledning", label: "Uppdragsledning" },
  { key: "internt", label: "Internt" },
  { key: "franvaro", label: "Frånvaro" },
] as const;

export type ActivityKey = (typeof ACTIVITIES)[number]["key"];

export const ACTIVITY_KEYS: readonly ActivityKey[] = ACTIVITIES.map((a) => a.key);

export function activityLabel(key: string): string {
  return ACTIVITIES.find((a) => a.key === key)?.label ?? key;
}

// ISO-vecka och måndag-baserad veckostruktur. Använder samma logik som
// lib/resource-planning.ts så vyerna är synkade visuellt.
export function isoWeekOf(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

// Måndag i samma ISO-vecka som givet datum. Returnerar en ny Date i lokal tid
// vid 00:00. Används för att bygga veckogrid (mån–sön).
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // sön = 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  return d;
}

// Returnerar [måndag, ..., söndag] som Date-objekt 00:00 lokal tid.
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// YYYY-MM-DD från Date (lokal tid). gf_time_entries.entry_date lagras som
// date utan tidszon — formatet matchar Postgres-DATE direkt.
export function toEntryDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Vänd: "YYYY-MM-DD" → Date (lokal tid, 00:00).
export function fromEntryDate(s: string): Date {
  const [y, m, d] = s.split("-").map((p) => parseInt(p, 10));
  return new Date(y, m - 1, d);
}

// Veckans förra/nästa måndag — för veck-navigation.
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export const SWEDISH_WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"] as const;
