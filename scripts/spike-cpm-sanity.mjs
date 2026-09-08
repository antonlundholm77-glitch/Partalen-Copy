// Spike: CPM-motorn mot kända scenarion.
//
// Inlinad version av calendar + cpm för Node-run utan tsc. Testet bevisar
// att huvudfallen ger korrekt resultat. Vid divergens från min mental
// modell: räkna om för hand först, kanske är min förväntan fel
// (jfr calendar-spiken där annandag jul 2026 var lör, inte ons).

// =============================================================================
// Inlined calendar (förkortad version — bara det CPM behöver)
// =============================================================================

function parseIsoDate(iso) {
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
function prepareCal(cal) {
  return {
    workingDays: new Set(cal.workingDays),
    holidaysByDate: new Map(cal.exceptions.map((e) => [e.date, e])),
  };
}
function isWorkingDay(cal, iso) {
  const prep = prepareCal(cal);
  const exc = prep.holidaysByDate.get(iso);
  if (exc) {
    if (exc.type === "holiday") return false;
    if (exc.type === "workday") return true;
  }
  return prep.workingDays.has(isoWeekday(iso));
}
function addWorkingDays(cal, iso, days) {
  if (days === 0) return iso;
  const prep = prepareCal(cal);
  const dir = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let cursor = iso;
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, dir);
    const exc = prep.holidaysByDate.get(cursor);
    let isW;
    if (exc) {
      if (exc.type === "holiday") isW = false;
      else if (exc.type === "workday") isW = true;
      else isW = prep.workingDays.has(isoWeekday(cursor));
    } else {
      isW = prep.workingDays.has(isoWeekday(cursor));
    }
    if (isW) remaining -= 1;
  }
  return cursor;
}
function computeEndDate(cal, start, days) {
  if (days <= 0) return start;
  let cursor = start;
  while (!isWorkingDay(cal, cursor)) cursor = addCalendarDays(cursor, 1);
  if (days === 1) return cursor;
  return addWorkingDays(cal, cursor, days - 1);
}
function workingDaysBetween(cal, startIso, endIso) {
  if (endIso < startIso) return 0;
  let count = 0;
  let cursor = startIso;
  while (cursor <= endIso) {
    if (isWorkingDay(cal, cursor)) count += 1;
    cursor = addCalendarDays(cursor, 1);
  }
  return count;
}
function nextWorkingDay(cal, iso) {
  let cursor = iso;
  while (!isWorkingDay(cal, cursor)) cursor = addCalendarDays(cursor, 1);
  return cursor;
}

// =============================================================================
// Enkel CPM-implementation (spegel av lib/scheduling/cpm.ts)
//
// Tar samma input + returnerar samma output. Inte 100 % exakt samma kod,
// men samma algoritm. Om denna divergerar från TS-versionen är båda fel.
// =============================================================================

function maxIso(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}
function minIso(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}

function topologicalSort(uids, deps) {
  const graph = new Map();
  const inDeg = new Map();
  for (const u of uids) { graph.set(u, []); inDeg.set(u, 0); }
  for (const d of deps) {
    if (!graph.has(d.predecessorUid) || !graph.has(d.successorUid)) continue;
    graph.get(d.predecessorUid).push(d.successorUid);
    inDeg.set(d.successorUid, (inDeg.get(d.successorUid) ?? 0) + 1);
  }
  const queue = [];
  inDeg.forEach((d, u) => { if (d === 0) queue.push(u); });
  const sorted = [];
  while (queue.length > 0) {
    const u = queue.shift();
    sorted.push(u);
    for (const s of graph.get(u) ?? []) {
      const next = (inDeg.get(s) ?? 0) - 1;
      inDeg.set(s, next);
      if (next === 0) queue.push(s);
    }
  }
  if (sorted.length < uids.length) {
    throw new Error(`Cykel: ${[...inDeg].filter(([, d]) => d > 0).map(([u]) => u).join(", ")}`);
  }
  return sorted;
}

function computeCpm({ tasks, dependencies, calendar, projectStart }) {
  const leafTasks = tasks.filter((t) => t.type !== "summary");
  const taskByUid = new Map(leafTasks.map((t) => [t.uid, t]));
  const leafDeps = dependencies.filter(
    (d) => taskByUid.has(d.predecessorUid) && taskByUid.has(d.successorUid),
  );
  const incoming = new Map();
  const outgoing = new Map();
  for (const u of taskByUid.keys()) { incoming.set(u, []); outgoing.set(u, []); }
  for (const d of leafDeps) {
    incoming.get(d.successorUid).push(d);
    outgoing.get(d.predecessorUid).push(d);
  }
  const order = topologicalSort([...taskByUid.keys()], leafDeps);

  const earlyStart = new Map();
  const earlyFinish = new Map();
  const projectStartAdj = nextWorkingDay(calendar, projectStart);

  for (const uid of order) {
    const task = taskByUid.get(uid);
    const inc = incoming.get(uid);
    const duration = task.durationDays ?? 0;

    let esC = null;
    if (inc.length === 0) {
      esC = projectStartAdj;
    } else {
      for (const d of inc) {
        const pEf = earlyFinish.get(d.predecessorUid);
        const pEs = earlyStart.get(d.predecessorUid);
        if (!pEf || !pEs) continue;
        let pred;
        if (d.type === "FS") pred = addWorkingDays(calendar, pEf, d.lagDays + 1);
        else if (d.type === "SS") pred = addWorkingDays(calendar, pEs, d.lagDays);
        else pred = addWorkingDays(calendar, pEf, d.lagDays + 1);
        esC = maxIso(esC, pred);
      }
    }
    if (esC === null) esC = projectStartAdj;
    esC = nextWorkingDay(calendar, esC);

    let es = esC;
    const cType = task.constraint?.type ?? "ASAP";
    const cDate = task.constraint?.date;

    if (cType === "MSO" && cDate) {
      es = cDate;
    } else if (cType === "SNET" && cDate) {
      es = nextWorkingDay(calendar, maxIso(es, cDate));
    } else if (cType === "MFO" && cDate) {
      const ef = cDate;
      const esLocked = duration > 0
        ? addWorkingDays(calendar, ef, -(duration - 1))
        : ef;
      earlyStart.set(uid, esLocked);
      earlyFinish.set(uid, ef);
      continue;
    }

    let ef;
    if (task.type === "milestone" || duration === 0) ef = es;
    else ef = computeEndDate(calendar, es, duration);

    earlyStart.set(uid, es);
    earlyFinish.set(uid, ef);
  }

  let projectFinish = null;
  for (const ef of earlyFinish.values()) projectFinish = maxIso(projectFinish, ef);
  if (projectFinish === null) projectFinish = projectStartAdj;

  const lateStart = new Map();
  const lateFinish = new Map();

  for (let i = order.length - 1; i >= 0; i--) {
    const uid = order[i];
    const task = taskByUid.get(uid);
    const out = outgoing.get(uid);
    const duration = task.durationDays ?? 0;

    let lf = null;
    if (out.length === 0) {
      lf = projectFinish;
    } else {
      for (const d of out) {
        const sLs = lateStart.get(d.successorUid);
        if (!sLs) continue;
        let pred;
        if (d.type === "FS") pred = addWorkingDays(calendar, sLs, -(d.lagDays + 1));
        else if (d.type === "SS") {
          const lsSelf = addWorkingDays(calendar, sLs, -d.lagDays);
          pred = duration > 0 ? computeEndDate(calendar, lsSelf, duration) : lsSelf;
        } else pred = addWorkingDays(calendar, sLs, -(d.lagDays + 1));
        lf = minIso(lf, pred);
      }
    }
    if (lf === null) lf = projectFinish;

    const cType = task.constraint?.type ?? "ASAP";
    const cDate = task.constraint?.date;
    if (cType === "MFO" && cDate) lf = cDate;
    else if (cType === "FNLT" && cDate) lf = minIso(lf, cDate);
    else if (cType === "MSO" && cDate) {
      const ls = cDate;
      const lfLocked = duration > 0 ? computeEndDate(calendar, ls, duration) : ls;
      lateStart.set(uid, ls);
      lateFinish.set(uid, lfLocked);
      continue;
    }

    let ls;
    if (task.type === "milestone" || duration === 0) ls = lf;
    else ls = addWorkingDays(calendar, lf, -(duration - 1));

    lateStart.set(uid, ls);
    lateFinish.set(uid, lf);
  }

  const byUid = new Map();
  for (const uid of order) {
    const es = earlyStart.get(uid);
    const ef = earlyFinish.get(uid);
    const ls = lateStart.get(uid);
    const lf = lateFinish.get(uid);
    const tf = es <= ls
      ? workingDaysBetween(calendar, es, ls) - 1
      : -(workingDaysBetween(calendar, ls, es) - 1);
    byUid.set(uid, {
      uid, earlyStart: es, earlyFinish: ef, lateStart: ls, lateFinish: lf,
      totalFloatDays: tf, isCritical: tf <= 0,
    });
  }

  return { byUid, projectFinish };
}

// =============================================================================
// Kalender (förenklad — bara helger, inga 2026-helgdagar för enklare test)
// =============================================================================

const PLAIN_CAL = {
  workingDays: [1, 2, 3, 4, 5],
  workingHoursPerDay: 8,
  exceptions: [],
};

// =============================================================================
// Test-harness
// =============================================================================

let passed = 0;
let failed = 0;
function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    passed += 1;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    förväntat: ${JSON.stringify(expected)}`);
    console.log(`    fick:      ${JSON.stringify(actual)}`);
    failed += 1;
  }
}

// =============================================================================
// Scenario 1 — Linjär kedja A→B→C, alla 5d
//
// Förväntat (start 2026-08-17 mån):
//   A: ES=2026-08-17 mån, EF=2026-08-21 fre  (5 arbetsdagar)
//   B: ES=2026-08-24 mån, EF=2026-08-28 fre  (FS lag 0 från A)
//   C: ES=2026-08-31 mån, EF=2026-09-04 fre
//   Project finish: 2026-09-04
//   Alla critical (single chain, ingen float)
// =============================================================================

console.log("\n📋 Scenario 1: Linjär kedja A→B→C (alla 5d)\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "B", name: "B", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "C", name: "C", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 0 },
      { predecessorUid: "B", successorUid: "C", type: "FS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A.ES", result.byUid.get("A").earlyStart, "2026-08-17");
  assertEq("A.EF", result.byUid.get("A").earlyFinish, "2026-08-21");
  assertEq("B.ES", result.byUid.get("B").earlyStart, "2026-08-24");
  assertEq("B.EF", result.byUid.get("B").earlyFinish, "2026-08-28");
  assertEq("C.ES", result.byUid.get("C").earlyStart, "2026-08-31");
  assertEq("C.EF", result.byUid.get("C").earlyFinish, "2026-09-04");
  assertEq("project finish", result.projectFinish, "2026-09-04");
  assertEq("A critical", result.byUid.get("A").isCritical, true);
  assertEq("B critical", result.byUid.get("B").isCritical, true);
  assertEq("C critical", result.byUid.get("C").isCritical, true);
  assertEq("A total float", result.byUid.get("A").totalFloatDays, 0);
}

// =============================================================================
// Scenario 2 — Parallella grenar: A → B; A → C; B → D; C → D
//   A=5d, B=10d, C=3d, D=2d
//
// Branch via B: A(5) + B(10) + D(2) = 17 arbetsdagar
// Branch via C: A(5) + C(3) + D(2) = 10 arbetsdagar
// Kritisk linje = A → B → D. C har float = 7 dagar.
// =============================================================================

console.log("\n📋 Scenario 2: Parallella grenar — kritisk via längsta\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "B", name: "B", type: "task", durationDays: 10, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "C", name: "C", type: "task", durationDays: 3, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "D", name: "D", type: "task", durationDays: 2, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 0 },
      { predecessorUid: "A", successorUid: "C", type: "FS", lagDays: 0 },
      { predecessorUid: "B", successorUid: "D", type: "FS", lagDays: 0 },
      { predecessorUid: "C", successorUid: "D", type: "FS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A critical", result.byUid.get("A").isCritical, true);
  assertEq("B critical (längsta gren)", result.byUid.get("B").isCritical, true);
  assertEq("C INTE critical (kortare gren)", result.byUid.get("C").isCritical, false);
  assertEq("D critical", result.byUid.get("D").isCritical, true);
  assertEq("C total float = 7 dagar", result.byUid.get("C").totalFloatDays, 7);
  assertEq("B total float = 0", result.byUid.get("B").totalFloatDays, 0);
}

// =============================================================================
// Scenario 3 — Lag mellan tasks (FS lag 5)
//
// A 5d, B 5d med FS lag 5
// A: 17-21 aug (mån-fre)
// B: ES = 5 arbetsdagar efter A.EF + 1 working day = addWorkingDays(EF_A=21, lag+1=6) = 31 aug
// =============================================================================

console.log("\n📋 Scenario 3: FS-lag = 5 arbetsdagar mellan A och B\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "B", name: "B", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 5 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A.EF", result.byUid.get("A").earlyFinish, "2026-08-21");
  // 21 aug (fre) + 6 working days = 31 aug (måndag)
  // Räkning: 21(fre) -> 24(mån,1) -> 25(2) -> 26(3) -> 27(4) -> 28(5) -> 31(6) = 2026-08-31
  assertEq("B.ES = 2026-08-31 (5d lag efter A)", result.byUid.get("B").earlyStart, "2026-08-31");
  assertEq("B.EF", result.byUid.get("B").earlyFinish, "2026-09-04");
}

// =============================================================================
// Scenario 4 — Milstolpe
//
// A 5d → M milestone (duration 0)
// =============================================================================

console.log("\n📋 Scenario 4: Milstolpe (duration 0)\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "M", name: "M Slutmilstolpe", type: "milestone", durationDays: 0, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "M", type: "FS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A.EF = 2026-08-21", result.byUid.get("A").earlyFinish, "2026-08-21");
  assertEq("M.ES = 2026-08-24 (mån efter)", result.byUid.get("M").earlyStart, "2026-08-24");
  assertEq("M.EF = M.ES (milstolpe)", result.byUid.get("M").earlyFinish, "2026-08-24");
  assertEq("project finish", result.projectFinish, "2026-08-24");
}

// =============================================================================
// Scenario 5 — MSO constraint låser ES
//
// A 5d, B 5d FS — men B har MSO 2026-09-01 (tisdag), så B låst där
// A: 17-21 aug
// B FS skulle ge 24 aug, men MSO 2026-09-01 vinner → B: 01-07 sep
// =============================================================================

console.log("\n📋 Scenario 5: MSO constraint överrides deps\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      {
        uid: "B", name: "B", type: "task", durationDays: 5,
        percentComplete: 0, sortOrder: 0, isCritical: false,
        constraint: { type: "MSO", date: "2026-09-01" },
      },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("B.ES låst av MSO = 2026-09-01", result.byUid.get("B").earlyStart, "2026-09-01");
  // 2026-09-01 tis + 5d = 1,2,3,4,7 = 2026-09-07 mån
  assertEq("B.EF = 2026-09-07", result.byUid.get("B").earlyFinish, "2026-09-07");
}

// =============================================================================
// Scenario 6 — SNET constraint = "kan inte börja innan datum"
//
// A 5d, B 5d FS, projektstart 17 aug
// A skulle börja 17 aug, men SNET 2026-09-01 → A börjar 1 sep istället
// =============================================================================

console.log("\n📋 Scenario 6: SNET constraint pushar fram start\n");
{
  const result = computeCpm({
    tasks: [
      {
        uid: "A", name: "A", type: "task", durationDays: 5,
        percentComplete: 0, sortOrder: 0, isCritical: false,
        constraint: { type: "SNET", date: "2026-09-01" },
      },
      { uid: "B", name: "B", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A.ES SNET-låst = 2026-09-01", result.byUid.get("A").earlyStart, "2026-09-01");
  assertEq("B börjar efter A", result.byUid.get("B").earlyStart, "2026-09-08");
}

// =============================================================================
// Scenario 7 — Cykel detekteras
// =============================================================================

console.log("\n📋 Scenario 7: Cykel kastar fel\n");
{
  let threw = false;
  let errMsg = "";
  try {
    computeCpm({
      tasks: [
        { uid: "A", name: "A", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
        { uid: "B", name: "B", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
      ],
      dependencies: [
        { predecessorUid: "A", successorUid: "B", type: "FS", lagDays: 0 },
        { predecessorUid: "B", successorUid: "A", type: "FS", lagDays: 0 },
      ],
      calendar: PLAIN_CAL,
      projectStart: "2026-08-17",
    });
  } catch (e) {
    threw = true;
    errMsg = e.message;
  }
  assertEq("Cykel kastar fel", threw, true);
  assertEq("Felmeddelandet nämner stuck-nodes", errMsg.includes("A") && errMsg.includes("B"), true);
}

// =============================================================================
// Scenario 8 — SS-beroende (parallell start)
//
// A 10d, B 5d med SS lag 0 (B börjar när A börjar)
// A: 17-28 aug (10d)
// B: 17-21 aug (5d, börjar samtidigt som A)
// =============================================================================

console.log("\n📋 Scenario 8: SS-beroende (parallell start)\n");
{
  const result = computeCpm({
    tasks: [
      { uid: "A", name: "A", type: "task", durationDays: 10, percentComplete: 0, sortOrder: 0, isCritical: false },
      { uid: "B", name: "B", type: "task", durationDays: 5, percentComplete: 0, sortOrder: 0, isCritical: false },
    ],
    dependencies: [
      { predecessorUid: "A", successorUid: "B", type: "SS", lagDays: 0 },
    ],
    calendar: PLAIN_CAL,
    projectStart: "2026-08-17",
  });
  assertEq("A.ES = 2026-08-17", result.byUid.get("A").earlyStart, "2026-08-17");
  assertEq("B.ES = samma dag som A", result.byUid.get("B").earlyStart, "2026-08-17");
  assertEq("A.EF = 2026-08-28", result.byUid.get("A").earlyFinish, "2026-08-28");
  assertEq("B.EF = 2026-08-21", result.byUid.get("B").earlyFinish, "2026-08-21");
}

// =============================================================================
// Slutsumma
// =============================================================================

console.log("\n────────────────────────────────────────");
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log("────────────────────────────────────────\n");

process.exit(failed === 0 ? 0 : 1);
