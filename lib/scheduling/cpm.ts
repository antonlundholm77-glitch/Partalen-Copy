// Critical Path Method (CPM) — hjärtat i Tidplan-modulen.
//
// Pure functions, inga DB-beroenden. Tar in tasks + deps + kalender + projektstart,
// returnerar ES/EF/LS/LF + float + kritisk linje per task.
//
// V1-scope:
//   ✅ Forward + backward pass
//   ✅ FS-beroenden med lag (positiv = väntetid, negativ = överlapp)
//   ✅ SS-beroenden med lag
//   ✅ Constraints: ASAP (default), MSO, MFO, SNET, FNLT, ALAP (sista används bakåt)
//   ✅ Milstolpar (durationDays = 0)
//   ✅ Cykeldetektion (kastar fel med stuck-nodes)
//   ✅ Total float + free float + kritisk linje
//   ⚠ FF-/SF-beroenden — varnar och behandlar som FS (TODO i nästa iteration)
//   ⚠ Summary-tasks behandlas som leafs (rolling-up i T2 när UI behöver det)
//   ⚠ ALAP/SNLT/FNET — flaggas som obehandlade (kastar varning)
//
// Konvention för datum-aritmetik (matchar calendar.ts):
//   computeEndDate(start, D) — inklusiv, dvs duration=1 from Mon = end Mon
//   addWorkingDays(start, N) — exklusiv, dvs Mon + 1 = next working day
//
// FS-beroende ES-formel:  ES_succ = addWorkingDays(EF_pred, lag + 1)
// SS-beroende ES-formel:  ES_succ = addWorkingDays(ES_pred, lag)

import type {
  Task,
  Dependency,
  WorkingCalendar,
  ConstraintType,
} from "./types";
import {
  computeEndDate,
  addWorkingDays,
  workingDaysBetween,
  nextWorkingDay,
} from "./calendar";

// =============================================================================
// Publika typer
// =============================================================================

export interface ComputedTaskSchedule {
  uid: string;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  totalFloatDays: number;
  freeFloatDays: number;
  isCritical: boolean;
}

export interface CpmResult {
  byUid: Map<string, ComputedTaskSchedule>;
  projectFinish: string;
  criticalPath: string[];        // uid:s, ordnade från start till slut
  warnings: string[];
}

export interface CpmInput {
  tasks: Task[];
  dependencies: Dependency[];
  calendar: WorkingCalendar;
  projectStart: string;          // ISO YYYY-MM-DD
}

export class CpmCycleError extends Error {
  constructor(public readonly stuckUids: string[]) {
    super(`Cykel i beroendegrafen — fastnade på: ${stuckUids.join(", ")}`);
    this.name = "CpmCycleError";
  }
}

// =============================================================================
// Hjälpare
// =============================================================================

function isDateConstraint(type: ConstraintType): boolean {
  return type !== "ASAP" && type !== "ALAP";
}

function maxIso(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

function minIso(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}

// =============================================================================
// Topologisk sortering med cykeldetektion (Kahn's algorithm)
// =============================================================================

function topologicalSort(taskUids: string[], deps: Dependency[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const uid of taskUids) {
    graph.set(uid, []);
    inDegree.set(uid, 0);
  }
  for (const d of deps) {
    if (!graph.has(d.predecessorUid) || !graph.has(d.successorUid)) continue;
    graph.get(d.predecessorUid)!.push(d.successorUid);
    inDegree.set(d.successorUid, (inDegree.get(d.successorUid) ?? 0) + 1);
  }

  const queue: string[] = [];
  inDegree.forEach((deg, uid) => { if (deg === 0) queue.push(uid); });

  const sorted: string[] = [];
  while (queue.length > 0) {
    const uid = queue.shift()!;
    sorted.push(uid);
    for (const succ of graph.get(uid) ?? []) {
      const next = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }

  if (sorted.length < taskUids.length) {
    const stuck = [...inDegree].filter(([, d]) => d > 0).map(([uid]) => uid);
    throw new CpmCycleError(stuck);
  }

  return sorted;
}

// =============================================================================
// CPM-huvudfunktion
// =============================================================================

export function computeCpm(input: CpmInput): CpmResult {
  const { tasks, dependencies, calendar, projectStart } = input;
  const warnings: string[] = [];

  // Filtrera till leaf-tasks (de som ska schemaläggas). Summary-tasks rullas
  // upp i ett senare steg när UI behöver det.
  const leafTasks = tasks.filter((t) => t.type !== "summary");
  const taskByUid = new Map<string, Task>(leafTasks.map((t) => [t.uid, t]));

  // Beroenden som rör leaf-tasks
  const leafDeps = dependencies.filter(
    (d) => taskByUid.has(d.predecessorUid) && taskByUid.has(d.successorUid),
  );

  // Indexera beroenden för snabb access
  const incomingByUid = new Map<string, Dependency[]>();
  const outgoingByUid = new Map<string, Dependency[]>();
  for (const uid of taskByUid.keys()) {
    incomingByUid.set(uid, []);
    outgoingByUid.set(uid, []);
  }
  for (const d of leafDeps) {
    incomingByUid.get(d.successorUid)!.push(d);
    outgoingByUid.get(d.predecessorUid)!.push(d);
  }

  // Topologisk sortering — kastar CpmCycleError vid cykel
  const order = topologicalSort([...taskByUid.keys()], leafDeps);

  // -------------------------------------------------------------------------
  // Forward pass: ES + EF
  // -------------------------------------------------------------------------

  const earlyStart = new Map<string, string>();
  const earlyFinish = new Map<string, string>();
  const projectStartAdjusted = nextWorkingDay(calendar, projectStart);

  for (const uid of order) {
    const task = taskByUid.get(uid)!;
    const incoming = incomingByUid.get(uid)!;
    const duration = task.durationDays ?? 0;

    // 1) Basdatum från beroenden
    let esCandidate: string | null = null;

    if (incoming.length === 0) {
      esCandidate = projectStartAdjusted;
    } else {
      for (const d of incoming) {
        const predEf = earlyFinish.get(d.predecessorUid);
        const predEs = earlyStart.get(d.predecessorUid);
        if (!predEf || !predEs) continue;
        let predicted: string;
        if (d.type === "FS") {
          predicted = addWorkingDays(calendar, predEf, d.lagDays + 1);
        } else if (d.type === "SS") {
          predicted = addWorkingDays(calendar, predEs, d.lagDays);
        } else {
          // FF/SF — flagga och behandla som FS
          warnings.push(
            `Beroende ${d.predecessorUid}→${d.successorUid} (${d.type}) hanteras inte i CPM v1 — behandlas som FS`,
          );
          predicted = addWorkingDays(calendar, predEf, d.lagDays + 1);
        }
        esCandidate = maxIso(esCandidate, predicted);
      }
    }

    if (esCandidate === null) esCandidate = projectStartAdjusted;

    // Säkra att esCandidate är en arbetsdag
    esCandidate = nextWorkingDay(calendar, esCandidate);

    // 2) Constraint-override på ES/EF
    let es = esCandidate;
    let ef: string;

    const constraintType: ConstraintType = task.constraint?.type ?? "ASAP";
    const constraintDate = task.constraint?.date;

    if (constraintType === "MSO" && constraintDate) {
      es = constraintDate;
    } else if (constraintType === "SNET" && constraintDate) {
      es = (maxIso(es, constraintDate) as string);
      es = nextWorkingDay(calendar, es);
    } else if (constraintType === "FNET" && constraintDate) {
      // FNET: EF får inte vara före constraint
      // Räkna ut EF från ES, sedan korrigera bakåt om EF < constraint
      const tentativeEf = duration > 0
        ? computeEndDate(calendar, es, duration)
        : es;
      const adjustedEf = maxIso(tentativeEf, constraintDate)!;
      ef = adjustedEf;
      if (adjustedEf !== tentativeEf) {
        // ES måste skjutas framåt så EF = adjustedEf med rätt duration
        if (duration > 0) {
          es = addWorkingDays(calendar, adjustedEf, -(duration - 1));
        } else {
          es = adjustedEf;
        }
      }
      earlyStart.set(uid, es);
      earlyFinish.set(uid, ef);
      continue;
    } else if (constraintType === "MFO" && constraintDate) {
      // MFO: EF låst
      ef = constraintDate;
      es = duration > 0
        ? addWorkingDays(calendar, ef, -(duration - 1))
        : ef;
      earlyStart.set(uid, es);
      earlyFinish.set(uid, ef);
      continue;
    } else if (constraintType === "FNLT" && constraintDate) {
      // FNLT: hanteras i backward pass som restriction på LF.
      // I forward pass: använd ES från deps som vanligt.
      // (Om ES + duration > FNLT-datum så är schemat omöjligt — flaggar inte i v1)
    } else if (constraintType === "SNLT" || constraintType === "ALAP") {
      // SNLT/ALAP hanteras i backward pass — varna i v1
      warnings.push(
        `Constraint ${constraintType} för task ${uid} hanteras inte i forward pass (v1) — restriction tillämpas i backward`,
      );
    }

    // 3) Beräkna EF från ES + duration
    if (task.type === "milestone" || duration === 0) {
      ef = es;
    } else {
      ef = computeEndDate(calendar, es, duration);
    }

    earlyStart.set(uid, es);
    earlyFinish.set(uid, ef);
  }

  // -------------------------------------------------------------------------
  // Projektets slutdatum: max EF över alla leaf-tasks
  // -------------------------------------------------------------------------

  let projectFinish: string | null = null;
  for (const ef of earlyFinish.values()) {
    projectFinish = maxIso(projectFinish, ef);
  }
  if (projectFinish === null) projectFinish = projectStartAdjusted;

  // -------------------------------------------------------------------------
  // Backward pass: LS + LF
  // -------------------------------------------------------------------------

  const lateStart = new Map<string, string>();
  const lateFinish = new Map<string, string>();

  // Gå i omvänd topologisk ordning
  for (let i = order.length - 1; i >= 0; i--) {
    const uid = order[i];
    const task = taskByUid.get(uid)!;
    const outgoing = outgoingByUid.get(uid)!;
    const duration = task.durationDays ?? 0;

    let lf: string | null = null;

    if (outgoing.length === 0) {
      // Slut-task: LF = projectFinish
      lf = projectFinish;
    } else {
      for (const d of outgoing) {
        const succLs = lateStart.get(d.successorUid);
        const succLf = lateFinish.get(d.successorUid);
        if (!succLs || !succLf) continue;
        let predicted: string;
        if (d.type === "FS") {
          // LF_self + 1 working day = LS_succ - lag
          // → LF_self = LS_succ - lag - 1 working day
          predicted = addWorkingDays(calendar, succLs, -(d.lagDays + 1));
        } else if (d.type === "SS") {
          // LS_self = LS_succ - lag → LF_self = LS_self + duration - 1
          const lsSelf = addWorkingDays(calendar, succLs, -d.lagDays);
          predicted = duration > 0
            ? computeEndDate(calendar, lsSelf, duration)
            : lsSelf;
        } else {
          // FF/SF — behandla som FS (varning utfärdad tidigare)
          predicted = addWorkingDays(calendar, succLs, -(d.lagDays + 1));
        }
        lf = minIso(lf, predicted);
      }
    }

    if (lf === null) lf = projectFinish;

    // Constraint-override på LF/LS
    const constraintType: ConstraintType = task.constraint?.type ?? "ASAP";
    const constraintDate = task.constraint?.date;

    if (constraintType === "MFO" && constraintDate) {
      lf = constraintDate;
    } else if (constraintType === "FNLT" && constraintDate) {
      lf = minIso(lf, constraintDate)!;
    } else if (constraintType === "MSO" && constraintDate) {
      // MSO låser ES; LS = ES (constraint), LF = LS + duration - 1
      const ls = constraintDate;
      lf = duration > 0
        ? computeEndDate(calendar, ls, duration)
        : ls;
      lateStart.set(uid, ls);
      lateFinish.set(uid, lf);
      continue;
    } else if (constraintType === "SNLT" && constraintDate) {
      // SNLT: LS får inte vara senare än constraint → LF = LS + duration - 1
      const lsFromLf = duration > 0
        ? addWorkingDays(calendar, lf, -(duration - 1))
        : lf;
      const adjustedLs = minIso(lsFromLf, constraintDate)!;
      const adjustedLf = duration > 0
        ? computeEndDate(calendar, adjustedLs, duration)
        : adjustedLs;
      lateStart.set(uid, adjustedLs);
      lateFinish.set(uid, adjustedLf);
      continue;
    }

    let ls: string;
    if (task.type === "milestone" || duration === 0) {
      ls = lf;
    } else {
      ls = addWorkingDays(calendar, lf, -(duration - 1));
    }

    lateStart.set(uid, ls);
    lateFinish.set(uid, lf);
  }

  // -------------------------------------------------------------------------
  // Float + critical
  // -------------------------------------------------------------------------

  const byUid = new Map<string, ComputedTaskSchedule>();

  for (const uid of order) {
    const es = earlyStart.get(uid)!;
    const ef = earlyFinish.get(uid)!;
    const ls = lateStart.get(uid)!;
    const lf = lateFinish.get(uid)!;

    // total_float = arbetsdagar mellan ES och LS
    // (om LS < ES: schemat är omöjligt — float negativ)
    const totalFloat = es <= ls
      ? workingDaysBetween(calendar, es, ls) - 1
      : -(workingDaysBetween(calendar, ls, es) - 1);

    // free_float = min(ES_succ - EF - lag - 1) över alla successors
    // Om inga successors: free_float = total_float (per konvention)
    const outgoing = outgoingByUid.get(uid)!;
    let freeFloat: number;
    if (outgoing.length === 0) {
      freeFloat = totalFloat;
    } else {
      let minSlack: number | null = null;
      for (const d of outgoing) {
        const succEs = earlyStart.get(d.successorUid);
        if (!succEs) continue;
        let slack: number;
        if (d.type === "FS") {
          // gap = workingDays between (EF + 1 + lag) and ES_succ
          const earliestStartForSucc = addWorkingDays(calendar, ef, d.lagDays + 1);
          if (earliestStartForSucc <= succEs) {
            slack = workingDaysBetween(calendar, earliestStartForSucc, succEs) - 1;
          } else {
            slack = -(workingDaysBetween(calendar, succEs, earliestStartForSucc) - 1);
          }
        } else if (d.type === "SS") {
          const earliestStartForSucc = addWorkingDays(calendar, es, d.lagDays);
          if (earliestStartForSucc <= succEs) {
            slack = workingDaysBetween(calendar, earliestStartForSucc, succEs) - 1;
          } else {
            slack = -(workingDaysBetween(calendar, succEs, earliestStartForSucc) - 1);
          }
        } else {
          slack = 0;
        }
        minSlack = minSlack === null ? slack : Math.min(minSlack, slack);
      }
      freeFloat = minSlack ?? totalFloat;
    }

    const isCritical = totalFloat <= 0;

    byUid.set(uid, {
      uid,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloatDays: totalFloat,
      freeFloatDays: freeFloat,
      isCritical,
    });
  }

  // -------------------------------------------------------------------------
  // Extrahera kritisk linje — följ critical → critical från startnoder
  // -------------------------------------------------------------------------

  const criticalPath: string[] = [];
  const visited = new Set<string>();

  // Hitta första critical task utan critical predecessor (start på kritisk linje)
  const startCriticals = order.filter((uid) => {
    if (!byUid.get(uid)!.isCritical) return false;
    const incoming = incomingByUid.get(uid)!;
    return !incoming.some((d) => {
      const pred = byUid.get(d.predecessorUid);
      return pred?.isCritical;
    });
  });

  for (const start of startCriticals) {
    let cursor: string | undefined = start;
    while (cursor && !visited.has(cursor)) {
      if (!byUid.get(cursor)?.isCritical) break;
      visited.add(cursor);
      criticalPath.push(cursor);
      // Hitta nästa critical successor
      const outgoing: Dependency[] = outgoingByUid.get(cursor) ?? [];
      const nextCritical: Dependency | undefined = outgoing.find(
        (d) => byUid.get(d.successorUid)?.isCritical,
      );
      cursor = nextCritical?.successorUid;
    }
  }

  return {
    byUid,
    projectFinish,
    criticalPath,
    warnings,
  };
}
