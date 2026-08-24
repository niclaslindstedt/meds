// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What the log adds up to: adherence over a window, the streaks, the missed
// doses. Every number the History screen shows comes from here, derived from
// the document at read time — nothing is accumulated, so a corrected day
// re-derives every figure.
//
// Two rules keep the numbers honest, and every function below applies them:
//
//   - **Today never counts against you.** An unfinished today is a day in
//     progress, not a missed one, so windows end at yesterday and today only
//     joins a streak once it is complete.
//   - **A day with nothing due says nothing.** Days from before the first
//     medication existed — or where every med's schedule had ended — are not
//     "100% adherent", they are silence, and they neither pad a percentage
//     nor break a streak.

import { addDays, type DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { dayProgress, dueDoses, type Dose } from "./schedule.ts";
import type { AppData, Medication } from "./types.ts";

/** Doses taken against doses due. `share` is null when nothing was due — the
 *  window has no claim to make, and 0% would be the wrong one. */
export type Adherence = {
  taken: number;
  due: number;
  /** 0–1, or null when `due` is 0. */
  share: number | null;
};

/** The earliest day any medication's schedule covers, or null on an empty
 *  list — the natural left edge of every walk below. */
export function earliestStart(data: AppData): DayKey | null {
  let earliest: DayKey | null = null;
  for (const med of Object.values(data.medications)) {
    if (earliest === null || med.startDate < earliest) {
      earliest = med.startDate;
    }
  }
  return earliest;
}

/** Adherence over an inclusive day range. */
export function adherence(data: AppData, from: DayKey, to: DayKey): Adherence {
  let taken = 0;
  let due = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const progress = dayProgress(data, day);
    taken += progress.taken;
    due += progress.due;
  }
  return { taken, due, share: due === 0 ? null : taken / due };
}

/** Adherence over the last `days` *finished* days — the window ends at
 *  yesterday, so an unfinished today never drags the number down. */
export function adherenceLastDays(
  data: AppData,
  today: DayKey,
  days: number,
): Adherence {
  return adherence(data, addDays(today, -days), addDays(today, -1));
}

/** One medication's adherence over the last `days` finished days. Only the
 *  days that med was actually scheduled count. */
export function medAdherence(
  data: AppData,
  med: Medication,
  today: DayKey,
  days: number,
): Adherence {
  let taken = 0;
  let due = 0;
  for (let i = days; i >= 1; i--) {
    const day = addDays(today, -i);
    for (const dose of dueDoses(data, day)) {
      if (dose.med.id !== med.id) continue;
      due += 1;
      if (dose.takenAt !== null) taken += 1;
    }
  }
  return { taken, due, share: due === 0 ? null : taken / due };
}

/** How many days in a row every due dose was taken.
 *
 *  `current` walks back from today — counting today only if it is already
 *  complete — and stops at the first day that owed doses and didn't get them
 *  all. Days with nothing due are stepped over without counting: a weekend
 *  before a med existed is not two days of perfect adherence.
 *
 *  `longest` is the same rule over the whole history. */
export type Streaks = { current: number; longest: number };

export function streaks(data: AppData, today: DayKey): Streaks {
  const start = earliestStart(data);
  if (start === null) return { current: 0, longest: 0 };

  // Current: walk back from today. An unfinished today is skipped rather than
  // counted or blamed; every earlier day either extends, is silent, or ends
  // the walk.
  let current = 0;
  for (let day = today; day >= start; day = addDays(day, -1)) {
    const progress = dayProgress(data, day);
    if (progress.status === "full") {
      current += 1;
    } else if (progress.status !== "none") {
      // Today gets grace while it is still in progress; any earlier
      // incomplete day is the end of the streak.
      if (day !== today) break;
    }
  }

  // Longest: one forward pass, runs of full days with silent days neutral.
  let longest = 0;
  let run = 0;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const progress = dayProgress(data, day);
    if (progress.status === "full") {
      run += 1;
      if (run > longest) longest = run;
    } else if (progress.status !== "none" && day !== today) {
      run = 0;
    }
  }

  return { current, longest };
}

/** One point of the adherence chart: a finished day and its share, oldest
 *  first. `share` is null where nothing was due, so the chart draws a gap
 *  there instead of a zero that reads as a missed day. */
export type DayShare = { day: DayKey; share: number | null };

export function dailyShares(
  data: AppData,
  today: DayKey,
  days: number,
): DayShare[] {
  const out: DayShare[] = [];
  for (let i = days; i >= 1; i--) {
    const day = addDays(today, -i);
    const progress = dayProgress(data, day);
    out.push({
      day,
      share: progress.due === 0 ? null : progress.taken / progress.due,
    });
  }
  return out;
}

/** A dose that was due on a finished day and never logged. */
export type MissedDose = { day: DayKey; dose: Dose };

/** Every missed dose in the last `days` finished days, newest first — the
 *  History screen's gap list. Newest first because the miss worth acting on
 *  is the recent one. */
export function missedDoses(
  data: AppData,
  today: DayKey,
  days: number,
): MissedDose[] {
  const out: MissedDose[] = [];
  for (let i = 1; i <= days; i++) {
    const day = addDays(today, -i);
    for (const dose of dueDoses(data, day)) {
      if (dose.takenAt === null) out.push({ day, dose });
    }
  }
  return out;
}

/** Total doses ever logged — the History screen's "doses taken" tile. */
export function totalTaken(data: AppData): number {
  let total = 0;
  for (const log of Object.values(data.days)) {
    total += Object.keys(log.taken).length;
  }
  return total;
}
