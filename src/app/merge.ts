// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Reconciling two copies of the document — the phone's and the cloud's.
//
// The data model makes this unusually easy. Medications are keyed by id and
// each carries the timestamp of its last edit, so two copies merge med by med
// with the later edit winning. Day logs merge a level deeper: the `taken` maps
// are *unioned*, because each entry is one tap that happened on one device —
// a dose logged on the phone and a different dose logged on the tablet the
// same evening should both survive, and "later edit wins" at the day level
// would drop one of them.
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

/** Merge two day logs for the same day: the union of their taps, the earlier
 *  timestamp winning where both logged the same dose (the first tap is the
 *  one that happened). */
function mergeDayLogs(a: DayLog, b: DayLog): DayLog {
  const taken: Record<string, string> = { ...a.taken };
  for (const [key, at] of Object.entries(b.taken)) {
    const existing = taken[key];
    taken[key] = existing === undefined || at < existing ? at : existing;
  }
  return {
    date: a.date,
    taken,
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
