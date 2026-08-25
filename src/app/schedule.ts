// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What is due when. The document stores medications and taps; this module
// derives the schedule — which doses a given day owes, and how far through
// them the log says you are. Pure and total: same inputs, same output, no
// clock, no storage. The clock stays in the callers (`App.tsx` owns "today"),
// so every function here is trivially testable and two screens asking about
// the same day cannot disagree.

import {
  parseDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

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

/** The weekday a `DayKey` falls on, in `Date.getDay()` numbering (0 = Sunday)
 *  — the numbering the week-start setting and `Intl` both speak. Read in UTC
 *  from the key's own components, so it is the same answer in every timezone
 *  and, like everything else here, involves no clock. -1 for a string that
 *  isn't a day, which therefore matches no weekday mask. */
export function weekdayOf(day: DayKey): number {
  const parts = parseDayKey(day);
  if (!parts) return -1;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Normalise a weekday mask on the way into the document: whole numbers 0–6
 *  only, deduplicated, sorted — and null whenever the answer is "every day".
 *
 *  Both an empty selection and all seven days collapse to null on purpose: a
 *  medication with no days is not a schedule, and "all seven" is the same
 *  schedule as no mask at all. One schedule, one representation — which is
 *  what lets `activeOn` decide with a null check and lets two devices holding
 *  the same schedule serialize to the same bytes. */
export function normalizeWeekdays(
  weekdays: readonly number[] | null | undefined,
): number[] | null {
  if (!weekdays) return null;
  const days = [
    ...new Set(weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
  ].sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? null : days;
}

/** Whether a medication's mask covers a day's weekday. A null mask is every
 *  day, which is what an unmasked medication carries. */
export function onWeekday(med: Medication, day: DayKey): boolean {
  return med.weekdays === null || med.weekdays.includes(weekdayOf(day));
}

/** Whether a medication's schedule covers a day: inside its start/end span,
 *  and on one of its weekdays. `DayKey` is `YYYY-MM-DD`, so plain string
 *  comparison is date comparison.
 *
 *  A masked-off day owes nothing rather than owing doses nobody took, which
 *  is the whole point of the mask: the calendar leaves it blank and the
 *  adherence figure passes over it (see `stats.ts`), instead of reading a
 *  Tuesday off as a Tuesday forgotten. */
export function activeOn(med: Medication, day: DayKey): boolean {
  if (day < med.startDate) return false;
  if (med.endDate !== null && day > med.endDate) return false;
  return onWeekday(med, day);
}

/** Every dose a day owes, in the order the Today screen lists them: by time
 *  slot, then by name within a slot. A day before a med started — or after it
 *  stopped, or off its weekday mask — owes none of its doses, so old days
 *  never turn red when the schedule changes. */
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

/** Minutes past midnight for a "HH:MM" slot — the arithmetic form of a time
 *  of day, for ordering against a moment rather than against other slots.
 *  -1 for anything that isn't a slot. */
export function minutesOfDay(time: string): number {
  if (!isValidTime(time)) return -1;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** How long before a slot still counts as "about to happen" for the quick-log
 *  ordering. An hour: people take the evening dose at half past nine and log
 *  it, and the slot they are reaching for should be the first row. */
export const QUICK_LOG_GRACE_MINUTES = 60;

/** How far a slot is from a moment, for quick-log ordering — smaller is more
 *  likely to be the dose in your hand.
 *
 *  Not a plain distance, because the two directions are not the same claim.
 *  A slot already past is one you *could* have taken, so it is ranked by how
 *  long ago it was; a slot still ahead is one you have not reached yet, and
 *  only counts as imminent inside the grace window above — beyond that it
 *  sorts as what it is, yesterday's version of the same slot, nearly a full
 *  day behind. So at four in the afternoon an unticked 08:00 comes before a
 *  20:00, and at half past seven in the evening the 20:00 comes first.
 *
 *  Both directions wrap around midnight, so a 23:00 slot read at 00:30 is
 *  ninety minutes behind rather than a day and a half away. */
export function quickLogDistance(time: string, nowMinutes: number): number {
  const slot = minutesOfDay(time);
  if (slot < 0) return Number.MAX_SAFE_INTEGER;
  const now = ((Math.round(nowMinutes) % 1440) + 1440) % 1440;
  const ahead = (slot - now + 1440) % 1440;
  const behind = (now - slot + 1440) % 1440;
  return ahead <= QUICK_LOG_GRACE_MINUTES ? ahead : behind;
}

/** A day's doses in the order the quick-log sheet lists them: what you have
 *  not taken yet first, likeliest first, and what you already logged at the
 *  bottom.
 *
 *  The sheet is opened with a glass in one hand to answer one question — "the
 *  one I am holding, which row is it?" — so the answer has to be near the top
 *  without reading. Already-logged doses stay on the list rather than
 *  disappearing, both because seeing them is half of why the sheet is opened
 *  and because an accidental tap has to be undoable; they just stop competing
 *  for the top of it.
 *
 *  Pure, like everything else here: the moment is a parameter, and the caller
 *  reads the clock (see `QuickLogModal.tsx`). */
export function quickLogOrder(doses: Dose[], nowMinutes: number): Dose[] {
  return [...doses].sort((a, b) => {
    const aTaken = a.takenAt !== null ? 1 : 0;
    const bTaken = b.takenAt !== null ? 1 : 0;
    if (aTaken !== bTaken) return aTaken - bTaken;
    if (aTaken === 0) {
      const distance =
        quickLogDistance(a.time, nowMinutes) -
        quickLogDistance(b.time, nowMinutes);
      if (distance !== 0) return distance;
    }
    return a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name);
  });
}
