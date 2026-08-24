// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What is due when. The document stores medications and taps; this module
// derives the schedule — which doses a given day owes, and how far through
// them the log says you are. Pure and total: same inputs, same output, no
// clock, no storage. The clock stays in the callers (`App.tsx` owns "today"),
// so every function here is trivially testable and two screens asking about
// the same day cannot disagree.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import {
  doseKey,
  sortedMedications,
  type AppData,
  type DayLog,
  type Medication,
} from "./types.ts";

/** One dose a day owes: the medication, the slot, and the key the log files
 *  it under. `takenAt` is the tap that cleared it, or null while it stands. */
export type Dose = {
  med: Medication;
  time: string;
  key: string;
  takenAt: string | null;
};

/** Whether a medication's schedule covers a day. `DayKey` is `YYYY-MM-DD`, so
 *  plain string comparison is date comparison. */
export function activeOn(med: Medication, day: DayKey): boolean {
  if (day < med.startDate) return false;
  return med.endDate === null || day <= med.endDate;
}

/** Every dose a day owes, in the order the Today screen lists them: by time
 *  slot, then by name within a slot. A day before a med started — or after it
 *  stopped — owes none of its doses, so old days never turn red when the
 *  schedule changes. */
export function dueDoses(data: AppData, day: DayKey): Dose[] {
  const log: DayLog | undefined = data.days[day];
  const doses: Dose[] = [];
  for (const med of sortedMedications(data)) {
    if (!activeOn(med, day)) continue;
    for (const time of med.times) {
      const key = doseKey(med.id, time);
      doses.push({ med, time, key, takenAt: log?.taken[key] ?? null });
    }
  }
  return doses.sort(
    (a, b) =>
      a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name),
  );
}

/** The same doses grouped by slot, in slot order — the shape the Today screen
 *  renders: a heading per time, a row per med under it. */
export function dosesByTime(doses: Dose[]): { time: string; doses: Dose[] }[] {
  const groups = new Map<string, Dose[]>();
  for (const dose of doses) {
    const group = groups.get(dose.time);
    if (group) group.push(dose);
    else groups.set(dose.time, [dose]);
  }
  return [...groups.entries()].map(([time, group]) => ({
    time,
    doses: group,
  }));
}

/** How far through a day's doses the log is. */
export type DayProgress = {
  due: number;
  taken: number;
  /** The one-word answer the calendar paints:
   *  - `none`    — nothing was due (no meds yet, or none active that day);
   *  - `full`    — everything due was taken;
   *  - `partial` — some taken, some not;
   *  - `missed`  — doses were due and none were taken.
   *  Whether an unfinished *today* is "missed" is the caller's call — the day
   *  is not over — which is why this stays a pure count-based answer. */
  status: "none" | "full" | "partial" | "missed";
};

/** Count a day's doses against its log. */
export function dayProgress(data: AppData, day: DayKey): DayProgress {
  const doses = dueDoses(data, day);
  const due = doses.length;
  const taken = doses.filter((d) => d.takenAt !== null).length;
  const status =
    due === 0
      ? "none"
      : taken === due
        ? "full"
        : taken === 0
          ? "missed"
          : "partial";
  return { due, taken, status };
}

/** Whether a "HH:MM" string is a real time of day — the validation the med
 *  form runs before a slot is saved. Zero-padded 24-hour form only, because
 *  that is what `<input type="time">` yields and what the slot sort relies
 *  on ("09:00" < "21:00" only works zero-padded). */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Normalise a med's slot list on the way into the document: valid times
 *  only, deduplicated, sorted. An empty answer is the caller's problem — a
 *  med with no slots is a med the schedule never asks about. */
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter(isValidTime))].sort();
}
