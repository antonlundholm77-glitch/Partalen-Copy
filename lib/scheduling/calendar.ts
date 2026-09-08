// Arbetsdagsräknare för Tidplan-modulen.
//
// Pure functions — inga DB-beroenden, inga date-libs. Räknar arbetsdagar
// utifrån WorkingCalendar (workingDays + exceptions). Används av:
//   - CPM-motorn (lib/scheduling/cpm.ts) — forward/backward pass
//   - Import-pipelines som måste konvertera durationDays till slut-datum
//   - UI-tooltips ("12 arbetsdagar från 2026-08-17 = 2026-09-04")
//
// Datum hanteras som ISO-strängar (YYYY-MM-DD). Vi använder Date internt för
// arithmetic men returnerar alltid ISO. Tidszoner hanteras inte — vi räknar
// kalenderdagar lokalt utan timezone-shift (alla datum är date-only).

import type { WorkingCalendar, CalendarException } from "./types";

// =============================================================================
// Datum-helpers (ISO ↔ Date, utan timezone-effekter)
// =============================================================================

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(iso: string): Date {
  if (!ISO_DATE_RE.test(iso)) {
    throw new Error(`Ogiltigt ISO-datum: ${iso}`);
  }
  // Använd UTC för att slippa timezone-shift
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addCalendarDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

// ISO weekday: 1=mån, 2=tis, ..., 7=sön
export function isoWeekday(iso: string): number {
  const d = parseIsoDate(iso);
  const js = d.getUTCDay();  // 0=sön, 1=mån, ..., 6=lör
  return js === 0 ? 7 : js;
}

// =============================================================================
// Working-day-logik
// =============================================================================

interface PreparedCalendar {
  workingDays: Set<number>;
  holidaysByDate: Map<string, CalendarException>;
}

function prepare(cal: WorkingCalendar): PreparedCalendar {
  return {
    workingDays: new Set(cal.workingDays),
    holidaysByDate: new Map(cal.exceptions.map((e) => [e.date, e])),
  };
}

export function isWorkingDay(cal: WorkingCalendar, iso: string): boolean {
  const prep = prepare(cal);
  return isWorkingDayPrepared(prep, iso);
}

function isWorkingDayPrepared(prep: PreparedCalendar, iso: string): boolean {
  const exc = prep.holidaysByDate.get(iso);
  if (exc) {
    if (exc.type === "holiday") return false;
    if (exc.type === "workday") return true;
    if (exc.type === "partial") return (exc.hours ?? 0) > 0;
  }
  return prep.workingDays.has(isoWeekday(iso));
}

/**
 * Lägg till N arbetsdagar till ett startdatum.
 *
 * Konvention: om startdatumet *är* en arbetsdag och N=0, returneras
 * startdatumet. Om N=1, returneras nästa arbetsdag.
 *
 * För durations: en task som startar 2026-08-17 (måndag) och har duration=5
 * arbetsdagar slutar på 2026-08-21 (fredag). Dvs slutet är inklusivt.
 * Använd addWorkingDays för exklusiv aritmetik (uppgift som startar måndag,
 * "5 arbetsdagar senare" = nästa måndag).
 */
export function addWorkingDays(cal: WorkingCalendar, iso: string, days: number): string {
  const prep = prepare(cal);
  return addWorkingDaysPrepared(prep, iso, days);
}

function addWorkingDaysPrepared(prep: PreparedCalendar, iso: string, days: number): string {
  if (days === 0) return iso;
  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let cursor = iso;
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction);
    if (isWorkingDayPrepared(prep, cursor)) {
      remaining -= 1;
    }
  }
  return cursor;
}

/**
 * Beräkna slut-datum för en task som börjar på `start` och pågår
 * `durationDays` arbetsdagar. Konventionen är **inklusiv** — en task med
 * durationDays=1 som börjar måndag slutar måndag.
 */
export function computeEndDate(cal: WorkingCalendar, start: string, durationDays: number): string {
  if (durationDays <= 0) return start;
  const prep = prepare(cal);
  // Hitta första arbetsdagen ≥ start
  let cursor = start;
  while (!isWorkingDayPrepared(prep, cursor)) {
    cursor = addCalendarDays(cursor, 1);
  }
  // cursor är dag 1 av durationen
  if (durationDays === 1) return cursor;
  return addWorkingDaysPrepared(prep, cursor, durationDays - 1);
}

/**
 * Räkna antalet arbetsdagar mellan två datum (inklusivt på båda sidor).
 * Returnerar 0 om end < start.
 */
export function workingDaysBetween(
  cal: WorkingCalendar,
  startIso: string,
  endIso: string,
): number {
  if (endIso < startIso) return 0;
  const prep = prepare(cal);
  let count = 0;
  let cursor = startIso;
  while (cursor <= endIso) {
    if (isWorkingDayPrepared(prep, cursor)) count += 1;
    cursor = addCalendarDays(cursor, 1);
  }
  return count;
}

/**
 * Subtrahera N arbetsdagar (för backward pass i CPM).
 */
export function subtractWorkingDays(
  cal: WorkingCalendar,
  iso: string,
  days: number,
): string {
  return addWorkingDays(cal, iso, -days);
}

/**
 * Säkerställ att ett datum är en arbetsdag. Om inte, returnera nästa
 * arbetsdag (framåt). Används för att lyfta start-datum från en helg/helgdag.
 */
export function nextWorkingDay(cal: WorkingCalendar, iso: string): string {
  const prep = prepare(cal);
  let cursor = iso;
  while (!isWorkingDayPrepared(prep, cursor)) {
    cursor = addCalendarDays(cursor, 1);
  }
  return cursor;
}

/**
 * Föregående arbetsdag (för backward pass).
 */
export function previousWorkingDay(cal: WorkingCalendar, iso: string): string {
  const prep = prepare(cal);
  let cursor = iso;
  while (!isWorkingDayPrepared(prep, cursor)) {
    cursor = addCalendarDays(cursor, -1);
  }
  return cursor;
}
