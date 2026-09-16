// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Reconciling two copies of the document — the phone's and the cloud's.
//
// The data model makes this unusually easy. Medications are keyed by id and
// each carries the timestamp of its last edit, so two copies merge med by med
// with the later edit winning. Day logs merge a level deeper: their mark maps
// — `taken`, and the doses `skipped` — are *unioned*, because each entry is
// one tap that happened on one device — a dose logged on the phone and a
// different dose logged on the tablet the same evening should both survive,
// and "later edit wins" at the day level would drop one of them.
//
// The known cost: a removal is an absence, not a tombstone, so an un-ticked
// dose — or a deleted medication — comes back from the other device until
// that device syncs the removal... which it never can, because it has nothing
// to say. Doses are ticked far more often than un-ticked, and a medication
// you are done with is *stopped* (which is an edit, and syncs) rather than
// deleted, so the trade is worth it — but it is a real limitation, and
// `docs/sync.md` says so out loud.
//
// Pure and total: same inputs, same output, no clock, no storage.

import { DOC_VERSION, type AppData, type DayLog } from "./types.ts";

/** Union two maps of dose marks, the earlier timestamp winning where both
 *  sides hold the same dose — the first tap is the one that happened. */
function mergeMarks(
  a: Record<string, string>,
  b: Record<string, string>,
): Record<string, string> {
  const marks: Record<string, string> = { ...a };
  for (const [key, at] of Object.entries(b)) {
    const existing = marks[key];
    marks[key] = existing === undefined || at < existing ? at : existing;
  }
  return marks;
}

/** Merge two day logs for the same day: the union of their taps, and the
 *  union of the doses they set aside.
 *
 *  A dose one device took and the other skipped comes out **taken**, whichever
 *  happened first and whichever side it arrives from. The two maps are one
 *  claim's two answers (see `types.ts`), so a merge has to pick one, and taken
 *  is the only defensible pick: it is the answer with a swallowed dose behind
 *  it, while a skip is a decision about a dose that then wasn't taken — and it
 *  is the answer that keeps the union symmetric, since dropping a tap here
 *  would lose the one record this whole merge exists to protect. */
function mergeDayLogs(a: DayLog, b: DayLog): DayLog {
  const taken = mergeMarks(a.taken, b.taken);
  const skipped: Record<string, string> = {};
  for (const [key, at] of Object.entries(mergeMarks(a.skipped, b.skipped))) {
    if (!(key in taken)) skipped[key] = at;
  }
  return {
    date: a.date,
    taken,
    skipped,
    updatedAt: b.updatedAt > a.updatedAt ? b.updatedAt : a.updatedAt,
  };
}

/** Merge two documents: medications by last edit, day logs by union. */
export function mergeDocs(local: AppData, remote: AppData): AppData {
  const medications: AppData["medications"] = { ...local.medications };
  for (const [id, remoteMed] of Object.entries(remote.medications)) {
    const localMed = medications[id];
    // Ties keep the local side, so `mergeDocs(a, b)` and `mergeDocs(b, a)`
    // agree on content whenever the timestamps differ, and are stable when
    // they don't.
    medications[id] =
      localMed && localMed.updatedAt >= remoteMed.updatedAt
        ? localMed
        : remoteMed;
  }

  const days: AppData["days"] = { ...local.days };
  for (const [day, remoteLog] of Object.entries(remote.days)) {
    const localLog = days[day];
    days[day] = localLog ? mergeDayLogs(localLog, remoteLog) : remoteLog;
  }

  return { version: DOC_VERSION, medications, days };
}
