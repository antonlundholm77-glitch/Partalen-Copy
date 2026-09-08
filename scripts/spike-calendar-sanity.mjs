// Spike: verifiera att calendar.ts faktiskt räknar arbetsdagar rätt
// mot svenska helgdagar 2026-2027. Kör utan DB.
//
// Detta är inlinad version — riktiga lib/scheduling/calendar.ts importeras
// från Next-koden via TypeScript.

// =============================================================================
// Inlined version of calendar.ts (för Node-run utan tsc)
// =============================================================================

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(iso) {
  if (!ISO_DATE_RE.test(iso)) throw new Error(`Ogiltigt ISO-datum: ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIsoDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addCalendarDays(iso, days) {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function isoWeekday(iso) {
  const d = parseIsoDate(iso);
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

function prepare(cal) {
  return {
    workingDays: new Set(cal.workingDays),
    holidaysByDate: new Map(cal.exceptions.map((e) => [e.date, e])),
  };
}

function isWorkingDayPrepared(prep, iso) {
  const exc = prep.holidaysByDate.get(iso);
  if (exc) {
    if (exc.type === "holiday") return false;
    if (exc.type === "workday") return true;
    if (exc.type === "partial") return (exc.hours ?? 0) > 0;
  }
  return prep.workingDays.has(isoWeekday(iso));
}

function addWorkingDaysPrepared(prep, iso, days) {
  if (days === 0) return iso;
  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let cursor = iso;
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction);
    if (isWorkingDayPrepared(prep, cursor)) remaining -= 1;
  }
  return cursor;
}

function computeEndDate(cal, start, durationDays) {
  if (durationDays <= 0) return start;
  const prep = prepare(cal);
  let cursor = start;
  while (!isWorkingDayPrepared(prep, cursor)) cursor = addCalendarDays(cursor, 1);
  if (durationDays === 1) return cursor;
  return addWorkingDaysPrepared(prep, cursor, durationDays - 1);
}

function workingDaysBetween(cal, startIso, endIso) {
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

// =============================================================================
// Svensk standardkalender (motsvarar migration 0021 seed)
// =============================================================================

const SE_STANDARD = {
  ref: "se-standard",
  name: "Svensk standard",
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
    // 2027 (partiellt — räcker för testen)
    { date: "2027-01-01", type: "holiday", label: "Nyårsdagen" },
    { date: "2027-01-06", type: "holiday", label: "Trettondedag jul" },
    { date: "2027-03-26", type: "holiday", label: "Långfredagen" },
    { date: "2027-03-29", type: "holiday", label: "Annandag påsk" },
    { date: "2027-05-01", type: "holiday", label: "Första maj" },
    { date: "2027-12-24", type: "holiday", label: "Julafton" },
    { date: "2027-12-25", type: "holiday", label: "Juldagen" },
    { date: "2027-12-26", type: "holiday", label: "Annandag jul" },
  ],
};

// =============================================================================
// Test-suite
// =============================================================================

let passed = 0;
let failed = 0;

function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    passed += 1;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    förväntat: ${expected}`);
    console.log(`    fick:      ${actual}`);
    failed += 1;
  }
}

console.log("\n📋 Calendar-spike — svenska arbetsdagar 2026-2027\n");

console.log("Grundläggande veckodag:");
assertEq("2026-08-17 är måndag (ISO 1)", isoWeekday("2026-08-17"), 1);
assertEq("2026-08-22 är lördag (ISO 6)", isoWeekday("2026-08-22"), 6);
assertEq("2026-08-23 är söndag (ISO 7)", isoWeekday("2026-08-23"), 7);

console.log("\nArbetsdag-detektion:");
assertEq("Måndag 2026-08-17 är arbetsdag", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-08-17"), true);
assertEq("Lördag 2026-08-22 är inte arbetsdag", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-08-22"), false);
assertEq("Söndag 2026-08-23 är inte arbetsdag", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-08-23"), false);
assertEq("Julafton 2026-12-24 är inte arbetsdag (holiday)", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-12-24"), false);
assertEq("Midsommardagen 2026-06-20 är inte arbetsdag", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-06-20"), false);
assertEq("Trettondedag jul 2026-01-06 är inte arbetsdag (tisdag)", isWorkingDayPrepared(prepare(SE_STANDARD), "2026-01-06"), false);

console.log("\ncomputeEndDate — duration räknat inklusivt:");
// Måndag 2026-08-17 + 1 arbetsdag = samma måndag
assertEq("Mån + 1d = samma mån (2026-08-17)", computeEndDate(SE_STANDARD, "2026-08-17", 1), "2026-08-17");
// Mån + 5d = fredag samma vecka (5-dagars task)
assertEq("Mån + 5d = fredag (2026-08-21)", computeEndDate(SE_STANDARD, "2026-08-17", 5), "2026-08-21");
// Mån + 6d = måndag nästa vecka (hoppar över helg)
assertEq("Mån + 6d = nästa mån (2026-08-24)", computeEndDate(SE_STANDARD, "2026-08-17", 6), "2026-08-24");
// Mån + 10d = fredag nästa vecka
assertEq("Mån + 10d = fre vecka 2 (2026-08-28)", computeEndDate(SE_STANDARD, "2026-08-17", 10), "2026-08-28");

console.log("\ncomputeEndDate — hoppar över svenska helgdagar:");
// Tisdag 2026-12-22 + 5 arbetsdagar.
// 26 dec 2026 är LÖRDAG (inte ons!) → annandag jul overlappar weekend.
// Räkning: 22 tis (1), 23 ons (2), 24 tor (holiday), 25 fre (holiday),
//          26-27 weekend (inkl. annandag jul som lör), 28 mån (3), 29 tis (4),
//          30 ons (5) = 2026-12-30. (Slutbesiktning hinner ej till 2027.)
assertEq("Tis 2026-12-22 + 5d över jul = 2026-12-30", computeEndDate(SE_STANDARD, "2026-12-22", 5), "2026-12-30");

console.log("\nworkingDaysBetween — räkna arbetsdagar i en period:");
// 2026-08-17 mån → 2026-08-21 fre = 5 arbetsdagar
assertEq("Mån-fre = 5 arbetsdagar", workingDaysBetween(SE_STANDARD, "2026-08-17", "2026-08-21"), 5);
// 2026-08-17 mån → 2026-08-24 nästa mån = 6 arbetsdagar (hoppar lör+sön)
assertEq("Mån-nästa mån = 6 arbetsdagar", workingDaysBetween(SE_STANDARD, "2026-08-17", "2026-08-24"), 6);
// 2026-12-21..31: 21 mån, 22 tis, 23 ons (working);
//                  24 tor (holiday), 25 fre (holiday);
//                  26 lör, 27 sön (weekend); annandag jul OVERLAPPAR weekend;
//                  28 mån, 29 tis, 30 ons (working); 31 tor (holiday)
//                  = 6 working days
assertEq("Julvecka 2026-12-21..31 = 6 arbetsdagar", workingDaysBetween(SE_STANDARD, "2026-12-21", "2026-12-31"), 6);

console.log("\nExempel: etappberäkning:");
// Etablering 10 arbetsdagar från 2026-08-17 mån
// Mån(1) tis(2) ons(3) tor(4) fre(5) → lör/sön → mån(6) tis(7) ons(8) tor(9) fre(10) = 2026-08-28
assertEq("Etablering 10d från 2026-08-17 = 2026-08-28", computeEndDate(SE_STANDARD, "2026-08-17", 10), "2026-08-28");

console.log("\n────────────────────────────────────────");
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log("────────────────────────────────────────\n");

process.exit(failed === 0 ? 0 : 1);
